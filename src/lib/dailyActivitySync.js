import dayjs from 'dayjs';
import { postJson } from './apiClient';
import { getUnsyncedDailyActivity, markDailyActivitySynced } from './dailyActivityDb';

const MAX_BATCH_SIZE = 365;

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

const isDateWithinAllowedRange = (dateISO, maxPastYears = 5) => {
    if (typeof dateISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;

    const date = dayjs(dateISO);
    if (!date.isValid()) return false;

    const today = dayjs().startOf('day');
    const minAllowed = today.subtract(maxPastYears, 'year');
    return !date.isAfter(today) && !date.isBefore(minAllowed);
};

const sanitizeEntriesForSync = (entries) =>
    entries
        .filter((entry) => entry?.solved)
        .filter((entry) => isDateWithinAllowedRange(entry.date))
        .filter((entry) => Number.isFinite(entry.score) && entry.score >= 0 && entry.score <= 10000)
        .filter((entry) => Number.isFinite(entry.timeTaken) && entry.timeTaken >= 0 && entry.timeTaken <= 86400)
        .map((entry) => ({
            date: entry.date,
            score: Math.round(entry.score),
            timeTaken: Math.round(entry.timeTaken),
            difficulty: Number.isFinite(entry.difficulty) ? Math.min(5, Math.max(1, Math.round(entry.difficulty))) : 1,
        }));

export const syncDailyScores = async ({ userId, force = false } = {}) => {
    if (!userId) return { synced: 0, skipped: true, reason: 'missing-user' };
    if (!force && !isOnline()) return { synced: 0, skipped: true, reason: 'offline' };

    const unsynced = await getUnsyncedDailyActivity();
    if (!unsynced.length) return { synced: 0, skipped: true, reason: 'no-unsynced' };

    const payloadEntries = sanitizeEntriesForSync(unsynced).slice(0, MAX_BATCH_SIZE);
    if (!payloadEntries.length) return { synced: 0, skipped: true, reason: 'no-valid-entries' };

    await postJson(
        '/api/sync/daily-scores',
        { entries: payloadEntries },
        {
            headers: {
                'x-user-id': userId,
            },
        }
    );
    await markDailyActivitySynced(payloadEntries.map((entry) => entry.date));
    return { synced: payloadEntries.length, skipped: false };
};

export const initializeDailyScoreSync = ({ getUserId }) => {
    if (typeof window === 'undefined') return () => {};

    const runSync = async () => {
        const userId = typeof getUserId === 'function' ? getUserId() : null;
        if (!userId || userId === 'guest') return;
        await syncDailyScores({ userId, force: true }).catch(() => null);
    };

    const onOnline = () => {
        runSync();
    };

    window.addEventListener('online', onOnline);
    runSync();

    return () => {
        window.removeEventListener('online', onOnline);
    };
};

export const __testing = {
    isDateWithinAllowedRange,
    sanitizeEntriesForSync,
};
