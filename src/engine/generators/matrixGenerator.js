import { createPRNG, hashSolution } from '../seed.js';

export const generateMatrixPuzzle = (dateISO, difficulty = 1) => {
    const type = 'matrix';
    const prng = createPRNG(dateISO, type);
    const seed = `${dateISO}|${type}|LOGIC_LOOPER_V1`;

    // Helper for shuffle
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(prng() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    // Generate a valid 4x4 Latin Square
    // Simple method: Start with a base valid square and shuffle rows/cols
    // Base:
    // 1 2 3 4
    // 2 3 4 1
    // 3 4 1 2
    // 4 1 2 3

    let grid = [
        [1, 2, 3, 4],
        [2, 3, 4, 1],
        [3, 4, 1, 2],
        [4, 1, 2, 3]
    ];

    // Shuffle rows
    grid = shuffle(grid);

    // Shuffle columns (transpose, shuffle rows, transpose back)
    const transpose = (m) => m[0].map((_, i) => m.map(row => row[i]));
    grid = transpose(shuffle(transpose(grid)));

    // Relabel numbers (map 1..4 to shuffled 1..4)
    const map = shuffle([1, 2, 3, 4]);
    grid = grid.map(row => row.map(val => map[val - 1]));

    const solution = JSON.parse(JSON.stringify(grid)); // Deep copy for solution

    // Determine fixed cells
    // To ensure unique solution, we shouldn't remove too many.
    // A 4x4 latin square critical set size varies, but ~4-6 clues might be ambiguos. 
    // Let's keep about 6-8 cells visible.

    const minVisible = Math.max(4, 8 - difficulty); // harder => fewer clues
    const maxVisible = Math.max(minVisible, minVisible + 1);
    const numVisible = Math.floor(prng() * (maxVisible - minVisible + 1)) + minVisible;
    const positions = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            positions.push([r, c]);
        }
    }

    const visiblePositions = shuffle(positions).slice(0, numVisible);
    const fixedCells = visiblePositions.map(([r, c]) => ({ row: r, col: c, value: grid[r][c] }));

    // Construct initial grid state (null for empty)
    const initialGrid = Array(4).fill(null).map(() => Array(4).fill(null));
    fixedCells.forEach(({ row, col, value }) => {
        initialGrid[row][col] = value;
    });

    return {
        id: `mtx-${dateISO}`,
        dateISO,
        type,
        seed,
        payload: {
            initialGrid,
            fixedCells, // Redundant but helpful for UI to know which are immutable
            rows: 4,
            cols: 4
        },
        solutionHash: hashSolution(seed, solution)
    };
};
