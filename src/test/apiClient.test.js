import { cachedGet, getJson, postJson } from '../lib/apiClient';

jest.mock('../lib/db', () => ({
    getApiCache: jest.fn(),
    saveApiCache: jest.fn(),
}));

const { getApiCache, saveApiCache } = jest.requireMock('../lib/db');

describe('api caching layer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    });

    test('returns cached GET data immediately and revalidates in background', async () => {
        const cached = { data: [{ rank: 1 }], expiresAt: Date.now() - 1000, etag: 'x' };
        getApiCache.mockResolvedValue(cached);
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => [{ rank: 2 }],
        });

        const data = await cachedGet('/api/leaderboard?date=2026-02-16');
        expect(data).toEqual([{ rank: 1 }]);

        await Promise.resolve();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('returns null when offline and cache miss occurs', async () => {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
        getApiCache.mockResolvedValue(null);

        const data = await cachedGet('/api/leaderboard?date=2026-02-16');
        expect(data).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('postJson sends JSON and parses response', async () => {
        fetch.mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ ok: true }),
        });
        const data = await postJson('/api/auth/google', { credential: 'abc' });
        expect(data.ok).toBe(true);
    });

    test('getJson throws for non-ok response', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 500,
            headers: { get: () => 'application/json' },
            json: async () => ({ error: 'boom' }),
        });
        await expect(getJson('/api/x')).rejects.toThrow('boom');
    });

    test('saves cache on fresh response', async () => {
        getApiCache.mockResolvedValue(null);
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: (key) => (key === 'content-type' ? 'application/json' : null) },
            json: async () => ({ hello: 'world' }),
        });
        await cachedGet('/api/leaderboard?date=2026-02-16');
        expect(saveApiCache).toHaveBeenCalled();
    });

    test('handles 304 response using cached body', async () => {
        getApiCache.mockResolvedValue({
            data: { cached: true },
            expiresAt: Date.now() - 1,
            etag: 'abc',
            lastModified: 'today',
        });
        fetch.mockResolvedValue({
            ok: false,
            status: 304,
            headers: { get: () => null },
        });
        const data = await cachedGet('/api/leaderboard?date=2026-02-16');
        expect(data).toEqual({ cached: true });
        expect(saveApiCache).toHaveBeenCalled();
    });

    test('parses text responses', async () => {
        getApiCache.mockResolvedValue(null);
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => 'text/plain' },
            text: async () => 'ok',
        });
        const data = await cachedGet('/health');
        expect(data).toBe('ok');
    });

    test('deduplicates in-flight requests', async () => {
        getApiCache.mockResolvedValue(null);
        let resolver;
        const pending = new Promise((resolve) => {
            resolver = resolve;
        });
        fetch.mockReturnValue(pending);
        const requestA = cachedGet('/api/leaderboard?date=2026-02-16');
        const requestB = cachedGet('/api/leaderboard?date=2026-02-16');

        resolver({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => ({ ok: true }),
        });
        await Promise.all([requestA, requestB]);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
