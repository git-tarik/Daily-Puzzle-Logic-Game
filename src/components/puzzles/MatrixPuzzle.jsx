import React, { useEffect, useState } from 'react';

const MatrixPuzzle = ({ puzzle, onSubmit, onProgress }) => {
    const { initialGrid, fixedCells } = puzzle.payload;

    // Grid state: 2D array
    const [grid, setGrid] = useState(() => {
        if (puzzle.gameState && Array.isArray(puzzle.gameState) && puzzle.gameState.length === 4) {
            return puzzle.gameState;
        }
        return initialGrid;
    });

    const isFixed = (r, c) => {
        return fixedCells.some(cell => cell.row === r && cell.col === c);
    };

    const handleChange = (r, c, value) => {
        if (isFixed(r, c) || puzzle.solved) return;

        // Allow numbers 1-4 only
        if (value && (!/^[1-4]$/.test(value))) return;

        const newGrid = grid.map((row, rowIndex) =>
            row.map((colVal, colIndex) => {
                if (rowIndex === r && colIndex === c) {
                    return value ? parseInt(value, 10) : null;
                }
                return colVal;
            })
        );
        setGrid(newGrid);
    };

    const handleVerify = () => {
        onSubmit(grid);
    };

    const isComplete = grid.every(row => row.every(val => val !== null));

    useEffect(() => {
        if (!onProgress) return;
        onProgress(grid);
    }, [grid, onProgress]);

    return (
        <div className="flex flex-col items-center">
            <div className="text-center mb-6">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">Fill the grid (1-4)</p>
                <p className="text-xs text-gray-400">No duplicates in any row or column.</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8 bg-gray-200 dark:bg-gray-700 p-2 rounded-xl">
                {grid.map((row, r) => (
                    row.map((val, c) => {
                        const fixed = isFixed(r, c);
                        return (
                            <div key={`${r}-${c}`} className="w-14 h-14 md:w-16 md:h-16">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={val || ''}
                                    disabled={fixed || puzzle.solved}
                                    onChange={(e) => handleChange(r, c, e.target.value)}
                                    className={`w-full h-full text-center text-2xl font-bold rounded-lg shadow-sm border focus:ring-2 focus:ring-indigo-500/50 outline-none transition-colors
                    ${fixed
                                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-transparent cursor-not-allowed'
                                            : puzzle.solved
                                                ? 'bg-green-100 border-green-400 text-green-900'
                                                : 'bg-white dark:bg-gray-800 border-white dark:border-gray-600 text-indigo-600 dark:text-indigo-400'
                                        }
                  `}
                                />
                            </div>
                        );
                    })
                ))}
            </div>

            <button
                onClick={handleVerify}
                disabled={!isComplete || puzzle.solved}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-full shadow-lg transition-all transform active:scale-95"
            >
                {puzzle.solved ? 'Solved' : 'Check Solution'}
            </button>
        </div>
    );
};

export default MatrixPuzzle;
