import Dexie from 'dexie';
import { compressData, decompressData } from './compression';

const USER_SINGLETON_KEY = 'local-user';

const decodeCompressedRecord = (record) => {
    if (!record) return null;
    if (!record.payload) return record;
    const decoded = decompressData(record.payload);
    return decoded ?? null;
};

export const db = new Dexie('logic-looper-db');

db.version(1).stores({
    puzzles: 'dateISO, puzzleSeed, puzzleType, progress, solved, attempts, hintsUsed, gameState',
    user: 'idLocal, guestName, streakCount, lastPlayedISO, heatmap',
    settings: 'key, value',
});

db.version(2).stores({
    puzzles: 'dateISO, puzzleSeed, puzzleType, progress, solved, attempts, hintsUsed, gameState, score, timeTaken',
    user: 'idLocal, guestName, streakCount, lastPlayedISO, heatmap, totalScore, unlockedAchievements'
});

db.version(3).stores({
    puzzles: 'dateISO, puzzleSeed, puzzleType, progress, solved, attempts, hintsUsed, gameState, score, timeTaken, difficulty',
    user: 'idLocal, guestName, streakCount, lastPlayedISO, heatmap, totalScore, unlockedAchievements, puzzlesSolved, avgSolveTime',
    settings: 'key, value',
});

db.version(4).stores({
    puzzles: '&dateISO, updatedAt',
    user: '&idLocal, updatedAt',
    settings: '&key, updatedAt',
    apiCache: '&key, updatedAt, expiresAt',
    syncQueue: '++id, createdAt, nextRetryAt, status'
});

export const getPuzzle = async (dateISO) => {
    const record = await db.puzzles.get(dateISO);
    return decodeCompressedRecord(record);
};

export const savePuzzle = async (puzzleObject) => {
    const payload = compressData(puzzleObject);
    if (!payload) return null;
    return db.puzzles.put({
        dateISO: puzzleObject.dateISO,
        payload,
        updatedAt: Date.now(),
    });
};

export const getPuzzlesInRange = async (fromISO, toISO) => {
    const records = await db.puzzles.where('dateISO').between(fromISO, toISO, true, true).toArray();
    return records.map((record) => decodeCompressedRecord(record)).filter(Boolean);
};

export const getUser = async () => {
    const users = await db.user.toArray();
    const first = users[0] || null;
    return decodeCompressedRecord(first);
};

export const saveUser = async (userObject) => {
    const existingUser = await getUser();
    const normalized = {
        ...userObject,
        idLocal: existingUser?.idLocal || userObject.idLocal || USER_SINGLETON_KEY,
    };

    const payload = compressData(normalized);
    if (!payload) return null;
    return db.user.put({
        idLocal: normalized.idLocal,
        payload,
        updatedAt: Date.now(),
    });
};

export const getSetting = async (key) => {
    const record = await db.settings.get(key);
    if (!record) return null;
    if (record.payload) return decodeCompressedRecord(record);
    return record.value ?? null;
};

export const setSetting = async (key, value) => {
    const payload = compressData(value);
    if (!payload) return null;
    return db.settings.put({
        key,
        payload,
        updatedAt: Date.now(),
    });
};

export const getApiCache = async (key) => {
    const record = await db.apiCache.get(key);
    if (!record) return null;
    const data = decodeCompressedRecord(record);
    if (data === null) return null;
    return {
        ...record,
        data,
    };
};

export const saveApiCache = async ({ key, data, etag = null, lastModified = null, ttlMs = 300000 }) => {
    const payload = compressData(data);
    if (!payload) return null;
    const now = Date.now();
    return db.apiCache.put({
        key,
        payload,
        etag,
        lastModified,
        updatedAt: now,
        expiresAt: now + ttlMs,
    });
};

export const enqueueSyncItem = async (payload) => {
    const now = Date.now();
    return db.syncQueue.add({
        payload: compressData(payload),
        createdAt: now,
        nextRetryAt: now,
        attempts: 0,
        status: 'pending',
    });
};

export const getReadySyncItems = async () => {
    const now = Date.now();
    const records = await db.syncQueue.where('nextRetryAt').belowOrEqual(now).toArray();
    return records
        .filter((record) => record.status === 'pending')
        .map((record) => ({
            ...record,
            payload: decompressData(record.payload),
        }))
        .filter((record) => record.payload !== null);
};

export const updateSyncItem = async (id, partial) => {
    return db.syncQueue.update(id, partial);
};

export const removeSyncItems = async (ids) => {
    if (!ids?.length) return;
    await db.syncQueue.bulkDelete(ids);
};

export const getSyncQueueSize = async () => db.syncQueue.count();
