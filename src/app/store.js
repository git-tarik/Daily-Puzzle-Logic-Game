import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import userReducer from '../features/user/userSlice';
import puzzleReducer from '../features/puzzles/puzzleSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        user: userReducer,
        puzzle: puzzleReducer,
    },
});
