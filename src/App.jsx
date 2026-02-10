import React, { useEffect } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import { db, getUser, saveUser } from './lib/db';
import { useDispatch } from 'react-redux';
import { loginGuest } from './features/auth/authSlice';
import { updateStreak, setLastPlayed } from './features/user/userSlice';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const initUser = async () => {
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

      // Hydrate state (simplified for Phase 1)
      // In real app we'd dispatch(setUser(user))
    };

    initUser();
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200 font-inter">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Home />
      </main>
      <Footer />
    </div>
  );
}

export default App;
