import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { login, loginGuest, logout } from '../../features/auth/authSlice';
import { getJson, postJson } from '../../lib/apiClient';
import { logger } from '../../lib/logger.js';

const TRUECALLER_MAX_POLL_ATTEMPTS = 20;
const TRUECALLER_POLL_INTERVAL_MS = 3000;

const BrandText = styled.div`
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: var(--bluestock-primary-blue);
`;

const Header = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [showModal, setShowModal] = useState(false);
    const [isTruecallerLoading, setIsTruecallerLoading] = useState(false);

    // Read auth config from env
    const AUTH_MODE = import.meta.env.VITE_AUTH_MODE;
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const TRUECALLER_APP_KEY = import.meta.env.VITE_TRUECALLER_APP_KEY;
    const TRUECALLER_PARTNER_NAME = import.meta.env.VITE_TRUECALLER_PARTNER_NAME || 'LogicLooper';
    const TRUECALLER_LANG = import.meta.env.VITE_TRUECALLER_LANG || 'en';
    const TRUECALLER_PRIVACY_URL = import.meta.env.VITE_TRUECALLER_PRIVACY_URL || window.location.origin;
    const TRUECALLER_TERMS_URL = import.meta.env.VITE_TRUECALLER_TERMS_URL || window.location.origin;

    const openAuthModal = () => {
        setShowModal(true);
    };

    const closeAuthModal = () => {
        setShowModal(false);
        setIsTruecallerLoading(false);
    };

    const handleGuestLogin = () => {
        dispatch(loginGuest());
    };

    const handleLogout = () => {
        dispatch(logout());
        sessionStorage.removeItem('logiclooper_user');
    };

    const handleGoogleResponse = useCallback(async (response) => {
        try {
            const userData = await postJson('/api/auth/google', { credential: response.credential });
            dispatch(login(userData));
            sessionStorage.setItem('logiclooper_user', JSON.stringify(userData));
            closeAuthModal();
        } catch (error) {
            logger.error(error);
            alert('Google Login Failed: ' + error.message);
        }
    }, [dispatch]);

    const stubLogin = (provider = 'google') => {
        const stubUser = {
            id: crypto.randomUUID(),
            email: provider === 'google' ? 'demo@logiclooper.dev' : null,
            phoneNumber: provider === 'truecaller' ? '+919999999999' : null,
            name: provider === 'google' ? 'Demo User' : 'Truecaller Demo User',
            provider,
            createdAt: new Date().toISOString()
        };

        sessionStorage.setItem('logiclooper_user', JSON.stringify(stubUser));
        return stubUser;
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const startTruecallerVerification = (requestId) => {
        const params = new URLSearchParams({
            type: 'btmsheet',
            requestNonce: requestId,
            partnerKey: TRUECALLER_APP_KEY,
            partnerName: TRUECALLER_PARTNER_NAME,
            lang: TRUECALLER_LANG,
            loginPrefix: 'continue',
            loginSuffix: 'signin',
            ctaPrefix: 'continuewith',
            skipOption: 'useanothermethod',
            ttl: '8000',
            privacyUrl: TRUECALLER_PRIVACY_URL,
            termsUrl: TRUECALLER_TERMS_URL,
        });

        window.location.href = `truecallersdk://truesdk/web_verify?${params.toString()}`;
    };

    const pollTruecallerStatus = useCallback(async (requestId) => {
        try {
            for (let attempt = 0; attempt < TRUECALLER_MAX_POLL_ATTEMPTS; attempt += 1) {
                const body = await getJson(`/api/auth/truecaller/status?requestId=${encodeURIComponent(requestId)}`);

                if (body.status === 'authenticated' && body.user) {
                    dispatch(login(body.user));
                    sessionStorage.setItem('logiclooper_user', JSON.stringify(body.user));
                    closeAuthModal();
                    alert('Successfully logged in with Truecaller');
                    return;
                }

                if (body.status === 'rejected') {
                    alert(body.message || 'Truecaller sign in was cancelled.');
                    return;
                }

                if (body.status === 'error') {
                    throw new Error(body.error || 'Truecaller authentication failed.');
                }

                await sleep(TRUECALLER_POLL_INTERVAL_MS);
            }

            alert('Truecaller verification timed out. Please try again.');
        } catch (error) {
            logger.error('Truecaller Poll Error:', error);
            alert('Truecaller Login Failed: ' + error.message);
        } finally {
            setIsTruecallerLoading(false);
        }
    }, [dispatch]);

    const handleTruecallerLogin = async () => {
        if (!TRUECALLER_APP_KEY) {
            alert('Truecaller app key is missing. Set VITE_TRUECALLER_APP_KEY.');
            return;
        }

        if (!/android/i.test(navigator.userAgent)) {
            alert('Truecaller sign in is currently supported on Android devices only.');
            return;
        }

        const requestId = crypto.randomUUID();
        setIsTruecallerLoading(true);

        // Start polling before triggering the app-switch deep link.
        pollTruecallerStatus(requestId);
        startTruecallerVerification(requestId);
    };

    const handleLogin = (provider) => {
        if (AUTH_MODE === 'stub') {
            const stubUser = stubLogin(provider);
            dispatch(login(stubUser));
            closeAuthModal();
            return;
        }

        if (provider === 'google' && !window.google) {
            alert('Google Sign-In script not loaded yet. Please wait...');
            return;
        }

        if (provider === 'truecaller') {
            handleTruecallerLogin();
        }
    };

    useEffect(() => {
        if (!showModal || AUTH_MODE === 'stub') {
            return;
        }

        const initGoogle = () => {
            if (window.google && GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse
                });

                const btn = document.getElementById('googleBtn');
                if (btn) {
                    try {
                        window.google.accounts.id.renderButton(btn, {
                            theme: 'outline',
                            size: 'large',
                            width: '350'
                        });
                    } catch (e) {
                        logger.error('Google Render Error:', e);
                    }
                }
            }
        };

        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initGoogle;
            document.head.appendChild(script);
        } else {
            initGoogle();
        }
    }, [showModal, AUTH_MODE, GOOGLE_CLIENT_ID, handleGoogleResponse]);

    const Modal = () => createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-xl border border-gray-300 w-[400px] max-w-[90%] p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Sign In</h2>

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
                            <div id="googleBtn" className="w-full flex justify-center min-h-[40px]"></div>
                            <button
                                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded transition-colors font-medium"
                                onClick={() => handleLogin('truecaller')}
                                disabled={isTruecallerLoading || !TRUECALLER_APP_KEY}
                            >
                                {isTruecallerLoading ? 'Waiting for Truecaller...' : 'Sign in with Truecaller'}
                            </button>
                        </>
                    )}
                </div>

                <button
                    onClick={closeAuthModal}
                    className="mt-6 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>,
        document.body
    );

    return (
        <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <BrandText>
                    <i className="bi bi-grid-3x3-gap-fill mr-2" aria-hidden="true"></i>
                    Logic Looper
                </BrandText>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700">Hello, {user?.name || user?.email || 'User'}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition-colors text-gray-700"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGuestLogin}
                                className="text-sm px-3 py-1.5 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                            >
                                Continue as Guest
                            </button>
                            <button
                                onClick={openAuthModal}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
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
