import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PuzzleContainer from './components/puzzles/PuzzleContainer';
import { getUser, saveUser } from './lib/db';
import { login } from './features/auth/authSlice';
import { useDailyReset } from './hooks/useDailyReset';
import { preGenerateYearPuzzles } from './features/puzzles/puzzleSlice';

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
                const stubUserStr = localStorage.getItem('logiclooper_user');
                if (stubUserStr) {
                    try {
                        dispatch(login(JSON.parse(stubUserStr)));
                    } catch (err) {
                        console.error('Failed to parse stub user', err);
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

            // Warm up 365 daily puzzles in local IndexedDB for offline-first play.
            dispatch(preGenerateYearPuzzles());
        };

        initUser();
    }, [dispatch]);

    useEffect(() => {
        const onPopState = () => setPath(window.location.pathname.toLowerCase());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
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
            </main>
            <Footer />
        </div>
    );
}

export default App;
