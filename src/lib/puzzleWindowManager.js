import dayjs from 'dayjs';
import { generatePuzzle } from '../engine/generatePuzzle';
import { getDailyPuzzleMeta } from '../engine/dailyPlan';
import { getPuzzle, getPuzzlesInRange, getUser, savePuzzle } from './db';

const WINDOW_DAYS = 7;
const memoryWindow = new Map();

const computeAdaptiveDifficulty = (baseDifficulty, user) => {
    if ((user?.puzzlesSolved || 0) < 3) return baseDifficulty;
    if ((user?.avgSolveTime || 0) < 180) return Math.min(5, baseDifficulty + 1);
    if ((user?.avgSolveTime || 0) > 600) return Math.max(1, baseDifficulty - 1);
    return baseDifficulty;
};

const buildDailyPuzzle = async (dateISO) => {
    const { type, difficulty: baseDifficulty } = getDailyPuzzleMeta(dateISO);
    const user = await getUser();
    const difficulty = computeAdaptiveDifficulty(baseDifficulty, user);
    const generated = generatePuzzle(dateISO, type, difficulty);

    return {
        dateISO,
        ...generated,
        difficulty,
        progress: 0,
        solved: false,
        attempts: [],
        hintsUsed: 0,
        gameState: null
    };
};

const getWindowBounds = (baseDateISO) => {
    const start = dayjs(baseDateISO).startOf('day');
    const end = start.add(WINDOW_DAYS, 'day');
    return {
        fromISO: start.format('YYYY-MM-DD'),
        toISO: end.format('YYYY-MM-DD'),
    };
};

const hydrateWindow = async (fromISO, toISO) => {
    const records = await getPuzzlesInRange(fromISO, toISO);
    records.forEach((puzzle) => memoryWindow.set(puzzle.dateISO, puzzle));
};

const trimMemoryWindow = (fromISO, toISO) => {
    for (const key of memoryWindow.keys()) {
        if (key < fromISO || key > toISO) {
            memoryWindow.delete(key);
        }
    }
};

export const ensurePuzzleWindow = async (baseDateISO) => {
    const { fromISO, toISO } = getWindowBounds(baseDateISO);
    await hydrateWindow(fromISO, toISO);

    const tasks = [];
    for (let offset = 0; offset <= WINDOW_DAYS; offset += 1) {
        const dateISO = dayjs(baseDateISO).add(offset, 'day').format('YYYY-MM-DD');
        if (memoryWindow.has(dateISO)) continue;
        tasks.push(
            (async () => {
                const existing = await getPuzzle(dateISO);
                if (existing) {
                    memoryWindow.set(dateISO, existing);
                    return;
                }
                const created = await buildDailyPuzzle(dateISO);
                await savePuzzle(created);
                memoryWindow.set(dateISO, created);
            })()
        );
    }

    await Promise.all(tasks);
    trimMemoryWindow(fromISO, toISO);
};

export const loadPuzzleWithWindow = async (dateISO) => {
    await ensurePuzzleWindow(dateISO);
    const fromMemory = memoryWindow.get(dateISO);
    if (fromMemory) return fromMemory;

    const fromDb = await getPuzzle(dateISO);
    if (fromDb) {
        memoryWindow.set(dateISO, fromDb);
        return fromDb;
    }

    const created = await buildDailyPuzzle(dateISO);
    await savePuzzle(created);
    memoryWindow.set(dateISO, created);
    return created;
};
