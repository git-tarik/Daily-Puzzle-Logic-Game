import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { calculateScore } from '../../engine/scoring.js';
import { checkAchievements } from '../../engine/achievements.js';
import { generatePuzzle, validatePuzzle } from '../../engine/generatePuzzle';
import { getPuzzle, savePuzzle, getUser, saveUser } from '../../lib/db';
import dayjs from 'dayjs';

// Thunks
export const fetchDailyPuzzle = createAsyncThunk(
    'puzzle/fetchDaily',
    async (dateISO, { rejectWithValue }) => {
        try {
            // 1. Try to load from DB
            let puzzle = await getPuzzle(dateISO);

            if (!puzzle) {
                // 2. Generate new if not found
                // Deterministically decide type based on date? Or just random for now?
                // Requirement: "Same date + type -> identical puzzle". 
                // We need to decide the type deterministically too if we want everyone to have the same puzzle type on the same day.
                // Let's alternate or hash the date to pick type.
                const dayOfMonth = dayjs(dateISO).date();
                const type = dayOfMonth % 2 === 0 ? 'matrix' : 'sequence'; // Simple deterministic type selection

                const generated = generatePuzzle(dateISO, type);

                puzzle = {
                    dateISO,
                    ...generated,
                    progress: 0,
                    solved: false,
                    attempts: [],
                    hintsUsed: 0,
                    gameState: null // For Matrix: current grid state; For Sequence: current inputs
                };

                await savePuzzle(puzzle);
            }

            return puzzle;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const submitPuzzleAttempt = createAsyncThunk(
    'puzzle/submitAttempt',
    async ({ attempt, userState }, { getState, dispatch }) => {
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

                const timeTaken = attempt.timeTaken || 0;

                const { finalScore, breakdown } = calculateScore({
                    difficulty: 1, // Phase 3: "difficulty * 100", assume 1 for now or derive from type matrix=2?
                    timeTakenSeconds: timeTaken,
                    hintsUsed: currentPuzzle.hintsUsed,
                    streak: newStreak
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
                    unlockedAchievements: [...(user.unlockedAchievements || []), ...newAchievements]
                });

                // Update Puzzle with Score
                updatedPuzzle.score = finalScore;
                updatedPuzzle.timeTaken = timeTaken;
                await savePuzzle(updatedPuzzle);

                // Return extra info for UI
                return { result, updatedPuzzle, newAchievements, scoreBreakdown: breakdown, finalScore };
            }
        }

        return { result, updatedPuzzle };
    }
);

export const saveProgress = createAsyncThunk(
    'puzzle/saveProgress',
    async (gameState, { getState }) => {
        const state = getState();
        const { currentPuzzle } = state.puzzle;
        if (!currentPuzzle) return;

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
    loading: false,
    error: null
};

const puzzleSlice = createSlice({
    name: 'puzzle',
    initialState,
    reducers: {
        clearValidation: (state) => {
            state.validationResult = null;
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
                if (action.payload.solved) state.status = 'solved';
                else state.status = 'idle';
            })
            .addCase(fetchDailyPuzzle.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(submitPuzzleAttempt.fulfilled, (state, action) => {
                state.currentPuzzle = action.payload.updatedPuzzle;
                state.validationResult = action.payload.result;
                if (action.payload.result.ok) {
                    state.status = 'solved';
                }
            })
            .addCase(saveProgress.fulfilled, (state, action) => {
                if (action.payload) {
                    state.currentPuzzle = action.payload;
                }
            });
    },
});

export const { clearValidation } = puzzleSlice.actions;
export default puzzleSlice.reducer;
