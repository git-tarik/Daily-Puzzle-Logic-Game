import { generatePuzzle, validatePuzzle } from '../engine/generatePuzzle';

describe('puzzle generation', () => {
    test('generates deterministic puzzle output for same date/type', () => {
        const first = generatePuzzle('2026-02-16', 'sequence', 2);
        const second = generatePuzzle('2026-02-16', 'sequence', 2);
        expect(first.solutionHash).toBe(second.solutionHash);
        expect(first.seed).toBe(second.seed);
    });

    test('generation is fast enough for daily puzzle target', () => {
        const start = performance.now();
        generatePuzzle('2026-02-16', 'matrix', 3);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(100);
    });

    test('validates invalid attempt for sequence puzzle', () => {
        const puzzle = generatePuzzle('2026-02-16', 'sequence', 2);
        const result = validatePuzzle('sequence', puzzle, []);
        expect(result.ok).toBe(false);
    });

    test('throws for unknown puzzle type', () => {
        expect(() => generatePuzzle('2026-02-16', 'unknown', 1)).toThrow('Unknown puzzle type');
        expect(() => validatePuzzle('unknown', {}, {})).toThrow('Unknown puzzle type');
    });
});
