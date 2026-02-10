
import { generateSequencePuzzle } from '../src/engine/generators/sequenceGenerator.js';
import { validateSequence } from '../src/engine/validators/sequenceValidator.js';
import process from 'process';

console.log("Starting Sequence Validator Verification...");

const dateISO = "2025-01-01"; // Fixed date for deterministic test
let errors = 0;

try {
    // 1. Generate Puzzle
    console.log(`Generating puzzle for ${dateISO}...`);
    const puzzle = generateSequencePuzzle(dateISO);

    // Check Payload Contract
    if (!puzzle.payload.missingIndices || !Array.isArray(puzzle.payload.missingIndices)) {
        throw new Error("Payload missing 'missingIndices' array");
    }
    if (!puzzle.payload.solution || !Array.isArray(puzzle.payload.solution)) {
        throw new Error("Payload missing 'solution' array");
    }

    console.log("Payload Contract OK.");
    console.log("Missing Indices:", puzzle.payload.missingIndices);
    console.log("Solution:", puzzle.payload.solution);

    // 2. Test CORRECT Attempt
    // The UI submits an array of numbers corresponding to missingIndices
    const correctAttempt = [...puzzle.payload.solution];
    console.log("Testing Correct Attempt:", correctAttempt);

    const resultSuccess = validateSequence(puzzle, correctAttempt);
    if (!resultSuccess.ok) {
        throw new Error(`Correct attempt rejected! Reasons: ${resultSuccess.reasons.join(', ')}`);
    }
    console.log("Correct attempt passed validation.");

    // 3. Test INCORRECT Attempt (Wrong numbers)
    const wrongAttempt = correctAttempt.map(n => n + 1);
    console.log("Testing Wrong Attempt:", wrongAttempt);

    const resultFail = validateSequence(puzzle, wrongAttempt);
    if (resultFail.ok) {
        throw new Error("Incorrect attempt was ACCEPTED!");
    }
    console.log("Incorrect attempt correctly rejected.");

    // 4. Test INCORRECT FORMAT (Wrong length)
    const shortAttempt = correctAttempt.slice(0, -1);
    if (shortAttempt.length !== correctAttempt.length) { // Only run if we actually shortened it
        console.log("Testing Short Attempt:", shortAttempt);
        const resultShort = validateSequence(puzzle, shortAttempt);
        if (resultShort.ok) {
            throw new Error("Short attempt was ACCEPTED!");
        }
        console.log("Short attempt correctly rejected.");
    }

} catch (e) {
    console.error("Test Failed:", e.message);
    errors++;
}

if (errors === 0) {
    console.log("SUCCESS: Validator Logic Verified.");
    process.exit(0);
} else {
    console.error("FAILURE: Validation Logic Errors Found.");
    process.exit(1);
}
