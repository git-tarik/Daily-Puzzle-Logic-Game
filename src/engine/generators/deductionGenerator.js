import { createPRNG, hashSolution } from '../seed.js';

const shuffle = (arr, prng) => {
    const cloned = [...arr];
    for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
};

export const generateDeductionPuzzle = (dateISO, difficulty = 1) => {
    const type = 'deduction';
    const prng = createPRNG(dateISO, type);
    const seed = `${dateISO}|${type}|LOGIC_LOOPER_V1`;

    const hardMode = difficulty >= 4;
    const people = hardMode ? ['Alex', 'Blair', 'Casey', 'Drew'] : ['Alex', 'Blair', 'Casey'];
    const petPool = hardMode ? ['Cat', 'Dog', 'Bird', 'Fish'] : ['Cat', 'Dog', 'Bird'];
    const pets = shuffle(petPool, prng);
    const solution = [...pets];

    const clues = [
        `${people[0]} owns the ${solution[0]}.`,
        `${people[1]} does not own the ${solution[0]}.`,
        `The ${solution[2]} belongs to ${people[2]}.`
    ];
    if (hardMode) {
        clues.push(`${people[3]} does not own the ${solution[1]}.`);
    }

    return {
        id: `ddc-${dateISO}`,
        dateISO,
        type,
        seed,
        payload: {
            people,
            pets: petPool,
            clues,
            solution
        },
        solutionHash: hashSolution(seed, solution)
    };
};
