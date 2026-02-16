import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDailyPuzzle,
    submitPuzzleAttempt,
    clearValidation,
    requestHint,
    saveProgress
} from '../../features/puzzles/puzzleSlice';
import SequencePuzzle from './SequencePuzzle';
import MatrixPuzzle from './MatrixPuzzle';
import PatternPuzzle from './PatternPuzzle';
import DeductionPuzzle from './DeductionPuzzle';
import BinaryPuzzle from './BinaryPuzzle';
import StatsDashboard from '../stats/StatsDashboard';
import dayjs from 'dayjs';

const PuzzleContainer = () => {
    const dispatch = useDispatch();
    const {
        currentPuzzle,
        status,
        validationResult,
        activeHint,
        loading,
        error
    } = useSelector((state) => state.puzzle);

    const [showStats, setShowStats] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [timedMode, setTimedMode] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadChallengeOrToday = async () => {
            const params = new URLSearchParams(window.location.search);
            const challengePayload = params.get('challenge');
            if (challengePayload) {
                try {
                    const parsed = JSON.parse(decodeURIComponent(challengePayload));
                    if (parsed?.dateISO) {
                        await dispatch(fetchDailyPuzzle(parsed.dateISO)).unwrap();
                        if (parsed.gameState != null) {
                            dispatch(saveProgress(parsed.gameState));
                        }
                        return;
                    }
                } catch {
                    // Ignore malformed challenge links.
                }
            }

            dispatch(fetchDailyPuzzle(dayjs().format('YYYY-MM-DD')));
        };

        loadChallengeOrToday();
    }, [dispatch]);

    useEffect(() => {
        if (status === 'solved') return undefined;
        const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(timer);
    }, [status]);

    useEffect(() => () => {
        dispatch(clearValidation());
    }, [dispatch]);

    const handleSubmit = useCallback((attempt) => {
        dispatch(submitPuzzleAttempt({ attempt, timeTaken: seconds, timedMode }));
    }, [dispatch, seconds, timedMode]);

    const handleHint = useCallback(() => {
        dispatch(requestHint());
    }, [dispatch]);

    const handleProgress = useCallback((gameState) => {
        dispatch(saveProgress(gameState));
    }, [dispatch]);

    const handleShareChallenge = async () => {
        if (!currentPuzzle) return;
        const payload = encodeURIComponent(JSON.stringify({
            dateISO: currentPuzzle.dateISO,
            type: currentPuzzle.type,
            gameState: currentPuzzle.gameState
        }));
        const url = `${window.location.origin}${window.location.pathname}?challenge=${payload}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            setCopied(false);
        }
    };

    if (loading && !currentPuzzle) return <div className="text-center py-20 text-xl font-bold animate-pulse">Loading Puzzle...</div>;
    if (error && !currentPuzzle) return <div className="text-center py-20 text-red-500">Error: {error}</div>;
    if (!currentPuzzle) return null;

    const renderPuzzle = () => {
        switch (currentPuzzle.type) {
            case 'sequence':
                return <SequencePuzzle key={currentPuzzle.id} puzzle={currentPuzzle} onSubmit={handleSubmit} onProgress={handleProgress} />;
            case 'matrix':
                return <MatrixPuzzle key={currentPuzzle.id} puzzle={currentPuzzle} onSubmit={handleSubmit} onProgress={handleProgress} />;
            case 'pattern':
                return <PatternPuzzle key={currentPuzzle.id} puzzle={currentPuzzle} onSubmit={handleSubmit} onProgress={handleProgress} />;
            case 'deduction':
                return <DeductionPuzzle key={currentPuzzle.id} puzzle={currentPuzzle} onSubmit={handleSubmit} onProgress={handleProgress} />;
            case 'binary':
                return <BinaryPuzzle key={currentPuzzle.id} puzzle={currentPuzzle} onSubmit={handleSubmit} onProgress={handleProgress} />;
            default:
                return <div>Unknown puzzle type</div>;
        }
    };

    const formatTime = (value) => {
        const m = Math.floor(value / 60);
        const s = value % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-full max-w-2xl p-4 md:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl relative overflow-hidden">
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                            Daily Puzzle
                        </h2>
                        <span className="text-xs text-gray-500 font-mono tracking-wider ml-1 uppercase">
                            {currentPuzzle.type} | {currentPuzzle.dateISO} | D{currentPuzzle.difficulty || 1}
                        </span>
                    </div>
                    <div className="text-xl font-mono tabular-nums font-bold text-gray-700 dark:text-gray-300">
                        {currentPuzzle.solved ? <span className="text-green-500">SOLVED</span> : formatTime(seconds)}
                    </div>
                </div>

                <div className="mb-6 flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={timedMode}
                            onChange={(e) => setTimedMode(e.target.checked)}
                            disabled={currentPuzzle.solved}
                        />
                        Timed Mode (+50 if solved in 3:00)
                    </label>
                    <button
                        onClick={handleShareChallenge}
                        className="text-xs px-3 py-1 border rounded border-gray-300 dark:border-gray-600"
                    >
                        {copied ? 'Copied!' : 'Copy Challenge Link'}
                    </button>
                </div>

                <div className="mb-8 min-h-[300px] flex flex-col justify-center">
                    {renderPuzzle()}
                </div>

                {validationResult && !validationResult.ok && !currentPuzzle.solved && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h3 className="text-red-600 dark:text-red-400 font-bold mb-1">Incorrect</h3>
                        <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                            {validationResult.reasons?.map((reason, idx) => <li key={idx}>{reason}</li>)}
                        </ul>
                    </div>
                )}

                {activeHint && !currentPuzzle.solved && (
                    <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                        Hint: {activeHint}
                    </div>
                )}

                {currentPuzzle.solved && (
                    <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                        <h3 className="text-2xl text-green-600 dark:text-green-400 font-bold mb-2">Puzzle Solved</h3>
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
                            {showStats ? 'Hide Stats' : 'View Stats and Heatmap'}
                        </button>
                    </div>
                )}

                {!currentPuzzle.solved && (
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleHint}
                            disabled={currentPuzzle.hintsUsed >= 3}
                            className="text-xs text-gray-500 hover:text-indigo-500 disabled:text-gray-300 transition-colors"
                        >
                            Need a hint? ({currentPuzzle.hintsUsed}/3)
                        </button>
                    </div>
                )}
            </div>

            {(showStats || currentPuzzle.solved) && (
                <div className="w-full flex justify-center animate-fade-in-up">
                    <StatsDashboard />
                </div>
            )}
        </div>
    );
};

export default PuzzleContainer;
