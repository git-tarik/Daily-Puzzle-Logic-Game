import React, { useEffect, useState } from 'react';

const EMPTY_ARRAY = [];

const PatternPuzzle = ({ puzzle, onSubmit, onProgress }) => {
    const sequence = puzzle.payload?.sequence || EMPTY_ARRAY;
    const missingIndices = puzzle.payload?.missingIndices || EMPTY_ARRAY;
    const bank = puzzle.payload?.bank || EMPTY_ARRAY;
    const [inputs, setInputs] = useState(() => {
        if (!Array.isArray(puzzle.gameState)) return {};
        const restored = {};
        missingIndices.forEach((idx, i) => {
            if (puzzle.gameState[i]) restored[idx] = puzzle.gameState[i];
        });
        return restored;
    });

    const handleChange = (idx, value) => {
        if (value && !/^[A-Za-z0-9]$/.test(value)) return;
        setInputs((prev) => ({ ...prev, [idx]: value.toUpperCase() }));
    };

    const isComplete = missingIndices.every((idx) => inputs[idx] && inputs[idx].trim());

    useEffect(() => {
        if (!onProgress) return;
        const gameState = missingIndices.map((idx) => String(inputs[idx] || '').toUpperCase());
        onProgress(gameState);
    }, [inputs, missingIndices, onProgress]);

    const handleVerify = () => {
        const attempt = missingIndices.map((idx) => String(inputs[idx] || '').toUpperCase());
        onSubmit(attempt);
    };

    return (
        <div className="flex flex-col items-center">
            <p className="text-lg text-gray-600 mb-4 brand-secondary-font">Complete the repeating pattern</p>
            <p className="text-xs text-gray-500 mb-6 brand-secondary-font">Available symbols: {bank.join(', ')}</p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
                {sequence.map((val, idx) => (
                    val !== null ? (
                        <div key={idx} className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold">
                            {val}
                        </div>
                    ) : (
                        <input
                            key={idx}
                            type="text"
                            maxLength={1}
                            value={inputs[idx] || ''}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            disabled={puzzle.solved}
                            className="w-12 h-12 md:w-14 md:h-14 rounded-lg text-center font-bold border-2 border-indigo-300"
                        />
                    )
                ))}
            </div>
            <button
                onClick={handleVerify}
                disabled={!isComplete || puzzle.solved}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-full transition-colors"
            >
                {puzzle.solved ? 'Solved' : 'Check Solution'}
            </button>
        </div>
    );
};

export default PatternPuzzle;
