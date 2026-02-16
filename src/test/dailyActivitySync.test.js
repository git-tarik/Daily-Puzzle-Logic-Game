import { syncDailyScores, __testing } from '../lib/dailyActivitySync';
import {
    clearDailyActivityData,
    getUnsyncedDailyActivity,
    upsertDailyActivity,
} from '../lib/dailyActivityDb';

jest.mock('../lib/apiClient', () => ({
    postJson: jest.fn(),
}));

const { postJson } = jest.requireMock('../lib/apiClient');
describe('daily sync batching and offline fallback behavior', () => {
    beforeEach(async () => {
        await clearDailyActivityData();
        jest.clearAllMocks();
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    });

    test('syncs multiple unsynced entries in one batch', async () => {
        await upsertDailyActivity({ date: '2026-02-14', solved: true, score: 120, timeTaken: 50, difficulty: 2 });
        await upsertDailyActivity({ date: '2026-02-15', solved: true, score: 160, timeTaken: 40, difficulty: 3 });
        postJson.mockResolvedValue({ success: true });

        const result = await syncDailyScores({ userId: 'user-123' });
        expect(result.synced).toBe(2);
        expect(postJson).toHaveBeenCalledWith(
            '/api/sync/daily-scores',
            {
                entries: [
                    { date: '2026-02-14', score: 120, timeTaken: 50, difficulty: 2 },
                    { date: '2026-02-15', score: 160, timeTaken: 40, difficulty: 3 },
                ],
            },
            { headers: { 'x-user-id': 'user-123' } }
        );

        const unsynced = await getUnsyncedDailyActivity();
        expect(unsynced).toHaveLength(0);
    });

    test('skips sync when offline', async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
        await upsertDailyActivity({ date: '2026-02-14', solved: true, score: 120, timeTaken: 50, difficulty: 2 });

        const result = await syncDailyScores({ userId: 'user-123' });
        expect(result.reason).toBe('offline');
        expect(postJson).not.toHaveBeenCalled();
    });

    test('filters out partial-day unsolved entries', async () => {
        await upsertDailyActivity({ date: '2026-02-14', solved: false, score: 0, timeTaken: 25, difficulty: 1 });

        const result = await syncDailyScores({ userId: 'user-123' });
        expect(result.reason).toBe('no-valid-entries');
        expect(postJson).not.toHaveBeenCalled();
    });

    test('filters future manipulated dates before sync', async () => {
        await upsertDailyActivity({ date: '2099-01-01', solved: true, score: 999, timeTaken: 5, difficulty: 5 });
        const result = await syncDailyScores({ userId: 'user-123' });

        expect(result.reason).toBe('no-valid-entries');
        expect(postJson).not.toHaveBeenCalled();
    });

    test('date range guard handles timezone/device changes safely', () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayISO = `${yyyy}-${mm}-${dd}`;

        expect(__testing.isDateWithinAllowedRange(todayISO)).toBe(true);
        expect(__testing.isDateWithinAllowedRange('1999-12-31')).toBe(false);
    });
});
