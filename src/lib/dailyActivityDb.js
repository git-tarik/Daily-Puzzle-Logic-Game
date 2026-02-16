import { openDB } from 'idb';
import dayjs from 'dayjs';

const DB_NAME = 'dailyActivityDB';
const DB_VERSION = 1;
const ACTIVITY_STORE = 'dailyActivity';
const ACHIEVEMENTS_STORE = 'achievements';
const CHANGE_EVENT = 'daily-activity-updated';

const yearCache = new Map();
const achievementsCache = {
    data: null,
};

const emitChange = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }
};

const clearCaches = () => {
    yearCache.clear();
    achievementsCache.data = null;
};

const parseDateISOToLocalDate = (dateISO) => {
    if (typeof dateISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        return null;
    }
    const [year, month, day] = dateISO.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }
    return date;
};

const toDateISO = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const sanitizeActivityRecord = (record) => {
    const parsed = parseDateISOToLocalDate(record?.date);
    if (!parsed) return null;

    return {
        date: record.date,
        solved: Boolean(record.solved),
        score: Number.isFinite(record.score) ? Math.max(0, Math.round(record.score)) : 0,
        timeTaken: Number.isFinite(record.timeTaken) ? Math.max(0, Math.round(record.timeTaken)) : 0,
        difficulty: Number.isFinite(record.difficulty)
            ? Math.min(5, Math.max(1, Math.round(record.difficulty)))
            : 1,
        synced: Boolean(record.synced),
        updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : Date.now(),
    };
};

const getDb = () =>
    openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {
                const activityStore = db.createObjectStore(ACTIVITY_STORE, { keyPath: 'date' });
                activityStore.createIndex('synced', 'synced');
                activityStore.createIndex('updatedAt', 'updatedAt');
            }

            if (!db.objectStoreNames.contains(ACHIEVEMENTS_STORE)) {
                db.createObjectStore(ACHIEVEMENTS_STORE, { keyPath: 'id' });
            }
        },
    });

export const DAILY_ACTIVITY_CHANGE_EVENT = CHANGE_EVENT;

export const mergeServerEntryIfSafe = async (entry) => {
    const db = await getDb();
    const tx = db.transaction(ACTIVITY_STORE, 'readwrite');
    const store = tx.objectStore(ACTIVITY_STORE);
    const existing = await store.get(entry.date);
    const safeExisting = sanitizeActivityRecord(existing);

    if (safeExisting?.synced === false) {
        await tx.done;
        return false;
    }

    const merged = sanitizeActivityRecord({
        date: entry.date,
        solved: entry.solved ?? safeExisting?.solved ?? false,
        score: entry.score ?? safeExisting?.score ?? 0,
        timeTaken: entry.timeTaken ?? safeExisting?.timeTaken ?? 0,
        difficulty: entry.difficulty ?? safeExisting?.difficulty ?? 1,
        synced: true,
        updatedAt: Date.now(),
    });

    if (!merged) {
        await tx.done;
        return false;
    }

    await store.put(merged);
    await tx.done;
    clearCaches();
    emitChange();
    return true;
};

export const upsertDailyActivity = async (entry) => {
    const normalizedDate = parseDateISOToLocalDate(entry?.date);
    if (!normalizedDate) return null;
    const date = toDateISO(normalizedDate);

    const db = await getDb();
    const tx = db.transaction(ACTIVITY_STORE, 'readwrite');
    const store = tx.objectStore(ACTIVITY_STORE);
    const existing = sanitizeActivityRecord(await store.get(date));

    const merged = sanitizeActivityRecord({
        date,
        solved: entry.solved ?? existing?.solved ?? false,
        score: entry.score ?? existing?.score ?? 0,
        timeTaken: entry.timeTaken ?? existing?.timeTaken ?? 0,
        difficulty: entry.difficulty ?? existing?.difficulty ?? 1,
        synced: false,
        updatedAt: Date.now(),
    });

    if (!merged) {
        await tx.done;
        return null;
    }

    await store.put(merged);
    await tx.done;
    clearCaches();
    emitChange();
    return merged;
};

