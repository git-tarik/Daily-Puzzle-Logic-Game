import React, { useEffect, useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import PuzzleContainer from './components/puzzles/PuzzleContainer';
import { getUser, saveUser } from './lib/db';
import { useDispatch } from 'react-redux';
import { login } from './features/auth/authSlice';

function App() {
  const dispatch = useDispatch();
  const [view, setView] = useState('home'); // 'home' | 'puzzle'

  useEffect(() => {
    const initUser = async () => {
      // Check for stub user persistence
      if (import.meta.env.VITE_AUTH_MODE === 'stub') {
        const stubUserStr = localStorage.getItem("logiclooper_user");
        if (stubUserStr) {
          try {
            const stubUser = JSON.parse(stubUserStr);
            dispatch(login(stubUser));
          } catch (e) {
            console.error("Failed to parse stub user", e);
          }
        }
      }

      // Environment check (Verification only)
      console.log('Env Check:', {
        google: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
        truecaller: import.meta.env.VITE_TRUECALLER_APP_KEY ? 'Set' : 'Not Set'
      });

      let user = await getUser();
      if (!user) {
        // Create initial guest user if none exists
        user = {
          idLocal: crypto.randomUUID(),
          guestName: 'Guest',
          streakCount: 0,
          lastPlayedISO: null,
          heatmap: []
        };
        await saveUser(user);
      }
    };

    initUser();
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200 font-inter">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === 'home' && <Home onStart={() => setView('puzzle')} />}
        {view === 'puzzle' && (
          <div>
            <button
              onClick={() => setView('home')}
              className="mb-4 text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1"
            >
              ← Back to Home
            </button>
            <PuzzleContainer />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
