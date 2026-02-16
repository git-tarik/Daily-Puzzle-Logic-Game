import {
    enqueueSyncItem,
    getReadySyncItems,
    getSetting,
    removeSyncItems,
    setSetting,
    updateSyncItem,
} from './db';
import { postJson } from './apiClient';
import dayjs from 'dayjs';

const COMPLETION_COUNTER_KEY = 'completed-puzzles-counter';
const WRITE_COUNT_PREFIX = 'sync-write-count';
const MAX_BATCH_SIZE = 10;
const MAX_DAILY_SYNC_WRITES = 10;
const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

const getCompletionCount = async () => {
    const value = await getSetting(COMPLETION_COUNTER_KEY);
    return Number.isFinite(value) ? value : 0;
};

const setCompletionCount = async (value) => {
    await setSetting(COMPLETION_COUNTER_KEY, value);
};

const getWriteCountKey = () => `${WRITE_COUNT_PREFIX}:${dayjs().format('YYYY-MM-DD')}`;
const getDailyWriteCount = async () => {
    const value = await getSetting(getWriteCountKey());
    return Number.isFinite(value) ? value : 0;
};
const incrementDailyWriteCount = async () => {
    const current = await getDailyWriteCount();
    await setSetting(getWriteCountKey(), current + 1);
};

const scheduleRetry = (attempts) => {
    const backoff = Math.min(60 * 60 * 1000, 2 ** attempts * 1000);
    return Date.now() + backoff;
};

export const flushScoreQueue = async ({ force = false } = {}) => {
    if (!force && !isOnline()) return { flushed: 0, pending: true };
    const writesToday = await getDailyWriteCount();
    if (writesToday >= MAX_DAILY_SYNC_WRITES) {
        return { flushed: 0, pending: true, throttled: true };
    }

    const readyItems = await getReadySyncItems();
    if (!readyItems.length) return { flushed: 0, pending: false };

    const chunk = readyItems.slice(0, MAX_BATCH_SIZE);
    const payload = chunk.map((item) => item.payload);

    try {
        await postJson('/api/score/batch', { submissions: payload });
        await incrementDailyWriteCount();
        await removeSyncItems(chunk.map((item) => item.id));
        return { flushed: chunk.length, pending: readyItems.length > chunk.length };
    } catch {
        await Promise.all(
            chunk.map((item) =>
                updateSyncItem(item.id, {
                    attempts: item.attempts + 1,
                    nextRetryAt: scheduleRetry(item.attempts + 1),
                })
            )
        );
        return { flushed: 0, pending: true };
    }
};

export const queueScoreForSync = async (scorePayload) => {
    await enqueueSyncItem(scorePayload);
    const current = await getCompletionCount();
    const nextCount = current + 1;
    await setCompletionCount(nextCount);

    if (nextCount % 5 === 0) {
        return flushScoreQueue({ force: true });
    }

    return { flushed: 0, pending: true };
};

export const initializeBatchSync = () => {
    if (typeof window === 'undefined') return () => {};
    const onOnline = () => {
        flushScoreQueue({ force: true });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
};
