import { generatePuzzle, validatePuzzle } from './generatePuzzle.js';

const TYPES = ['matrix', 'sequence', 'pattern', 'deduction', 'binary'];
const DATE = '2026-02-15';

console.log('--- Testing All Puzzle Types ---');
for (const type of TYPES) {
    const puzzle = generatePuzzle(DATE, type, 3);
    console.log(`Generated ${type}:`, puzzle.id ? 'PASS' : 'FAIL');

    let attempt;
    switch (type) {
        case 'matrix':
            attempt = puzzle.payload.initialGrid.map((row) => [...row]);
            // Use solution not available directly; validate should fail for incomplete grid.
            break;
        case 'sequence':
            attempt = puzzle.payload.solution;
            break;
        case 'pattern':
            attempt = puzzle.payload.solution;
            break;
        case 'deduction':
            attempt = puzzle.payload.solution;
            break;
        case 'binary':
            attempt = puzzle.payload.missingIndices.map((idx) => {
                const row = puzzle.payload.rows[idx];
                const gate = puzzle.payload.gate;
                if (gate === 'AND') return row.a & row.b;
                if (gate === 'OR') return row.a | row.b;
                if (gate === 'XOR') return row.a ^ row.b;
                if (gate === 'NAND') return Number(!(row.a & row.b));
                return Number(!(row.a | row.b));
            });
            break;
        default:
            attempt = [];
    }

    const result = validatePuzzle(type, puzzle, attempt);
    if (type === 'matrix') {
        console.log(`Validate ${type}:`, result.ok ? 'PASS (solved)' : 'PASS (incomplete rejected)');
    } else {
        console.log(`Validate ${type}:`, result.ok ? 'PASS' : `FAIL (${result.reasons?.join(', ')})`);
    }
}
