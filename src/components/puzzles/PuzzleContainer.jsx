import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDailyPuzzle,
    submitPuzzleAttempt,
    clearValidation,
    requestHint,
    saveProgress
} from '../../features/puzzles/puzzleSlice';
import dayjs from 'dayjs';

const SequencePuzzle = lazy(() => import('./SequencePuzzle'));
const MatrixPuzzle = lazy(() => import('./MatrixPuzzle'));
const PatternPuzzle = lazy(() => import('./PatternPuzzle'));
const DeductionPuzzle = lazy(() => import('./DeductionPuzzle'));
const BinaryPuzzle = lazy(() => import('./BinaryPuzzle'));
const StatsDashboard = lazy(() => import('../stats/StatsDashboard'));

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

    if (loading && !currentPuzzle) return <div className="text-center py-20 text-xl font-bold">Loading Puzzle...</div>;
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
            <div className="w-full max-w-2xl p-4 md:p-8 bg-white rounded-2xl border border-gray-200 relative overflow-hidden">
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-600">
                            Daily Puzzle
                        </h2>
                        <span className="text-xs text-gray-500 font-mono tracking-wider ml-1 uppercase">
                            {currentPuzzle.type} | {currentPuzzle.dateISO} | D{currentPuzzle.difficulty || 1}
                        </span>
                    </div>
                    <div className="text-xl font-mono tabular-nums font-bold text-gray-700">
                        {currentPuzzle.solved ? <span className="text-green-500">SOLVED</span> : formatTime(seconds)}
                    </div>
                </div>

                <div className="mb-6 flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600 flex items-center gap-2 brand-secondary-font">
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
                        className="text-xs px-3 py-1 border rounded border-gray-300"
                    >
                        {copied ? 'Copied!' : 'Copy Challenge Link'}
                    </button>
                </div>

                <div className="mb-8 min-h-[300px] flex flex-col justify-center">
                    <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading puzzle UI...</div>}>
                        {renderPuzzle()}
                    </Suspense>
                </div>

                {validationResult && !validationResult.ok && !currentPuzzle.solved && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h3 className="text-red-600 font-bold mb-1">Incorrect</h3>
                        <ul className="list-disc list-inside text-sm text-red-600">
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
                    <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                        <h3 className="text-2xl text-green-600 font-bold mb-2">Puzzle Solved</h3>
                        <div className="flex justify-center gap-8 my-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Score</div>
                                <div className="text-xl font-bold text-gray-800">{currentPuzzle.score}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase">Time</div>
                                <div className="text-xl font-bold text-gray-800">{formatTime(currentPuzzle.timeTaken || 0)}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold underline"
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
                <div className="w-full flex justify-center">
                    <Suspense fallback={<div className="text-sm text-gray-500">Loading stats...</div>}>
                        <StatsDashboard />
                    </Suspense>
                </div>
            )}
        </div>
    );
};

export default PuzzleContainer;
