import React, { useMemo } from 'react';
import dayjs from 'dayjs';

const Heatmap = ({ heatmap = [] }) => {
    // Generate last 365 days
    const days = useMemo(() => {
        const result = [];
        const today = dayjs();
        // Show last ~2 months for Phase 1/3 MVP or 1 year?
        // UI Request said "Simple grid". 
        // Let's do last 60 days for nicer mobile fit.
        for (let i = 59; i >= 0; i--) {
            const date = today.subtract(i, 'day');
            result.push({
                dateISO: date.format('YYYY-MM-DD'),
                dayOfMonth: date.date(),
                isToday: i === 0
            });
        }
        return result;
    }, []);

    const activeSet = useMemo(() => new Set(heatmap), [heatmap]);

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Activity (Last 60 Days)</h3>
            <div className="flex flex-wrap gap-1 max-w-sm">
                {days.map((d) => (
                    <div
                        key={d.dateISO}
                        title={d.dateISO}
                        className={`w-3 h-3 md:w-4 md:h-4 rounded-sm transition-colors duration-300
                            ${activeSet.has(d.dateISO)
                                ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                                : 'bg-gray-200 dark:bg-gray-800'
                            }
                            ${d.isToday ? 'outline outline-2 outline-indigo-500 outline-offset-1 z-10' : ''}
                        `}
                    />
                ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">
                {activeSet.size} days played total
            </div>
        </div>
    );
};

export default Heatmap;
