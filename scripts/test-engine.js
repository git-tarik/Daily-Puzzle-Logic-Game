
import { generatePuzzle } from '../src/engine/generatePuzzle.js';
import process from 'process';

console.log("Starting Engine Verification...");

const dateISO = new Date().toISOString().split('T')[0];
let errors = 0;

// Test Sequence Puzzle
try {
    console.log(`Testing Sequence Puzzle Generation for ${dateISO}...`);
    const seq = generatePuzzle(dateISO, 'sequence');
    if (!seq || seq.type !== 'sequence') throw new Error("Failed to generate sequence puzzle");
    if (!seq.solutionHash) throw new Error("Missing solution hash");
    console.log("Sequence Payload:", JSON.stringify(seq.payload, null, 2));

    // Validate with correct solution (needs solving logic or access to solution, but here we can just check structure)
    // We can't easily validte the solution without solving it, but we can check if it CRASHES.
    console.log("Sequence generation successful.");
} catch (e) {
    console.error("Sequence Test Failed:", e);
    errors++;
}

// Test Matrix Puzzle
try {
    console.log(`Testing Matrix Puzzle Generation for ${dateISO}...`);
    const mtx = generatePuzzle(dateISO, 'matrix');
    if (!mtx || mtx.type !== 'matrix') throw new Error("Failed to generate matrix puzzle");
    if (!mtx.payload.initialGrid) throw new Error("Missing initialGrid");
    console.log("Matrix generated OK.");
} catch (e) {
    console.error("Matrix Test Failed:", e);
    errors++;
}

if (errors === 0) {
    console.log("All verify checks passed!");
    process.exit(0);
} else {
    console.error(`Found ${errors} errors.`);
    process.exit(1);
}
