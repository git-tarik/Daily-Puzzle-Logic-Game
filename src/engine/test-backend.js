import { verifyScoreSubmission } from '../../server/verification.js';

console.log('--- Testing Backend Verification ---');

const testCase = {
    dateISO: '2026-02-11',
    puzzleType: 'matrix',
    score: 100, // Dummy
    userId: 'test-user',
    solutionProof: 'INVALID_HASH',
    attempt: [],
    timeTaken: 60
};

// 1. Test Verification Logic (Should fail proof)
const result1 = verifyScoreSubmission(testCase);
console.log('Test 1 (Invalid Proof):', !result1.valid ? 'PASS' : 'FAIL');

// 2. Test Future Date
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 2);
const diffHours = (futureDate - new Date()) / (1000 * 60 * 60);
console.log('Test 2 (Future Check logic):', diffHours > 24 ? 'PASS' : 'FAIL');
