import React, { useEffect, useState } from 'react';
import { getUser } from '../../lib/db';
import Heatmap from './Heatmap';
import AchievementsList from './AchievementsList';

const StatsDashboard = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Poll for user updates (simple way to keep stats fresh without complex subscriptions yet)
        // In real app, put user in Redux or Context
        const load = async () => {
            const u = await getUser();
            setUser(u);
        };
        load();

        // Listen for storage events or just poll
        const interval = setInterval(load, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!user) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 w-full max-w-4xl">
            {/* Left Col: Core Stats & Heatmap */}
            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {user.streakCount || 0}
                        </div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Day Streak
                        </div>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                            {user.totalScore || 0}
                        </div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Total Score
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <Heatmap heatmap={user.heatmap} />
                </div>
            </div>

            {/* Right Col: Achievements */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <AchievementsList unlockedIds={user.unlockedAchievements} />
            </div>
        </div>
    );
};

export default StatsDashboard;
