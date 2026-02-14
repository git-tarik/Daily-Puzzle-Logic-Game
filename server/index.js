import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// We'll import engine logic later
// import { generatePuzzle, validatePuzzle } from '../src/engine/generatePuzzle.js';
// import { calculateScore } from '../src/engine/scoring.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Render is behind a reverse proxy, so trust X-Forwarded-* headers.
app.set('trust proxy', 1);

// Middlewares
app.use(helmet());
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
});
app.use(cors()); // Restrict origin in prod
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// API Routes Stubs
import { verifyScoreSubmission } from './verification.js';
import { calculateScore } from '../src/engine/scoring.js';

import authRouter from './auth.js';

app.use('/api/auth', authRouter);

app.post('/api/score', async (req, res) => {
    try {
        const schema = z.object({
            userId: z.string(),
            dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            puzzleType: z.enum(['sequence', 'matrix']),
            score: z.number().int().min(0),
            timeTaken: z.number().int().min(0),
            attempt: z.any(),
            solutionProof: z.string()
        });

        const data = schema.parse(req.body);

        // 1. Fetch User (or create stub if we allowed anon, but we are requiring ID)
        // For Phase 4, let's assume valid userId or create if not exists (lazy auth)
        let user = await prisma.user.findUnique({ where: { id: data.userId } });
        if (!user) {
            user = await prisma.user.create({ data: { id: data.userId } });
        }

        // 2. Prevent Future Dates (> 1 day ahead)
        const puzzleDate = new Date(data.dateISO);
        const now = new Date();
        const diffHours = (puzzleDate - now) / (1000 * 60 * 60);
        if (diffHours > 24) {
            return res.status(400).json({ error: 'Cannot submit for future dates' });
        }

        // 3. Verify Submission
        const verification = verifyScoreSubmission({ ...data });
        if (!verification.valid) {
            return res.status(400).json({ error: 'Verification failed: ' + verification.reason });
        }

        // 4. Re-calculate Score locally to ensure match
        // We need strictly the user's current streak from DB? 
        // Or if this is a historical submission, streak calc is hard.
        // Simplified: Recalculate based on User's DB streak? 
        // Issue: If simple client-first, user might have played offline. 
        // We will Trust the score MATH but verify the inputs (time, difficulty).
        // Let's rely on server calculation using DB streak for security.

        // Check streak continuity:
        // If lastPlayed was yesterday, streak = dbStreak + 1. Else 1.
        // This effectively enforces server-side streak tracking.
        const yesterday = new Date(data.dateISO);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().split('T')[0];

        const lastPlayedISO = user.lastPlayed ? user.lastPlayed.toISOString().split('T')[0] : null;
        let effectiveStreak = 1;
        if (lastPlayedISO === yesterdayISO) {
            effectiveStreak = user.streak + 1;
        } else if (lastPlayedISO === data.dateISO) {
            effectiveStreak = user.streak; // Same day replay?
        }

        // Recalculate
        const { finalScore } = calculateScore({
            difficulty: 1,
            timeTakenSeconds: data.timeTaken,
            hintsUsed: 0, // We assume 0 for leaderboard for now or need to pass it
            streak: effectiveStreak
        });

        // Tolerance? Or strict match? 
        // If client says 100 but we calc 90, we take 90.
        // If client says 90 but we calc 100, we take 100?
        // Let's use Server Calculated Score.

        const serverScore = finalScore;

        // 5. Check Top 100 Eligibility
        // Count scores for this date with score > serverScore
        const betterScoresCount = await prisma.dailyScore.count({
            where: {
                date: new Date(data.dateISO),
                score: { gte: serverScore }
            }
        });

        if (betterScoresCount < 100) {
            // Qualified!
            // Update User & Insert Score
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: {
                        streak: effectiveStreak,
                        lastPlayed: new Date(data.dateISO),
                        totalPoints: { increment: serverScore }
                    }
                }),
                prisma.dailyScore.create({
                    data: {
                        userId: user.id,
                        date: new Date(data.dateISO),
                        puzzleId: verification.puzzle.seed,
                        score: serverScore,
                        timeTaken: data.timeTaken
                    }
                })
            ]);
            return res.json({ status: 'ranked', score: serverScore, rank: betterScoresCount + 1 });
        } else {
            return res.json({ status: 'ignored', reason: 'Not in top 100' });
        }

    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message || 'Invalid request' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const dateISO = req.query.date;
        if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const scores = await prisma.dailyScore.findMany({
            where: {
                date: new Date(dateISO)
            },
            take: 100,
            orderBy: {
                score: 'desc'
            },
            include: {
                user: {
                    select: { id: true, streak: true } // Don't leak emails
                }
            }
        });

        // Format for client
        const leaderboard = scores.map(s => ({
            rank: 0, // populate in map
            name: `User ${s.user.id.slice(0, 4)}`, // Anon name for now
            score: s.score,
            streak: s.user.streak,
            timeTaken: s.timeTaken
        }));

        // Add ranks
        leaderboard.forEach((item, index) => item.rank = index + 1);

        res.json(leaderboard);
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/callback', (req, res) => {
    res.json({ message: 'Auth stub received' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
