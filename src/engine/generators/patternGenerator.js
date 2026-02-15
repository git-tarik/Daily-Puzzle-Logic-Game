import { createPRNG, hashSolution } from '../seed.js';

export const generatePatternPuzzle = (dateISO, difficulty = 1) => {
    const type = 'pattern';
    const prng = createPRNG(dateISO, type);
    const seed = `${dateISO}|${type}|LOGIC_LOOPER_V1`;

    const symbolPools = [
        ['A', 'B', 'C'],
        ['X', 'Y', 'Z', 'W'],
        ['1', '2', '3', '4'],
    ];
    const bank = symbolPools[Math.floor(prng() * symbolPools.length)];
    const motifLength = bank.length;
    const sequenceLength = motifLength === 3 ? 9 : 8;

    const sequence = Array.from({ length: sequenceLength }, (_, idx) => bank[idx % motifLength]);
    const numMissing = Math.min(motifLength === 3 ? 3 : 4, 1 + Math.floor(difficulty / 2));
    const candidateIndices = Array.from({ length: sequenceLength - 1 }, (_, i) => i + 1);

    for (let i = candidateIndices.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [candidateIndices[i], candidateIndices[j]] = [candidateIndices[j], candidateIndices[i]];
    }

    const missingIndices = candidateIndices.slice(0, numMissing).sort((a, b) => a - b);
    const visible = sequence.map((symbol, idx) => (missingIndices.includes(idx) ? null : symbol));
    const solution = missingIndices.map((idx) => sequence[idx]);

    return {
        id: `ptr-${dateISO}`,
        dateISO,
        type,
        seed,
        payload: {
            sequence: visible,
            bank,
            missingIndices,
            solution,
            ruleHint: 'Repeat the symbol pattern'
        },
        solutionHash: hashSolution(seed, solution)
    };
};
