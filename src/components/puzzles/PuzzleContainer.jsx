import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDailyPuzzle, submitPuzzleAttempt, clearValidation } from '../../features/puzzles/puzzleSlice';
import SequencePuzzle from './SequencePuzzle';
import MatrixPuzzle from './MatrixPuzzle';
import StatsDashboard from '../stats/StatsDashboard';
import { calculateScore } from '../../engine/scoring'; // for preview
import dayjs from 'dayjs';

const PuzzleContainer = () => {
    const dispatch = useDispatch();
    const { currentPuzzle, status, validationResult, loading, error } = useSelector((state) => state.puzzle);

    // Local state for feedback modal or overlay
    const [showStats, setShowStats] = useState(false);

    // Timer state
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const today = dayjs().format('YYYY-MM-DD');
        dispatch(fetchDailyPuzzle(today));

        // Simple timer: only run if not solved
        let timer;
        if (status !== 'solved') {
            timer = setInterval(() => setSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [dispatch, status]);

    // Clean up validation on unmount
    useEffect(() => {
        return () => { dispatch(clearValidation()); };
    }, [dispatch]);

    if (loading) return <div className="text-center py-20 text-xl font-bold animate-pulse">Loading Puzzle...</div>;
    if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;
    if (!currentPuzzle) return null;

    const renderPuzzle = () => {
        switch (currentPuzzle.type) {
            case 'sequence':
                return <SequencePuzzle puzzle={currentPuzzle} onSubmit={handleSubmit} />;
            case 'matrix':
                return <MatrixPuzzle puzzle={currentPuzzle} onSubmit={handleSubmit} />;
            default:
                return <div>Unknown puzzle type</div>;
        }
    };

    const handleSubmit = (attempt) => {
        // Pass timeTaken to the thunk
        dispatch(submitPuzzleAttempt({ attempt, timeTaken: seconds }));
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Main Game Card */}
            <div className="w-full max-w-2xl p-4 md:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Daily Puzzle
                        </h2>
                        <span className="text-xs text-gray-500 font-mono tracking-wider ml-1 uppercase">
                            {currentPuzzle.type} • {currentPuzzle.dateISO}
                        </span>
                    </div>
                    <div className="text-xl font-mono tabular-nums font-bold text-gray-700 dark:text-gray-300">
                        {currentPuzzle.solved ? (
                            <span className="text-green-500">SOLVED</span>
                        ) : (
                            formatTime(seconds)
                        )}
                    </div>
                </div>

                {/* Puzzle Content */}
                <div className="mb-8 min-h-[300px] flex flex-col justify-center">
                    {renderPuzzle()}
                </div>

                {/* Feedback Section */}
                {validationResult && !validationResult.ok && !currentPuzzle.solved && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-shake">
                        <h3 className="text-red-600 dark:text-red-400 font-bold mb-1">Incorrect</h3>
                        <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                            {validationResult.reasons && validationResult.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Success / Solved State */}
                {currentPuzzle.solved && (
                    <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center animate-bounce-in">
                        <h3 className="text-2xl text-green-600 dark:text-green-400 font-bold mb-2">🎉 Puzzle Solved!</h3>
                        <div className="flex justify-center gap-8 my-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Score</div>
                                <div className="text-xl font-bold text-gray-800 dark:text-white">{currentPuzzle.score}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Time</div>
                                <div className="text-xl font-bold text-gray-800 dark:text-white">{formatTime(currentPuzzle.timeTaken || 0)}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-semibold underline"
                        >
                            {showStats ? 'Hide Stats' : 'View Stats & Heatmap'}
                        </button>
                    </div>
                )}

                {/* Hint Placeholder - Phase 3 Requirement: Logic for Hints */}
                {/* Ideally this button would dispatch a hint action */}
                {!currentPuzzle.solved && (
                    <div className="flex justify-end mt-4">
                        <button className="text-xs text-gray-400 hover:text-indigo-500 transition-colors" title="Hints coming soon!">
                            💡 Need a hint?
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Reveal */}
            {(showStats || currentPuzzle.solved) && (
                <div className="w-full flex justify-center animate-fade-in-up">
                    <StatsDashboard />
                </div>
            )}
        </div>
    );
};

export default PuzzleContainer;
