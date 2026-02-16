import authReducer, { login, loginGuest, logout } from '../features/auth/authSlice';
import userReducer, { setLastPlayed, updateStreak } from '../features/user/userSlice';

describe('state reducers', () => {
    test('auth reducer handles login/logout lifecycle', () => {
        const loggedIn = authReducer(undefined, login({ id: 'u1', name: 'T' }));
        expect(loggedIn.isAuthenticated).toBe(true);
        expect(loggedIn.user.id).toBe('u1');

        const guest = authReducer(loggedIn, loginGuest());
        expect(guest.user.id).toBe('guest');

        const loggedOut = authReducer(guest, logout());
        expect(loggedOut.isAuthenticated).toBe(false);
        expect(loggedOut.user).toBeNull();
    });

    test('user reducer updates streak and last played', () => {
        const withStreak = userReducer(undefined, updateStreak());
        expect(withStreak.streak).toBe(1);

        const withDate = userReducer(withStreak, setLastPlayed('2026-02-16'));
        expect(withDate.lastPlayed).toBe('2026-02-16');
    });
});
