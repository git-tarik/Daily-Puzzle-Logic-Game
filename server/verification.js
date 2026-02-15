import { generatePuzzle, validatePuzzle } from '../src/engine/generatePuzzle.js';

export const verifyScoreSubmission = ({ dateISO, puzzleType, solutionProof, attempt }) => {
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

    return { valid: true, puzzle };
};
