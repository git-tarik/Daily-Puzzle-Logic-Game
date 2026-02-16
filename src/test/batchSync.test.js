import { flushScoreQueue, initializeBatchSync, queueScoreForSync } from '../lib/batchSync';

jest.mock('../lib/db', () => ({
    enqueueSyncItem: jest.fn(),
    getReadySyncItems: jest.fn(),
    getSetting: jest.fn(),
    removeSyncItems: jest.fn(),
    setSetting: jest.fn(),
    updateSyncItem: jest.fn(),
}));

jest.mock('../lib/apiClient', () => ({
    postJson: jest.fn(),
}));

const db = jest.requireMock('../lib/db');
const { postJson } = jest.requireMock('../lib/apiClient');

describe('sync batching logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
        db.getSetting.mockResolvedValue(0);
    });

    test('queues puzzle completion and flushes on each 5th solve', async () => {
        db.getReadySyncItems.mockResolvedValue([{ id: 1, attempts: 0, payload: { a: 1 } }]);
        postJson.mockResolvedValue({ ok: true });

        await queueScoreForSync({ userId: 'u1' });
        expect(db.enqueueSyncItem).toHaveBeenCalledTimes(1);

        db.getSetting.mockResolvedValueOnce(4).mockResolvedValueOnce(0);
        await queueScoreForSync({ userId: 'u1' });
        expect(postJson).toHaveBeenCalledWith('/api/score/batch', { submissions: [{ a: 1 }] });
    });

    test('does not flush while offline unless forced', async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
        const result = await flushScoreQueue();
        expect(result.flushed).toBe(0);
        expect(postJson).not.toHaveBeenCalled();
    });

    test('retries failed sync with backoff', async () => {
        db.getReadySyncItems.mockResolvedValue([{ id: 99, attempts: 1, payload: { x: 1 } }]);
        postJson.mockRejectedValue(new Error('network'));

        const result = await flushScoreQueue({ force: true });
        expect(result.pending).toBe(true);
        expect(db.updateSyncItem).toHaveBeenCalledWith(
            99,
            expect.objectContaining({ attempts: 2, nextRetryAt: expect.any(Number) })
        );
    });

    test('stops flushing when daily write cap is reached', async () => {
        db.getSetting.mockImplementation(async (key) => (String(key).includes('sync-write-count') ? 10 : 0));
        const result = await flushScoreQueue({ force: true });
        expect(result.throttled).toBe(true);
        expect(postJson).not.toHaveBeenCalled();
    });

    test('registers and removes online listener', () => {
        const addSpy = jest.spyOn(window, 'addEventListener');
        const removeSpy = jest.spyOn(window, 'removeEventListener');
        const cleanup = initializeBatchSync();
        expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
        cleanup();
        expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
