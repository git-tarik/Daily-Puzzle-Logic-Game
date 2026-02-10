export const calculateScore = ({ difficulty = 1, timeTakenSeconds, hintsUsed, streak }) => {
    const basePoints = difficulty * 100;

    // Time Bonus: 100 points minus 2 points per minute taken, min 0.
    // Using 50 minutes as cutoff for 0 bonus.
    const minutesTaken = timeTakenSeconds / 60;
    const timeBonus = Math.max(0, Math.round(100 - minutesTaken * 2));

    // Hint Penalty: 10 points per hint
    const hintPenalty = hintsUsed * 10;

    const rawScore = basePoints + timeBonus - hintPenalty;

    // Streak Bonus: 5% per streak day, capped at 25% (5 days)
    const streakMultiplier = Math.min(streak * 0.05, 0.25);
    const streakBonusPoints = Math.round(Math.max(0, rawScore) * streakMultiplier);

    const finalScore = Math.max(0, rawScore + streakBonusPoints);

    return {
        finalScore,
        breakdown: {
            basePoints,
            timeBonus,
            hintPenalty,
            streakBonusPoints
        }
    };
};
