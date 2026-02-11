import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, loginGuest, logout } from '../../features/auth/authSlice';
import { getApiUrl } from '../../lib/api';

const Header = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [showModal, setShowModal] = useState(false);

    // Read AUTH_MODE from env
    const AUTH_MODE = import.meta.env.VITE_AUTH_MODE;
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Credentials State
    const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
    const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCredentialsLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (authTab === 'register') {
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match");
                setLoading(false);
                return;
            }
        }

        const endpoint = authTab === 'login' ? getApiUrl('/api/auth/login') : getApiUrl('/api/auth/register');

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            dispatch(login(data));
            localStorage.setItem("logiclooper_user", JSON.stringify(data));
            closeAuthModal();
            // Reset form
            setFormData({ username: '', password: '', confirmPassword: '' });
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = () => {
        dispatch(loginGuest());
    };

    const handleLogout = () => {
        dispatch(logout());
        localStorage.removeItem('logiclooper_user');
    };

    const openAuthModal = () => {
        setShowModal(true);
    };

    const closeAuthModal = () => {
        setShowModal(false);
    };

    // -- REAL AUTH HANDLERS --
    const handleGoogleResponse = async (response) => {
        try {
            const res = await fetch(getApiUrl('/api/auth/google'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Google Auth Failed');
            }

            const userData = await res.json();
            dispatch(login(userData));
            localStorage.setItem("logiclooper_user", JSON.stringify(userData));
            closeAuthModal();
        } catch (error) {
            console.error(error);
            alert('Google Login Failed: ' + error.message);
        }
    };

    // -- STUB AUTH --
    const stubLogin = (provider = "google") => {
        const user = {
            id: crypto.randomUUID(),
            email: provider === "google" ? "demo@logiclooper.dev" : null,
            name: provider === "google" ? "Demo User" : "Truecaller User",
            provider,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem("logiclooper_user", JSON.stringify(user));
        return user;
    }

    const handleLogin = (provider) => {
        if (AUTH_MODE === "stub") {
            const user = stubLogin(provider);
            dispatch(login(user));
            closeAuthModal();
            return;
        }

        // Real Auth Flow
        if (provider === 'google') {
            if (!window.google) {
                alert("Google Sign-In script not loaded yet. Please wait...");
                return;
            }
        } else if (provider === 'truecaller') {
            alert('Truecaller Real Auth requires SDK setup.');
        }
    };

    // Effect to render Google Button when modal opens if in real mode
    useEffect(() => {
        if (showModal && AUTH_MODE !== 'stub') {
            const initGoogle = () => {
                if (window.google && GOOGLE_CLIENT_ID) {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleGoogleResponse
                    });
                    const btn = document.getElementById('googleBtn');
                    if (btn) {
                        try {
                            window.google.accounts.id.renderButton(
                                btn,
                                { theme: "outline", size: "large", width: "350" }
                            );
                        } catch (e) {
                            console.error("Google Render Error:", e);
                        }
                    }
                }
            };

            if (!window.google) {
                const script = document.createElement('script');
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = initGoogle;
                document.head.appendChild(script);
            } else {
                initGoogle();
            }
        }
    }, [showModal, AUTH_MODE]);

    const Modal = () => createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[400px] max-w-[90%] p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Sign In</h2>
                <div className="flex flex-col gap-3">
                    {AUTH_MODE === 'stub' ? (
                        <>
                            <button
                                className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded transition-colors font-medium"
                                onClick={() => handleLogin('google')}
                            >
                                Sign in with Google (Stub)
                            </button>
                            <button
                                className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors font-medium"
                                onClick={() => handleLogin('truecaller')}
                            >
                                Sign in with Truecaller (Stub)
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Google Button Container */}
                            <div id="googleBtn" className="w-full flex justify-center min-h-[40px]"></div>

                            {/* Truecaller button placeholder */}
                            <button
                                className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors font-medium"
                                onClick={() => handleLogin('truecaller')}
                            >
                                Sign in with Truecaller
                            </button>
                        </>
                    )}
                </div>
                <button
                    onClick={closeAuthModal}
                    className="mt-6 w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>,
        document.body
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
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Hello, {user?.name || user?.email || 'User'}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200"
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
