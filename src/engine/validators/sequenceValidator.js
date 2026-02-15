/**
 * Validates a sequence puzzle attempt.
 * @param {object} puzzle - The puzzle object
 * @param {any} attempt - The user's attempt (array of numbers)
 * @returns {object} - { ok: boolean, reasons?: string[] }
 */
export const validateSequence = (puzzle, attempt) => {
    if (!puzzle.payload || !puzzle.payload.missingIndices || !puzzle.payload.solution) {
        console.error("Validator Error: Stale or invalid puzzle data", puzzle);
        return { ok: false, reasons: ['System error: Invalid puzzle data. Please refresh.'] };
    }

    const { missingIndices, solution } = puzzle.payload;

    if (!Array.isArray(attempt)) {
        return { ok: false, reasons: ['Invalid attempt format'] };
    }

    if (attempt.length !== missingIndices.length) {
        return { ok: false, reasons: ['Incorrect number of values'] };
    }

    for (let i = 0; i < missingIndices.length; i++) {
        const userValue = Number(attempt[i]);
        const correctValue = solution[i];

        if (Number.isNaN(userValue) || userValue !== correctValue) {
            return { ok: false, reasons: ['Incorrect sequence'] };
        }
    }

    return { ok: true };
};
