import { hashSolution } from '../seed.js';

/**
 * Validates a sequence puzzle attempt.
 * @param {object} puzzle - The puzzle object
 * @param {any} attempt - The user's attempt (array of numbers)
 * @returns {object} - { ok: boolean, reasons?: string[] }
 */
export const validateSequence = (puzzle, attempt) => {
    if (!Array.isArray(attempt)) {
        return { ok: false, reasons: ['Invalid input format'] };
    }

    // Verify the solution hash matches
    // In a real scenario, we might want to check the attempt against the hash directly
    // But since we want to give specific feedback, we might need to know the solution logic or reconstruct it.
    // HOWEVER, the requirement says "solutionHash = SHA256(seed + JSON.stringify(solution))".
    // This implies we don't send the solution to the client in plain text if we want to be strictly secure,
    // but this is a client-side game. 
    // Let's assume the puzzle object MIGHT contain the solution for easier validation if we trust the client,
    // OR we can't trust it and must rely on the hash.

    // Requirement: "Validators: pure functions, no side effects, reject partial/incorrect".
    // AND "Payload includes visible sequence + missing indices".
    // The solution is the missing numbers.

    // Let's check if the hash of the attempt matches the puzzle.solutionHash
    const attemptHash = hashSolution(puzzle.seed, attempt);

    if (attemptHash === puzzle.solutionHash) {
        return { ok: true };
    }

    return { ok: false, reasons: ['Incorrect sequence'] };
};
