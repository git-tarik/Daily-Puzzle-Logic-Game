import { PrismaClient } from '@prisma/client';

const prismaGlobal = globalThis;
const prisma =
    prismaGlobal.__logicLooperPrisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });

if (process.env.NODE_ENV !== 'production') {
    prismaGlobal.__logicLooperPrisma = prisma;
}

const DATE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getUtcDayRange = (dateISO) => {
    const start = new Date(`${dateISO}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
};

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { date } = req.query || {};
    if (typeof date !== 'string' || !DATE_ISO_PATTERN.test(date)) {
        return res.status(400).json({ error: 'Invalid query parameters' });
    }

    try {
        const { start, end } = getUtcDayRange(date);
        const scores = await prisma.dailyScore.findMany({
            where: {
                date: {
                    gte: start,
                    lt: end,
                },
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

        return res.status(200).json(leaderboard);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
}
