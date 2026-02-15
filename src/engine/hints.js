export const DAILY_HINT_LIMIT = 3;

export const getPuzzleHint = (puzzle) => {
    switch (puzzle.type) {
        case 'sequence':
            return 'Compare consecutive terms. Try differences or ratios.';
        case 'matrix':
            return 'Each row and column must contain 1-4 exactly once.';
        case 'pattern':
            return 'Look for the shortest repeating motif.';
        case 'deduction':
            return 'Start with direct clues, then eliminate impossible pairs.';
        case 'binary':
            return `Evaluate each row using the ${puzzle.payload?.gate} gate truth rule.`;
        default:
            return 'Break the puzzle into smaller constraints.';
    }
};
