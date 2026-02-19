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
                                ? 'bg-blue-100 border-blue-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="text-2xl">
                                <i className={`${ach.icon} brand-icon`} aria-hidden="true"></i>
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {ach.name}
                                </div>
                                <div className="text-xs text-gray-500 leading-tight brand-secondary-font">
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
