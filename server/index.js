import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { verifyScoreSubmission } from './verification.js';
import { calculateScore } from '../src/engine/scoring.js';
import authRouter from './auth.js';
import crypto from 'crypto';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet());
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});
app.use(
    cors({
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
        credentials: true,
    })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

const scoreLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

const validateBody = (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid request payload',
            details: parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }
    req.validatedBody = parsed.data;
    return next();
};

const validateQuery = (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid query parameters',
            details: parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }
    req.validatedQuery = parsed.data;
    return next();
};

const scoreSubmissionSchema = z
    .object({
        userId: z.string().trim().min(1).max(128),
        dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        puzzleType: z.enum(['sequence', 'matrix', 'pattern', 'deduction', 'binary']),
        timeTaken: z.number().int().min(0).max(24 * 60 * 60),
        attempt: z.unknown(),
        solutionProof: z.string().trim().min(1).max(256),
        difficulty: z.number().int().min(1).max(5).default(1),
        hintsUsed: z.number().int().min(0).max(20).default(0),
        timedMode: z.boolean().default(false),
    })
    .strict();

const leaderboardQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const dailySyncEntrySchema = z
    .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        score: z.number().int().min(0).max(10000),
        timeTaken: z.number().int().min(0).max(24 * 60 * 60),
        difficulty: z.number().int().min(1).max(5).default(1),
    })
    .strict();

const dailySyncSchema = z.object({
    entries: z.array(dailySyncEntrySchema).min(1).max(365),
});

const getRequestUserId = (req) => {
    const headerValue = req.headers['x-user-id'];
    if (typeof headerValue !== 'string') return null;
    const trimmed = headerValue.trim();
    if (!trimmed || trimmed === 'guest') return null;
    return trimmed.slice(0, 128);
};

