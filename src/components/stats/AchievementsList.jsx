import React from 'react';
import { ACHIEVEMENTS } from '../../engine/achievements.js';

const AchievementsList = ({ unlockedIds = [] }) => {
    const unlockedSet = new Set(unlockedIds);
    const list = Object.values(ACHIEVEMENTS);

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Achievements ({unlockedIds.length}/{list.length})</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {list.map(ach => {
                    const isUnlocked = unlockedSet.has(ach.id);
                    return (
                        <div key={ach.id} className={`flex items-center gap-3 p-3 rounded-lg border 
                             ${isUnlocked
                                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-yellow-200 dark:border-yellow-800'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60 grayscale'
                            }`}>
                            <div className="text-2xl">{ach.icon}</div>
                            <div>
                                <div className={`text-sm font-bold ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                    {ach.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                                    {ach.description}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AchievementsList;
