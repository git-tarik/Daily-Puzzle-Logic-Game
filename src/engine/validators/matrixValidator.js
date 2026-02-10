import { hashSolution } from '../seed.js';

/**
 * Validates a matrix puzzle attempt.
 * @param {object} puzzle - The puzzle object
 * @param {any} attempt - The user's attempt (4x4 array of numbers)
 * @returns {object} - { ok: boolean, reasons?: string[] }
 */
export const validateMatrix = (puzzle, attempt) => {
    if (!Array.isArray(attempt) || attempt.length !== 4 || !attempt.every(row => Array.isArray(row) && row.length === 4)) {
        return { ok: false, reasons: ['Invalid input format'] };
    }

    // Check 1: Solution Hash Match (Absolute correctness)
    const attemptHash = hashSolution(puzzle.seed, attempt);
    if (attemptHash === puzzle.solutionHash) {
        return { ok: true };
    }

    // Check 2: Provide specific feedback if wrong
    const reasons = [];

    // Check Rows
    for (let r = 0; r < 4; r++) {
        const row = attempt[r];
        const seen = new Set();
        for (let c = 0; c < 4; c++) {
            const val = row[c];
            if (val === null || val === undefined) {
                reasons.push(`Row ${r + 1} is incomplete`);
                break; // Don't check duplicates if incomplete
            }
            if (seen.has(val)) {
                reasons.push(`Duplicate number ${val} in Row ${r + 1}`);
            }
            seen.add(val);
        }
    }

    // Check Cols
    for (let c = 0; c < 4; c++) {
        const seen = new Set();
        for (let r = 0; r < 4; r++) {
            const val = attempt[r][c];
            // Incompleteness likely caught in row check, but strictly:
            if (val && seen.has(val)) {
                reasons.push(`Duplicate number ${val} in Column ${c + 1}`);
            }
            seen.add(val);
        }
    }

    // If no specific structural rules broken, but hash doesn't match, it means it's just the wrong Latin Square (rare but possible if multiple solutions exist for the given fixed cells, though we should try to generate unambiguous ones or accept any valid latin square? 
    // Requirement: "Solution Hash = SHA256(seed + JSON.stringify(solution))" implies ONE Unique Solution is expected.
    // So if structure is valid but hash doesn't match, it's "Incorrect solution".

    if (reasons.length === 0) {
        reasons.push('Solution is incorrect');
    }

    return { ok: false, reasons };
};
