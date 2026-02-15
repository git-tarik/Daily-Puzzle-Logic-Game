export const validateBinary = (puzzle, attempt) => {
    const missingIndices = puzzle.payload?.missingIndices;
    const rows = puzzle.payload?.rows;
    if (!Array.isArray(missingIndices) || !Array.isArray(rows)) {
        return { ok: false, reasons: ['Invalid puzzle data'] };
    }

    if (!Array.isArray(attempt) || attempt.length !== missingIndices.length) {
        return { ok: false, reasons: ['Incorrect number of outputs'] };
    }

    const compute = (gate, a, b) => {
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

    for (let i = 0; i < missingIndices.length; i++) {
        const idx = missingIndices[i];
        const row = rows[idx];
        const expected = compute(puzzle.payload.gate, row.a, row.b);
        const value = Number(attempt[i]);
        if (Number.isNaN(value) || (value !== 0 && value !== 1) || value !== expected) {
            return { ok: false, reasons: ['Truth table output is incorrect'] };
        }
    }

    return { ok: true };
};
