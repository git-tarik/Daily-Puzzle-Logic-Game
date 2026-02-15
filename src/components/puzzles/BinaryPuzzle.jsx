import React, { useEffect, useState } from 'react';

const BinaryPuzzle = ({ puzzle, onSubmit, onProgress }) => {
    const rows = puzzle.payload?.rows || [];
    const missingIndices = puzzle.payload?.missingIndices || [];

    const [answers, setAnswers] = useState(() => {
        if (Array.isArray(puzzle.gameState) && puzzle.gameState.length === missingIndices.length) {
            return puzzle.gameState;
        }
        return Array(missingIndices.length).fill('');
    });

    const setAnswer = (idx, value) => {
        const next = [...answers];
        next[idx] = value;
        setAnswers(next);
    };

    const isComplete = answers.every((v) => v === 0 || v === 1 || v === '0' || v === '1');

    useEffect(() => {
        if (!onProgress) return;
        onProgress(answers);
    }, [answers, onProgress]);

    return (
        <div className="flex flex-col items-center gap-6">
            <h3 className="text-lg font-bold">Gate: {puzzle.payload?.gate}</h3>
            <table className="border-collapse border border-gray-300 dark:border-gray-700">
                <thead>
                    <tr>
                        <th className="border px-4 py-2">A</th>
                        <th className="border px-4 py-2">B</th>
                        <th className="border px-4 py-2">Out</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) => {
                        const missingIdx = missingIndices.indexOf(rowIdx);
                        return (
                            <tr key={`${row.a}-${row.b}`}>
                                <td className="border px-4 py-2 text-center">{row.a}</td>
                                <td className="border px-4 py-2 text-center">{row.b}</td>
                                <td className="border px-4 py-2 text-center">
                                    {missingIdx === -1 ? (
                                        row.out
                                    ) : (
                                        <select
                                            value={answers[missingIdx]}
                                            disabled={puzzle.solved}
                                            onChange={(e) => setAnswer(missingIdx, Number(e.target.value))}
                                            className="px-2 py-1 border rounded"
                                        >
                                            <option value="">?</option>
                                            <option value={0}>0</option>
                                            <option value={1}>1</option>
                                        </select>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <button
                onClick={() => onSubmit(answers.map((v) => Number(v)))}
                disabled={!isComplete || puzzle.solved}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-full"
            >
                {puzzle.solved ? 'Solved' : 'Check Solution'}
            </button>
        </div>
    );
};

export default BinaryPuzzle;
