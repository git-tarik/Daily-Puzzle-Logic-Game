export const ACHIEVEMENTS = {
    FIRST_SOLVE: {
        id: 'FIRST_SOLVE',
        name: 'First Loop',
        description: 'Solve your first puzzle.',
        icon: 'bi bi-stars'
    },
    STREAK_3: {
        id: 'STREAK_3',
        name: 'Hat Trick',
        description: 'Reach a 3-day streak.',
        icon: 'bi bi-lightning-charge-fill'
    },
    STREAK_7: {
        id: 'STREAK_7',
        name: 'Weekly Warrior',
        description: 'Reach a 7-day streak.',
        icon: 'bi bi-calendar-check-fill'
    },
    NO_HINT_SOLVE: {
        id: 'NO_HINT_SOLVE',
        name: 'Pure Logic',
        description: 'Solve a puzzle without using hints.',
        icon: 'bi bi-brilliance'
    },
    FAST_SOLVE: {
        id: 'FAST_SOLVE',
        name: 'Speedster',
        description: 'Solve a puzzle in under 2 minutes.',
        icon: 'bi bi-stopwatch-fill'
    }
};

/**
 * Checks for new achievements based on current state.
 * @param {object} user - User object with stats
 * @param {object} puzzleOutcome - { solved, hintsUsed, timeTaken }
 * @returns {string[]} - Array of newly unlocked achievement IDs
 */
export const checkAchievements = (user, puzzleOutcome) => {
    const unlocked = new Set(user.unlockedAchievements || []);
    const newUnlocks = [];

    const unlock = (id) => {
        if (!unlocked.has(id)) {
            newUnlocks.push(id);
            unlocked.add(id);
        }
    };

    if (puzzleOutcome.solved) {
        unlock('FIRST_SOLVE');

        if (user.streakCount >= 3) unlock('STREAK_3');
        if (user.streakCount >= 7) unlock('STREAK_7');

        if (puzzleOutcome.hintsUsed === 0) unlock('NO_HINT_SOLVE');
        if (puzzleOutcome.timeTaken < 120) unlock('FAST_SOLVE');
    }

    return newUnlocks;
};
