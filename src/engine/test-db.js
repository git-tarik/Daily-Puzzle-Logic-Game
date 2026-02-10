import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Testing Database Connection ---');

    try {
        // 1. Create a dummy user
        const userId = 'test-integration-' + Date.now();
        const user = await prisma.user.create({
            data: {
                id: userId,
                email: `test-${Date.now()}@example.com`,
                totalPoints: 100
            }
        });
        console.log('PASS: User created', user.id);

        // 2. Create a score
        const score = await prisma.dailyScore.create({
            data: {
                userId: user.id,
                date: new Date(),
                puzzleId: 'test-puzzle',
                score: 500,
                timeTaken: 120
            }
        });
        console.log('PASS: Score created', score.id);

        // 3. Query Leaderboard (top 1)
        const top = await prisma.dailyScore.findMany({
            take: 1,
            orderBy: { score: 'desc' },
            include: { user: true }
        });
        console.log('PASS: Leaderboard query', top.length > 0);

        // Cleanup
        await prisma.dailyScore.delete({ where: { id: score.id } });
        await prisma.user.delete({ where: { id: user.id } });
        console.log('PASS: Cleanup successful');

    } catch (e) {
        console.error('FAIL: Database operation failed', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