const parseDateAtLocalMidnight = (dateISO) => {
    const [year, month, day] = dateISO.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const isDateWithinSyncRange = (dateISO) => {
    const date = parseDateAtLocalMidnight(dateISO);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setFullYear(minDate.getFullYear() - 5);

    return date.getTime() <= today.getTime() && date.getTime() >= minDate.getTime();
};

const computeEntryIntegrityDigest = (userId, entry) => {
    const secret = process.env.ACTIVITY_SYNC_HMAC_SECRET || process.env.SCORE_HMAC_SECRET || 'dev-only-secret';
    const payload = `${userId}|${entry.date}|${entry.score}|${entry.timeTaken}|${entry.difficulty}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

const processScoreSubmission = async (submission) => {
    let user = await prisma.user.findUnique({ where: { id: submission.userId } });
    if (!user) {
        user = await prisma.user.create({ data: { id: submission.userId } });
    }

    const puzzleDate = new Date(submission.dateISO);
    const now = new Date();
    const diffHours = (puzzleDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
        return { ok: false, status: 400, body: { error: 'Cannot submit for future dates' } };
    }

    const verification = verifyScoreSubmission(submission);
    if (!verification.valid) {
        return { ok: false, status: 400, body: { error: `Verification failed: ${verification.reason}` } };
    }

    const yesterday = new Date(submission.dateISO);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];

    const lastPlayedISO = user.lastPlayed ? user.lastPlayed.toISOString().split('T')[0] : null;
    let effectiveStreak = 1;
    if (lastPlayedISO === yesterdayISO) {
        effectiveStreak = user.streak + 1;
    } else if (lastPlayedISO === submission.dateISO) {
        effectiveStreak = user.streak;
    }

    const { finalScore } = calculateScore({
        difficulty: submission.difficulty,
        timeTakenSeconds: submission.timeTaken,
        hintsUsed: submission.hintsUsed,
        streak: effectiveStreak,
        timedMode: submission.timedMode,
    });
    const serverScore = finalScore;

    const existingStats = await prisma.userStats.findUnique({ where: { userId: user.id } });
    const solvedCount = (existingStats?.puzzlesSolved || 0) + 1;
    const avgSolveTime = Math.round(
        (((existingStats?.avgSolveTime || 0) * (solvedCount - 1)) + submission.timeTaken) / solvedCount
    );

    const betterScoresCount = await prisma.dailyScore.count({
        where: {
            date: new Date(submission.dateISO),
            score: { gt: serverScore },
        },
    });

    if (betterScoresCount >= 100) {
        return { ok: true, status: 200, body: { status: 'ignored', reason: 'Not in top 100' } };
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                streak: effectiveStreak,
                lastPlayed: new Date(submission.dateISO),
                totalPoints: { increment: serverScore },
            },
        }),
        prisma.dailyScore.create({
            data: {
                userId: user.id,
                date: new Date(submission.dateISO),
                puzzleId: verification.puzzle.seed,
                score: serverScore,
                timeTaken: submission.timeTaken,
            },
        }),
        prisma.userStats.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                puzzlesSolved: 1,
                avgSolveTime: submission.timeTaken,
            },
            update: {
                puzzlesSolved: solvedCount,
                avgSolveTime,
            },
        }),
    ]);

    return { ok: true, status: 200, body: { status: 'ranked', score: serverScore, rank: betterScoresCount + 1 } };
};

app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRouter);

app.post('/api/score', scoreLimiter, validateBody(scoreSubmissionSchema), async (req, res) => {
    try {
        const result = await processScoreSubmission(req.validatedBody);
        return res.status(result.status).json(result.body);
    } catch (error) {
        if (!isProd) {
            console.error(error);
        }
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post(
    '/api/score/batch',
    scoreLimiter,
    validateBody(
        z.object({
            submissions: z.array(scoreSubmissionSchema).min(1).max(10),
        })
    ),
    async (req, res) => {
        try {
            const results = [];
            for (const submission of req.validatedBody.submissions) {
                const result = await processScoreSubmission(submission);
                results.push({
                    userId: submission.userId,
                    dateISO: submission.dateISO,
                    ...result.body,
                });
            }
            return res.json({ results });
        } catch (error) {
            if (!isProd) {
                console.error(error);
            }
            return res.status(500).json({ error: 'Batch submission failed' });
        }
    }
);

app.post('/api/sync/daily-scores', scoreLimiter, validateBody(dailySyncSchema), async (req, res) => {
    try {
        const userId = getRequestUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Missing authenticated user context' });
        }

        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            user = await prisma.user.create({ data: { id: userId } });
        }

        const accepted = [];
        for (const entry of req.validatedBody.entries) {
            if (!isDateWithinSyncRange(entry.date)) {
                continue;
            }

            const integrityDigest = computeEntryIntegrityDigest(userId, entry);
            await prisma.dailyActivity.upsert({
                where: {
                    userId_date: {
                        userId,
                        date: parseDateAtLocalMidnight(entry.date),
                    },
                },
                create: {
                    userId,
                    date: parseDateAtLocalMidnight(entry.date),
                    score: entry.score,
                    timeTaken: entry.timeTaken,
                    difficulty: entry.difficulty,
                },
                update: {
                    score: entry.score,
                    timeTaken: entry.timeTaken,
                    difficulty: entry.difficulty,
                },
            });

            accepted.push({
                date: entry.date,
                digest: integrityDigest,
            });
        }

        return res.status(200).json({
            success: true,
            acceptedCount: accepted.length,
            accepted,
        });
    } catch (error) {
        if (!isProd) {
            console.error(error);
        }
        return res.status(500).json({ error: 'Daily activity sync failed' });
    }
});

app.get('/api/leaderboard', validateQuery(leaderboardQuerySchema), async (req, res) => {
    try {
        const { date } = req.validatedQuery;
        const scores = await prisma.dailyScore.findMany({
            where: {
                date: new Date(date),
            },
            take: 100,
            orderBy: {
                score: 'desc',
            },
            include: {
                user: {
                    select: { id: true, streak: true },
                },
            },
        });

        const leaderboard = scores.map((score, index) => ({
            rank: index + 1,
            name: `User ${score.user.id.slice(0, 4)}`,
            score: score.score,
            streak: score.user.streak,
            timeTaken: score.timeTaken,
        }));

        return res.json(leaderboard);
    } catch (error) {
        if (!isProd) {
            console.error(error);
        }
        return res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    if (!isProd) {
        console.log(`Server running on http://localhost:${PORT}`);
    }
});
