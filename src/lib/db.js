import Dexie from 'dexie';

export const db = new Dexie('logic-looper-db');

db.version(1).stores({
    puzzles: 'dateISO, puzzleSeed, puzzleType, progress, solved, attempts, hintsUsed, gameState',
    user: 'idLocal, guestName, streakCount, lastPlayedISO, heatmap',
    settings: 'key, value',
});

// Version 2: Add scoring and achievements
db.version(2).stores({
    puzzles: 'dateISO, puzzleSeed, puzzleType, progress, solved, attempts, hintsUsed, gameState, score, timeTaken',
    user: 'idLocal, guestName, streakCount, lastPlayedISO, heatmap, totalScore, unlockedAchievements'
});

// Helper functions
export const getPuzzle = async (dateISO) => {
    return await db.puzzles.get(dateISO);
};

export const savePuzzle = async (puzzleObject) => {
    return await db.puzzles.put(puzzleObject);
};

export const getUser = async () => {
    const users = await db.user.toArray();
    return users[0] || null; // Return first user or null
};

export const saveUser = async (userObject) => {
    // Ensure we only have one user for now (guest/local)
    const existingUser = await getUser();
    if (existingUser) {
        userObject.idLocal = existingUser.idLocal; // Keep same ID
    }
    return await db.user.put(userObject);
};
