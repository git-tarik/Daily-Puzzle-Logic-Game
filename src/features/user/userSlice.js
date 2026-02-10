import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    streak: 0,
    lastPlayed: null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        updateStreak: (state) => {
            state.streak += 1;
        },
        setLastPlayed: (state, action) => {
            state.lastPlayed = action.payload;
        },
    },
});

export const { updateStreak, setLastPlayed } = userSlice.actions;
export default userSlice.reducer;
