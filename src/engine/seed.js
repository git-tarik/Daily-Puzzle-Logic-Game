import CryptoJS from 'crypto-js';
import seedrandom from 'seedrandom';

/**
 * Creates a seeded PRNG function based on the date and puzzle type.
 * @param {string} dateISO - ISO date string (YYYY-MM-DD)
 * @param {string} type - Puzzle type identifier
 * @returns {function} - A PRNG function that returns a number between 0 and 1
 */
export const createPRNG = (dateISO, type) => {
    const seedString = `${dateISO}|${type}|LOGIC_LOOPER_V1`;
    const hash = CryptoJS.SHA256(seedString).toString();
    return seedrandom(hash);
};

/**
 * Generates a SHA256 hash of the solution for validation.
 * @param {string} seed - The seed used to generate the puzzle
 * @param {any} solution - The solution object/value
 * @returns {string} - The hash of the solution
 */
export const hashSolution = (seed, solution) => {
    return CryptoJS.SHA256(seed + JSON.stringify(solution)).toString();
};
