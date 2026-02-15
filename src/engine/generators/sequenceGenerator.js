import { createPRNG, hashSolution } from '../seed.js';

export const generateSequencePuzzle = (dateISO, difficulty = 1) => {
    const type = 'sequence';
    const prng = createPRNG(dateISO, type);
    const seed = `${dateISO}|${type}|LOGIC_LOOPER_V1`; // base seed string, or we can use the hash.
    // Actually, the interface requires `seed` to be returned.
    // Let's use the hash used for PRNG as the seed ID.

    // Helper for random integer between min and max (inclusive)
    const randomInt = (min, max) => Math.floor(prng() * (max - min + 1)) + min;

    // 1. Choose Sequence Type
    const types = ['linear', 'geometric', 'fibonacci_like'];
    const seqType = types[randomInt(0, types.length - 1)];

    let sequence = [];

    // Generate Sequence based on type
    if (seqType === 'linear') {
        const start = randomInt(1, 20);
        const diff = randomInt(2, 10);
        const length = 6 + Math.floor((difficulty - 1) / 2);
        for (let i = 0; i < length; i++) {
            sequence.push(start + i * diff);
        }
    } else if (seqType === 'geometric') {
        const start = randomInt(1, 5);
        const ratio = randomInt(2, 3);
        const length = difficulty >= 4 ? 6 : 5;
        for (let i = 0; i < length; i++) {
            sequence.push(start * Math.pow(ratio, i));
        }
    } else if (seqType === 'fibonacci_like') {
        const a = randomInt(1, 10);
        const b = randomInt(1, 10);
        const length = 7 + Math.floor((difficulty - 1) / 2);
        sequence = [a, b];
        for (let i = 2; i < length; i++) {
            sequence.push(sequence[i - 1] + sequence[i - 2]);
        }
    }

    // 2. Determine Missing Indices
    // Always hide 1 or 2 numbers, but never the first one to give a clue.
    const maxMissing = Math.min(3, Math.max(1, 1 + Math.floor(difficulty / 2)));
    const numMissing = randomInt(1, maxMissing);
    const validIndices = Array.from({ length: sequence.length - 1 }, (_, i) => i + 1); // [1, 2, ..., length-1]

    // Shuffle indices using Fisher-Yates with PRNG
    for (let i = validIndices.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
    }

    const missingIndices = validIndices.slice(0, numMissing).sort((a, b) => a - b);

    // 3. Construct Payload and Solution
    const visibleSequence = sequence.map((val, idx) =>
        missingIndices.includes(idx) ? null : val
    );

    const solution = missingIndices.map(idx => sequence[idx]);

    return {
        id: `seq-${dateISO}`,
        dateISO,
        type,
        seed: seed, // Using the raw seed string construction for consistency
        payload: {
            sequence: visibleSequence,
            ruleHint: "Determine the pattern", // Could be more specific based on difficulty
            missingCount: numMissing,
            missingIndices,
            solution
        },
        solutionHash: hashSolution(seed, solution)
    };
};
