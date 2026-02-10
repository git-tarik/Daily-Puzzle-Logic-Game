import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null, // { id: 'guest', name: 'Guest' }
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginGuest: (state) => {
            state.user = { id: 'guest', name: 'Guest' };
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        },
    },
});

export const { loginGuest, logout } = authSlice.actions;
export default authSlice.reducer;
