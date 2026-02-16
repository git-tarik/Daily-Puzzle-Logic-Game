import React from 'react';

const formatSeconds = (seconds = 0) => {
    const total = Math.max(0, Number(seconds) || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
};

const Tooltip = ({ activity }) => {
    if (!activity) return null;

    return (
        <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 z-20 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-xl whitespace-nowrap"
            role="tooltip"
        >
            <div className="font-semibold">{activity.date}</div>
            <div>Score: {activity.score}</div>
            <div>Time: {formatSeconds(activity.timeTaken)}</div>
            <div>Difficulty: {activity.difficulty}</div>
        </div>
    );
};

export default Tooltip;

