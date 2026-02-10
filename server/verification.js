import { generatePuzzle, validatePuzzle } from '../src/engine/generatePuzzle.js';
import { calculateScore } from '../src/engine/scoring.js';
import crypto from 'crypto';

// Verify solution proof (SHA256 of seed + solution)
const verifyProof = (seed, solution, proof) => {
    const computed = crypto.createHash('sha256').update(seed + JSON.stringify(solution)).digest('hex');
    return computed === proof;
};

export const verifyScoreSubmission = ({ dateISO, puzzleType, score, userId, solutionProof, attempt, timeTaken }) => {
    // 1. Regenerate Puzzle
    // Note: generatePuzzle uses src/engine which uses seedrandom. 
    // We must ensure the server environment produces same result. 
    // seedrandom is deterministic, so it should work if dateISO constitutes the seed correctly.
    const puzzle = generatePuzzle(dateISO, puzzleType);

    // 2. Validate Attempt (Structure & Rules)
    const validation = validatePuzzle(puzzleType, puzzle, attempt);
    if (!validation.ok) {
        return { valid: false, reason: 'Invalid puzzle attempt: ' + validation.reasons.join(', ') };
    }

    // 3. Verify Solution Proof (Did the client actually have the solution?)
    // Note: Our current client implementation calculates proof on solve. 
    // puzzle.solutionHash IS the proof we expect.
    if (solutionProof !== puzzle.solutionHash) {
        return { valid: false, reason: 'Invalid solution proof.' };
    }

    // 4. Verify Score Calculation
    // We need to fetch user streak from DB before this normally, but here we verify the MATH.
    // The client sends 'score', but we should RECALCULATE it and compare.
    // However, we might not know the exact 'streak' the client claims to have without DB lookup.
    // For this helper, let's assume we pass in the `streak` we believe the user has, 
    // OR we trust the client's claimed streak for the *calculation check* but verify valid streak later?
    // BETTER: The verify function returns the CALCULATED score, and the caller (API) compares.

    // We return the calculated base score (without streak?) or we expect streak passed in.
    return { valid: true, puzzle };
};
