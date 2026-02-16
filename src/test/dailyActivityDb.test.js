import {
    clearDailyActivityData,
    getAllDailyActivity,
    getUnsyncedDailyActivity,
    getYearDailyActivity,
    markDailyActivitySynced,
    mergeServerEntryIfSafe,
    upsertDailyActivity,
    upsertMilestoneAchievement,
    getMilestoneAchievements,
} from '../lib/dailyActivityDb';

describe('dailyActivity IndexedDB retrieval', () => {
    beforeEach(async () => {
        await clearDailyActivityData();
    });

    test('stores and retrieves activity by year', async () => {
        await upsertDailyActivity({
            date: '2026-02-16',
            solved: true,
            score: 130,
            timeTaken: 120,
            difficulty: 3,
        });

        const yearEntries = await getYearDailyActivity(2026);
        expect(yearEntries).toHaveLength(1);
        expect(yearEntries[0]).toMatchObject({
            date: '2026-02-16',
            solved: true,
            score: 130,
            synced: false,
        });
    });

    test('does not overwrite unsynced local data with server merge', async () => {
        await upsertDailyActivity({
            date: '2026-02-14',
            solved: true,
            score: 200,
            timeTaken: 45,
            difficulty: 4,
        });

        const merged = await mergeServerEntryIfSafe({
            date: '2026-02-14',
            solved: true,
            score: 10,
            timeTaken: 900,
            difficulty: 1,
        });

        const rows = await getAllDailyActivity();
        expect(merged).toBe(false);
        expect(rows[0].score).toBe(200);
    });

    test('marks multiple unsynced entries as synced', async () => {
        await upsertDailyActivity({ date: '2026-02-10', solved: true, score: 110, timeTaken: 100, difficulty: 2 });
        await upsertDailyActivity({ date: '2026-02-11', solved: true, score: 120, timeTaken: 90, difficulty: 2 });

        let unsynced = await getUnsyncedDailyActivity();
        expect(unsynced).toHaveLength(2);

        await markDailyActivitySynced(['2026-02-10', '2026-02-11']);
        unsynced = await getUnsyncedDailyActivity();
        expect(unsynced).toHaveLength(0);
    });

    test('stores milestone badges in IndexedDB', async () => {
        await upsertMilestoneAchievement({
            id: 'STREAK_7_DAYS',
            type: 'streak',
            dateEarned: '2026-02-16',
        });
        await upsertMilestoneAchievement({
            id: 'STREAK_7_DAYS',
            type: 'streak',
            dateEarned: '2026-02-16',
        });

        const achievements = await getMilestoneAchievements();
        expect(achievements).toHaveLength(1);
        expect(achievements[0].id).toBe('STREAK_7_DAYS');
    });
});
