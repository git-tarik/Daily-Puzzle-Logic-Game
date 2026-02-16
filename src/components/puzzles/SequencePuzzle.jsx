import React, { useEffect, useState } from 'react';
import { logger } from '../../lib/logger.js';

const EMPTY_ARRAY = [];

const SequencePuzzle = ({ puzzle, onSubmit, onProgress }) => {
    const isInvalidPuzzle = !puzzle.payload || !puzzle.payload.missingIndices;
    const sequence = puzzle.payload?.sequence || EMPTY_ARRAY;
    const [inputs, setInputs] = useState(() => {
        if (puzzle.gameState && Array.isArray(puzzle.gameState)) {
            const newInputs = {};
            sequence.forEach((val, idx) => {
                if (val === null && puzzle.gameState[idx] !== null && puzzle.gameState[idx] !== undefined) {
                    newInputs[idx] = puzzle.gameState[idx];
                }
            });
            return newInputs;
        }
        return {};
    });

    const handleChange = (index, value) => {
        // simple validation: only numbers
        if (value && !/^\d*$/.test(value)) return;

        setInputs(prev => ({
            ...prev,
            [index]: value
        }));
    };

    useEffect(() => {
        if (!onProgress || isInvalidPuzzle) return;
        const gameState = sequence.map((val, idx) => {
            if (val !== null) return val;
            const inputValue = inputs[idx];
            return inputValue ? Number(inputValue) : null;
        });
        onProgress(gameState);
    }, [inputs, isInvalidPuzzle, onProgress, sequence]);

    if (isInvalidPuzzle) {
        return <div className="text-red-500">Error: Invalid puzzle data. Please refresh.</div>;
    }

    const handleVerify = () => {
        const { missingIndices } = puzzle.payload;

        // Construct array of ONLY the user's answers, in order of missingIndices
        const attempt = missingIndices.map(index => {
            const val = inputs[index];
            return val ? parseInt(val, 10) : null;
        });

        logger.info('Validating attempt', { missingIndices, inputs, attempt });

        onSubmit(attempt);
    };

    const isComplete = sequence.every((val, idx) => val !== null || (inputs[idx] && inputs[idx] !== ''));

    return (
        <div className="flex flex-col items-center">
            <div className="text-center mb-8">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Find the missing numbers</p>
                <p className="text-sm text-indigo-500 font-medium">Hint: {puzzle.payload.ruleHint || "Pattern recognition"}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-8">
                {sequence.map((num, idx) => (
                    <div key={idx} className="relative">
                        {num !== null ? (
                            <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xl md:text-2xl shadow-sm border border-gray-200 dark:border-gray-600">
                                {num}
                            </div>
                        ) : (
                            <input
                                type="text"
                                inputMode="numeric"
                                value={inputs[idx] || ''}
                                disabled={puzzle.solved}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                className={`w-12 h-12 md:w-16 md:h-16 text-center rounded-xl font-bold text-xl md:text-2xl shadow-inner border-2 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all
                  ${puzzle.solved
                                        ? 'bg-green-100 border-green-400 text-green-900'
                                        : 'bg-white dark:bg-gray-800 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 focus:border-indigo-500'
                                    }`}
                            />
                        )}
                        {num === null && (
                            <div className="absolute -bottom-6 left-0 right-0 text-center">
                                <span className="text-xs text-gray-400">?</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={handleVerify}
                disabled={!isComplete || puzzle.solved}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-full shadow-lg transition-all transform active:scale-95"
            >
                {puzzle.solved ? 'Solved' : 'Check Solution'}
            </button>
        </div>
    );
};

export default SequencePuzzle;
