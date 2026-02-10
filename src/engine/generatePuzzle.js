import registry from './generatorRegistry.js';

/**
 * Generates a puzzle for a specific date and type.
 * @param {string} dateISO - YYYY-MM-DD
 * @param {string} type - 'sequence' | 'matrix'
 * @returns {object} Pulse object
 */
export const generatePuzzle = (dateISO, type) => {
    const handler = registry[type];
    if (!handler) {
        throw new Error(`Unknown puzzle type: ${type}`);
    }
    return handler.generate(dateISO);
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