export const getDailyActivityByDate = async (dateISO) => {
    const parsed = parseDateISOToLocalDate(dateISO);
    if (!parsed) return null;
    const db = await getDb();
    const record = await db.get(ACTIVITY_STORE, toDateISO(parsed));
    return sanitizeActivityRecord(record);
};

export const getYearDailyActivity = async (year = dayjs().year()) => {
    const numericYear = Number(year);
    if (!Number.isInteger(numericYear)) return [];
    const cacheKey = String(numericYear);
    if (yearCache.has(cacheKey)) return yearCache.get(cacheKey);

    const startISO = `${numericYear}-01-01`;
    const endISO = `${numericYear}-12-31`;

    const db = await getDb();
    const tx = db.transaction(ACTIVITY_STORE, 'readonly');
    const records = await tx
        .objectStore(ACTIVITY_STORE)
        .getAll(IDBKeyRange.bound(startISO, endISO));
    await tx.done;

    const sanitized = records.map((record) => sanitizeActivityRecord(record)).filter(Boolean);
    yearCache.set(cacheKey, sanitized);
    return sanitized;
};

export const getAllDailyActivity = async () => {
    const db = await getDb();
    const records = await db.getAll(ACTIVITY_STORE);
    return records.map((record) => sanitizeActivityRecord(record)).filter(Boolean);
};

export const getUnsyncedDailyActivity = async () => {
    const db = await getDb();
    const records = await db.getAll(ACTIVITY_STORE);
    return records
        .map((record) => sanitizeActivityRecord(record))
        .filter(Boolean)
        .filter((record) => record.synced === false);
};

export const markDailyActivitySynced = async (dates = []) => {
    if (!Array.isArray(dates) || !dates.length) return;

    const db = await getDb();
    const tx = db.transaction(ACTIVITY_STORE, 'readwrite');
    const store = tx.objectStore(ACTIVITY_STORE);

    for (const rawDate of dates) {
        const parsed = parseDateISOToLocalDate(rawDate);
        if (!parsed) continue;
        const date = toDateISO(parsed);
        const existing = sanitizeActivityRecord(await store.get(date));
        if (!existing) continue;
        await store.put({
            ...existing,
            synced: true,
            updatedAt: Date.now(),
        });
    }

    await tx.done;
    clearCaches();
    emitChange();
};

export const getActivityYears = async () => {
    const records = await getAllDailyActivity();
    const years = new Set(records.map((record) => Number(record.date.slice(0, 4))));
    years.add(dayjs().year());
    return Array.from(years).sort((a, b) => b - a);
};

export const getMilestoneAchievements = async () => {
    if (achievementsCache.data) return achievementsCache.data;
    const db = await getDb();
    const records = await db.getAll(ACHIEVEMENTS_STORE);
    const sorted = records.sort((a, b) => b.dateEarned.localeCompare(a.dateEarned));
    achievementsCache.data = sorted;
    return sorted;
};

export const upsertMilestoneAchievement = async ({ id, type, dateEarned }) => {
    if (!id || !type || !parseDateISOToLocalDate(dateEarned)) return null;

    const db = await getDb();
    const existing = await db.get(ACHIEVEMENTS_STORE, id);
    if (existing) return existing;

    const record = { id, type, dateEarned };
    await db.put(ACHIEVEMENTS_STORE, record);
    clearCaches();
    emitChange();
    return record;
};

export const clearDailyActivityData = async () => {
    const db = await getDb();
    const tx = db.transaction([ACTIVITY_STORE, ACHIEVEMENTS_STORE], 'readwrite');
    await tx.objectStore(ACTIVITY_STORE).clear();
    await tx.objectStore(ACHIEVEMENTS_STORE).clear();
    await tx.done;
    clearCaches();
    emitChange();
};
