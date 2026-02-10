import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginGuest, logout } from '../../features/auth/authSlice';

const Header = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [showModal, setShowModal] = useState(false);

    const handleGuestLogin = () => {
        dispatch(loginGuest());
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const openAuthModal = () => {
        setShowModal(true);
    };

    const closeAuthModal = () => {
        setShowModal(false);
    };

    const Modal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96 max-w-full m-4">
                <h2 className="text-xl font-bold mb-4">Sign In</h2>
                <div className="flex flex-col gap-3">
                    <button
                        className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        onClick={() => alert('Google Sign-In Stub')}
                    >
                        Sign in with Google
                    </button>
                    <button
                        className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        onClick={() => alert('Truecaller Sign-In Stub')}
                    >
                        Sign in with Truecaller
                    </button>
                </div>
                <button
                    onClick={closeAuthModal}
                    className="mt-6 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Cancel
                </button>
            </div>
        </div>
    );

    return (
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                    Logic Looper
                </div>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">Hello, {user?.name}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGuestLogin}
                                className="text-sm px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                            >
                                Continue as Guest
                            </button>
                            <button
                                onClick={openAuthModal}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                Sign In
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {showModal && <Modal />}
        </header>
    );
};

export default Header;
