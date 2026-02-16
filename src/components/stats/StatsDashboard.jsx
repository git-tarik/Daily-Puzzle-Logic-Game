import React, { useEffect, useMemo, useState } from 'react';
import { getUser } from '../../lib/db';
import { DAILY_ACTIVITY_CHANGE_EVENT, getAllDailyActivity } from '../../lib/dailyActivityDb';
import { buildActivityMap, calculateStreak } from '../../lib/heatmapUtils';
import Heatmap from './Heatmap';
import AchievementsList from './AchievementsList';
import Leaderboard from './Leaderboard';

const StatsDashboard = () => {
    const [user, setUser] = useState(null);
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        const load = async () => {
            const [u, a] = await Promise.all([getUser(), getAllDailyActivity()]);
            setUser(u);
            setActivities(a);
        };
        load();

        const interval = setInterval(load, 2000);
        const onActivityChange = () => load();
        window.addEventListener(DAILY_ACTIVITY_CHANGE_EVENT, onActivityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener(DAILY_ACTIVITY_CHANGE_EVENT, onActivityChange);
        };
    }, []);

    const streakCount = useMemo(() => calculateStreak(buildActivityMap(activities)), [activities]);
    const totalScore = useMemo(
        () => activities.reduce((sum, entry) => sum + (entry.solved ? entry.score : 0), 0),
        [activities]
    );

    if (!user) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 w-full max-w-4xl">
            {/* Left Col: Core Stats & Heatmap */}
            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {streakCount}
                        </div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Day Streak
                        </div>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                            {totalScore}
                        </div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Total Score
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <Heatmap />
                </div>
            </div>

            {/* Right Col: Achievements */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <AchievementsList unlockedIds={user.unlockedAchievements} />
                <Leaderboard />
            </div>
        </div>
    );
};

export default StatsDashboard;
