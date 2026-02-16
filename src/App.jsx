import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { getUser, saveUser } from './lib/db';
import { login } from './features/auth/authSlice';
import { useDailyReset } from './hooks/useDailyReset';
import { ensurePuzzleWindow } from './lib/puzzleWindowManager';
import dayjs from 'dayjs';
import { initializeBatchSync } from './lib/batchSync';
import { logger } from './lib/logger.js';

const Home = lazy(() => import('./pages/Home'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PuzzleContainer = lazy(() => import('./components/puzzles/PuzzleContainer'));

function App() {
    const dispatch = useDispatch();
    const [view, setView] = useState(() => (
        new URLSearchParams(window.location.search).has('challenge') ? 'puzzle' : 'home'
    ));
    const [path, setPath] = useState(window.location.pathname.toLowerCase());

    useDailyReset();

    useEffect(() => {
        const initUser = async () => {
            if (import.meta.env.VITE_AUTH_MODE === 'stub') {
                const stubUserStr = sessionStorage.getItem('logiclooper_user');
                if (stubUserStr) {
                    try {
                        dispatch(login(JSON.parse(stubUserStr)));
                    } catch (err) {
                        logger.error('Failed to parse stub user', err);
                    }
                }
            }

            let user = await getUser();
            if (!user) {
                user = {
                    idLocal: crypto.randomUUID(),
                    guestName: 'Guest',
                    streakCount: 0,
                    lastPlayedISO: null,
                    heatmap: [],
                    totalScore: 0,
                    unlockedAchievements: [],
                    puzzlesSolved: 0,
                    avgSolveTime: 0
                };
                await saveUser(user);
            }

            await ensurePuzzleWindow(dayjs().format('YYYY-MM-DD'));
        };

        initUser();
    }, [dispatch]);

    useEffect(() => initializeBatchSync(), []);

    useEffect(() => {
        const onPopState = () => setPath(window.location.pathname.toLowerCase());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <Suspense fallback={<div className="py-16 text-center text-sm text-gray-500">Loading...</div>}>
                    {path === '/privacy' && <PrivacyPolicy />}
                    {path === '/terms' && <TermsOfService />}
                    {path !== '/privacy' && path !== '/terms' && (
                        <>
                            {view === 'home' && <Home onStart={() => setView('puzzle')} />}
                            {view === 'puzzle' && (
                                <div>
                                    <button
                                        onClick={() => setView('home')}
                                        className="mb-4 text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                                    >
                                        Back to Home
                                    </button>
                                    <PuzzleContainer />
                                </div>
                            )}
                        </>
                    )}
                </Suspense>
            </main>
            <Footer />
        </div>
    );
}

export default App;
