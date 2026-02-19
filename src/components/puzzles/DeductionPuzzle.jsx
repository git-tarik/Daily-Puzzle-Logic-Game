import React, { useEffect, useState } from 'react';

const DeductionPuzzle = ({ puzzle, onSubmit, onProgress }) => {
    const people = puzzle.payload?.people || [];
    const pets = puzzle.payload?.pets || [];
    const clues = puzzle.payload?.clues || [];

    const [assignments, setAssignments] = useState(() => {
        if (Array.isArray(puzzle.gameState) && puzzle.gameState.length === people.length) {
            return puzzle.gameState;
        }
        return Array(people.length).fill('');
    });

    const handleChange = (idx, value) => {
        const next = [...assignments];
        next[idx] = value;
        setAssignments(next);
    };

    const isComplete = assignments.every(Boolean);

    useEffect(() => {
        if (!onProgress) return;
        onProgress(assignments);
    }, [assignments, onProgress]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="font-bold mb-2">Clues</h3>
                <ul className="text-sm text-gray-600 space-y-1 brand-secondary-font">
                    {clues.map((clue, idx) => <li key={idx}>{clue}</li>)}
                </ul>
            </div>

            <div className="space-y-3">
                {people.map((person, idx) => (
                    <div key={person} className="flex items-center gap-3">
                        <div className="w-24 text-sm font-semibold">{person}</div>
                        <select
                            value={assignments[idx]}
                            disabled={puzzle.solved}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            className="px-3 py-2 rounded-md border border-gray-300 bg-white"
                        >
                            <option value="">Select pet</option>
                            {pets.map((pet) => <option key={pet} value={pet}>{pet}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            <button
                onClick={() => onSubmit(assignments)}
                disabled={!isComplete || puzzle.solved}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-full self-center transition-colors"
            >
                {puzzle.solved ? 'Solved' : 'Check Solution'}
            </button>
        </div>
    );
};

export default DeductionPuzzle;
