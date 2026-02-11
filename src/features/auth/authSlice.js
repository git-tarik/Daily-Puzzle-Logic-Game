import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null, // { id: 'guest', name: 'Guest' }
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
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

export const { login, loginGuest, logout } = authSlice.actions;
export default authSlice.reducer;
