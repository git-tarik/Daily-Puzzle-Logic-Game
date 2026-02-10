import { generateSequencePuzzle } from './generators/sequenceGenerator.js';
import { generateMatrixPuzzle } from './generators/matrixGenerator.js';
import { validateSequence } from './validators/sequenceValidator.js';
import { validateMatrix } from './validators/matrixValidator.js';

const registry = {
    sequence: {
        generate: generateSequencePuzzle,
        validate: validateSequence
    },
    matrix: {
        generate: generateMatrixPuzzle,
        validate: validateMatrix
    }
};

export default registry;
