import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { calculateScore } from '../../engine/scoring.js';
import { checkAchievements } from '../../engine/achievements.js';
import { validatePuzzle } from '../../engine/generatePuzzle';
import { savePuzzle, getUser, saveUser } from '../../lib/db';
import { DAILY_HINT_LIMIT, getPuzzleHint } from '../../engine/hints';
import dayjs from 'dayjs';
import { queueScoreForSync } from '../../lib/batchSync';
import { loadPuzzleWithWindow } from '../../lib/puzzleWindowManager';

// Thunks
export const fetchDailyPuzzle = createAsyncThunk(
    'puzzle/fetchDaily',
    async (dateISO, { rejectWithValue }) => {
        try {
            const puzzle = await loadPuzzleWithWindow(dateISO);
            return puzzle;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const submitPuzzleAttempt = createAsyncThunk(
    'puzzle/submitAttempt',
    async ({ attempt, timeTaken = 0, timedMode = false }, { getState }) => {
        const state = getState();
        const { currentPuzzle } = state.puzzle;

        if (!currentPuzzle) throw new Error("No active puzzle");

        // Validate
        const result = validatePuzzle(currentPuzzle.type, currentPuzzle, attempt);

        // Update Puzzle State
        const updatedPuzzle = {
            ...currentPuzzle,
            attempts: [...currentPuzzle.attempts, { timestamp: new Date().toISOString(), value: attempt, success: result.ok }],
            solved: result.ok,
            gameState: attempt // Persist the latest state
        };

        await savePuzzle(updatedPuzzle);

        // If solved and not previously solved, update User Stats & Score
        if (result.ok && !currentPuzzle.solved) {
            const user = await getUser();
            if (user) {
                const today = dayjs().format('YYYY-MM-DD');
                const lastPlayed = user.lastPlayedISO ? dayjs(user.lastPlayedISO).format('YYYY-MM-DD') : null;

                // Streak logic
                let newStreak = user.streakCount;
                if (lastPlayed) {
                    const diff = dayjs(today).diff(dayjs(lastPlayed), 'day');
                    if (diff === 1) newStreak++;
                    else if (diff > 1) newStreak = 1;
                } else {
                    newStreak = 1;
                }

                // Calculate Score
                // Time taken is roughly now - puzzle load time? Or just track it in UI and pass it?
                // Phase 3 requirement says "timeBonus = max(0, 100 - minutesTaken * 2)"
                // attempt.timestamp is set here. But we need start time.
                // Let's assume passed in payload or calculate diff if we stored start time.
                // For now, let's use a passed-in `timeTaken` from the UI or just 0 if missing.
                // We'll update the component to pass it.

                const { finalScore, breakdown } = calculateScore({
                    difficulty: currentPuzzle.difficulty || 1,
                    timeTakenSeconds: timeTaken,
                    hintsUsed: currentPuzzle.hintsUsed,
                    streak: newStreak,
                    timedMode
                });

                // Check Achievements
                const puzzleOutcome = {
                    solved: true,
                    hintsUsed: currentPuzzle.hintsUsed,
                    timeTaken
                };
                const newAchievements = checkAchievements({ ...user, streakCount: newStreak }, puzzleOutcome);

                // Update User
                await saveUser({
                    ...user,
                    streakCount: newStreak,
                    lastPlayedISO: new Date().toISOString(),
                    heatmap: [...(user.heatmap || []), today],
                    totalScore: (user.totalScore || 0) + finalScore,
                    puzzlesSolved: (user.puzzlesSolved || 0) + 1,
                    avgSolveTime: (() => {
                        const solvedSoFar = user.puzzlesSolved || 0;
                        const prevAvg = user.avgSolveTime || 0;
                        return Math.round(((prevAvg * solvedSoFar) + timeTaken) / (solvedSoFar + 1));
                    })(),
                    unlockedAchievements: [...(user.unlockedAchievements || []), ...newAchievements]
                });

                // Update Puzzle with Score
                updatedPuzzle.score = finalScore;
                updatedPuzzle.timeTaken = timeTaken;
                await savePuzzle(updatedPuzzle);

                const authUser = state.auth?.user;
                const isGuest = authUser?.id === 'guest';
                if (authUser?.id && !isGuest) {
                    await queueScoreForSync({
                        userId: authUser.id,
                        dateISO: currentPuzzle.dateISO,
                        puzzleType: currentPuzzle.type,
                        timeTaken,
                        attempt,
                        solutionProof: currentPuzzle.solutionHash,
                        difficulty: currentPuzzle.difficulty || 1,
                        hintsUsed: currentPuzzle.hintsUsed || 0,
                        timedMode
                    });
                }

                // Return extra info for UI
                return { result, updatedPuzzle, newAchievements, scoreBreakdown: breakdown, finalScore };
            }
        }

        return { result, updatedPuzzle };
    }
);

export const requestHint = createAsyncThunk(
    'puzzle/requestHint',
    async (_, { getState, rejectWithValue }) => {
        const state = getState();
        const puzzle = state.puzzle.currentPuzzle;
        if (!puzzle) return rejectWithValue('No puzzle loaded');
        if (puzzle.hintsUsed >= DAILY_HINT_LIMIT) {
            return rejectWithValue(`Daily hint limit reached (${DAILY_HINT_LIMIT})`);
        }

        const updatedPuzzle = {
            ...puzzle,
            hintsUsed: puzzle.hintsUsed + 1
        };
        await savePuzzle(updatedPuzzle);

        return {
            updatedPuzzle,
            hint: getPuzzleHint(updatedPuzzle)
        };
    }
);

export const saveProgress = createAsyncThunk(
    'puzzle/saveProgress',
    async (gameState, { getState }) => {
        const state = getState();
        const { currentPuzzle } = state.puzzle;
        if (!currentPuzzle) return;

        const existing = currentPuzzle.gameState ?? null;
        const incoming = gameState ?? null;
        if (JSON.stringify(existing) === JSON.stringify(incoming)) {
            return null;
        }

        const updatedPuzzle = {
            ...currentPuzzle,
            gameState
        };
        await savePuzzle(updatedPuzzle);
        return updatedPuzzle;
    }
);

const initialState = {
    currentPuzzle: null,
    status: 'idle', // idle, loading, solved, failed
    validationResult: null, // { ok, reasons }
    activeHint: null,
    loading: false,
    error: null
};

const puzzleSlice = createSlice({
    name: 'puzzle',
    initialState,
    reducers: {
        clearValidation: (state) => {
            state.validationResult = null;
        },
        clearHint: (state) => {
            state.activeHint = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDailyPuzzle.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDailyPuzzle.fulfilled, (state, action) => {
                state.loading = false;
                state.currentPuzzle = action.payload;
                state.activeHint = null;
                if (action.payload.solved) state.status = 'solved';
                else state.status = 'idle';
            })
            .addCase(fetchDailyPuzzle.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(submitPuzzleAttempt.pending, (state) => {
                state.error = null;
                // Don't set loading=true here to avoid flickering logic, or do?
                // Usually for submission we might want a spinner.
            })
            .addCase(submitPuzzleAttempt.fulfilled, (state, action) => {
                state.currentPuzzle = action.payload.updatedPuzzle;
                state.validationResult = action.payload.result;
                if (action.payload.result.ok) {
                    state.status = 'solved';
                }
            })
            .addCase(submitPuzzleAttempt.rejected, (state, action) => {
                state.error = action.error.message || "Submission failed";
                state.validationResult = { ok: false, reasons: [state.error] }; // fallback
            })
            .addCase(saveProgress.fulfilled, (state, action) => {
                if (action.payload) {
                    state.currentPuzzle = action.payload;
                }
            })
            .addCase(requestHint.fulfilled, (state, action) => {
                state.currentPuzzle = action.payload.updatedPuzzle;
                state.activeHint = action.payload.hint;
                state.error = null;
            })
            .addCase(requestHint.rejected, (state, action) => {
                state.error = action.payload || action.error.message || 'Unable to get hint';
            });
    },
});

export const { clearValidation, clearHint } = puzzleSlice.actions;
export default puzzleSlice.reducer;
