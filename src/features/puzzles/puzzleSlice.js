import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentPuzzle: null,
    status: 'idle', // idle, loading, solved
};

const puzzleSlice = createSlice({
    name: 'puzzle',
    initialState,
    reducers: {
        setPuzzle: (state, action) => {
            state.currentPuzzle = action.payload;
            state.status = 'idle';
        },
        solvePuzzle: (state) => {
            if (state.currentPuzzle) {
                state.status = 'solved';
            }
        },
    },
});

export const { setPuzzle, solvePuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;
