import { calculateScore } from './scoring.js';
import { checkAchievements } from './achievements.js';

console.log('--- Testing Scoring Logic ---');

const score1 = calculateScore({
    difficulty: 1,
    timeTakenSeconds: 60, // 1 min -> 100 - 2 = 98 bonus
    hintsUsed: 0,
    streak: 1 // 5% bonus
});
// Base 100 + Time 98 = 198. Hint 0. Streak 198 * 0.05 = 9.9 -> 10. Total 208.
console.log('Test 1 (Normal):', score1.finalScore === 208 ? 'PASS' : `FAIL (Got ${score1.finalScore})`);


const score2 = calculateScore({
    difficulty: 1,
    timeTakenSeconds: 3000, // 50 mins -> 0 bonus
    hintsUsed: 2, // -20
    streak: 5 // Max 25%? No, 5*5 = 25%.
});
// Base 100 + Time 0 - 20 = 80. Streak 80 * 0.25 = 20. Total 100.
console.log('Test 2 (Slow/Hints):', score2.finalScore === 100 ? 'PASS' : `FAIL (Got ${score2.finalScore})`);


console.log('\n--- Testing Achievements Logic ---');

const user = { unlockedAchievements: [] };
const outcome1 = { solved: true, hintsUsed: 0, timeTaken: 50 };
const unlocks1 = checkAchievements(user, outcome1);
console.log('Test 3 (First Solve + No Hint + Fast):',
    unlocks1.includes('FIRST_SOLVE') && unlocks1.includes('NO_HINT_SOLVE') && unlocks1.includes('FAST_SOLVE')
        ? 'PASS' : `FAIL (Got ${unlocks1})`
);

const userStreak = { streakCount: 7, unlockedAchievements: ['FIRST_SOLVE'] };
const outcome2 = { solved: true, hintsUsed: 1, timeTaken: 200 };
const unlocks2 = checkAchievements(userStreak, outcome2);
console.log('Test 4 (Streak 7):',
    unlocks2.includes('STREAK_7') && !unlocks2.includes('FIRST_SOLVE') // Should not re-unlock
        ? 'PASS' : `FAIL (Got ${unlocks2})`
);
