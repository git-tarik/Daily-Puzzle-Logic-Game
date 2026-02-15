import { generatePuzzle } from './generatePuzzle.js';

console.log('--- Testing Determinism ---');

const date = '2026-02-10';
const type = 'matrix';

// Generate first time
const p1 = generatePuzzle(date, type);
console.log('Puzzle 1 Seed:', p1.seed);
console.log('Puzzle 1 Hash:', p1.solutionHash);

// Generate second time
const p2 = generatePuzzle(date, type);
console.log('Puzzle 2 Seed:', p2.seed);
console.log('Puzzle 2 Hash:', p2.solutionHash);

if (p1.seed === p2.seed && p1.solutionHash === p2.solutionHash) {
    console.log('PASS: Puzzles are identical for same date/type');
} else {
    console.error('FAIL: Puzzles differ!');
    console.log('P1:', JSON.stringify(p1.payload));
    console.log('P2:', JSON.stringify(p2.payload));
}

console.log('\n--- Testing Sequence Determinism ---');
const s1 = generatePuzzle(date, 'sequence');
const s2 = generatePuzzle(date, 'sequence');

if (s1.solutionHash === s2.solutionHash) {
    console.log('PASS: Sequence Puzzles are identical');
} else {
    console.error('FAIL: Sequence Puzzles differ!');
}
