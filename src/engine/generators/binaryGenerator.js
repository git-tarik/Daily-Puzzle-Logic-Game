import { createPRNG, hashSolution } from '../seed.js';

const applyGate = (gate, a, b) => {
    switch (gate) {
        case 'AND':
            return a & b;
        case 'OR':
            return a | b;
        case 'XOR':
            return a ^ b;
        case 'NAND':
            return Number(!(a & b));
        case 'NOR':
            return Number(!(a | b));
        default:
            return 0;
    }
};

export const generateBinaryPuzzle = (dateISO, difficulty = 1) => {
    const type = 'binary';
    const prng = createPRNG(dateISO, type);
    const seed = `${dateISO}|${type}|LOGIC_LOOPER_V1`;

    const gates = ['AND', 'OR', 'XOR', 'NAND', 'NOR'];
    const gate = gates[Math.floor(prng() * gates.length)];

    const inputs = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1]
    ];

    const outputs = inputs.map(([a, b]) => applyGate(gate, a, b));
    const missingCount = Math.min(4, 1 + Math.floor(difficulty / 2) + Math.floor(prng() * 2));
    const indices = [0, 1, 2, 3];

    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const missingIndices = indices.slice(0, missingCount).sort((a, b) => a - b);
    const rows = inputs.map(([a, b], idx) => ({
        a,
        b,
        out: missingIndices.includes(idx) ? null : outputs[idx]
    }));
    const solution = missingIndices.map((idx) => outputs[idx]);

    return {
        id: `bin-${dateISO}`,
        dateISO,
        type,
        seed,
        payload: {
            gate,
            rows,
            missingIndices
        },
        solutionHash: hashSolution(seed, solution)
    };
};
