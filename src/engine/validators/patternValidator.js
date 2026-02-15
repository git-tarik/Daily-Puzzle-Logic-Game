export const validatePattern = (puzzle, attempt) => {
    const missingIndices = puzzle.payload?.missingIndices;
    const solution = puzzle.payload?.solution;
    if (!Array.isArray(missingIndices) || !Array.isArray(solution)) {
        return { ok: false, reasons: ['Invalid puzzle data'] };
    }

    if (!Array.isArray(attempt) || attempt.length !== missingIndices.length) {
        return { ok: false, reasons: ['Incorrect number of symbols'] };
    }

    for (let i = 0; i < attempt.length; i++) {
        const userVal = String(attempt[i] || '').trim().toUpperCase();
        if (!userVal || userVal !== String(solution[i] || '').toUpperCase()) {
            return { ok: false, reasons: ['Pattern is incorrect'] };
        }
    }

    return { ok: true };
};
