import { generateSequencePuzzle } from './generators/sequenceGenerator.js';
import { generateMatrixPuzzle } from './generators/matrixGenerator.js';
import { generatePatternPuzzle } from './generators/patternGenerator.js';
import { generateDeductionPuzzle } from './generators/deductionGenerator.js';
import { generateBinaryPuzzle } from './generators/binaryGenerator.js';
import { validateSequence } from './validators/sequenceValidator.js';
import { validateMatrix } from './validators/matrixValidator.js';
import { validatePattern } from './validators/patternValidator.js';
import { validateDeduction } from './validators/deductionValidator.js';
import { validateBinary } from './validators/binaryValidator.js';

const registry = {
    sequence: {
        generate: generateSequencePuzzle,
        validate: validateSequence
    },
    matrix: {
        generate: generateMatrixPuzzle,
        validate: validateMatrix
    },
    pattern: {
        generate: generatePatternPuzzle,
        validate: validatePattern
    },
    deduction: {
        generate: generateDeductionPuzzle,
        validate: validateDeduction
    },
    binary: {
        generate: generateBinaryPuzzle,
        validate: validateBinary
    }
};

export default registry;
