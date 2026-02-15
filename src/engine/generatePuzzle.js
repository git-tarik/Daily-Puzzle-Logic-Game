import registry from './generatorRegistry.js';

/**
 * Generates a puzzle for a specific date and type.
 * @param {string} dateISO - YYYY-MM-DD
 * @param {string} type - 'sequence' | 'matrix' | 'pattern' | 'deduction' | 'binary'
 * @param {number} difficulty - 1..5
 * @returns {object} Pulse object
 */
export const generatePuzzle = (dateISO, type, difficulty = 1) => {
    const handler = registry[type];
    if (!handler) {
        throw new Error(`Unknown puzzle type: ${type}`);
    }
    return handler.generate(dateISO, difficulty);
};

/**
 * Validates a puzzle attempt.
 * @param {string} type 
 * @param {object} puzzle 
 * @param {any} attempt 
 * @returns {object} { ok, reasons }
 */
export const validatePuzzle = (type, puzzle, attempt) => {
    const handler = registry[type];
    if (!handler) {
        throw new Error(`Unknown puzzle type: ${type}`);
    }
    return handler.validate(puzzle, attempt);
};
