import React from 'react';

const formatSeconds = (seconds = 0) => {
    const total = Math.max(0, Number(seconds) || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
};

const Tooltip = ({ activity, style, placement = 'top' }) => {
    if (!activity) return null;

    const placementClass =
        placement === 'bottom'
            ? '-translate-x-1/2'
            : '-translate-x-1/2 -translate-y-full';

    return (
        <div
            className={`pointer-events-none absolute z-30 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-xl whitespace-nowrap ${placementClass}`}
            style={style}
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
