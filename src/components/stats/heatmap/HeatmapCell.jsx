import React from 'react';
import { intensityMap } from '../../../lib/heatmapUtils';

const HeatmapCell = ({
    cell,
    activity,
    onHover,
    onLeave,
}) => {
    if (!cell) {
        return <div className="w-3 h-3 md:w-4 md:h-4 rounded-sm bg-white" aria-hidden="true" />;
    }

    const intensity = activity?.intensity ?? 0;
    const colorClass = intensityMap[intensity] ?? intensityMap[0];

    return (
        <div className="relative">
            <div
                title={cell.dateISO}
                onMouseEnter={(event) => onHover(cell.dateISO, event.currentTarget)}
                onMouseLeave={onLeave}
                className={`w-3 h-3 md:w-4 md:h-4 rounded-sm border border-gray-200 ${colorClass} ${
                    cell.isToday ? 'outline outline-1 outline-indigo-500 outline-offset-1' : ''
                }`}
            />
        </div>
    );
};

const areEqual = (prev, next) => {
    if (prev.cell?.dateISO !== next.cell?.dateISO) return false;
    if (prev.cell?.isToday !== next.cell?.isToday) return false;
    if (prev.activity?.intensity !== next.activity?.intensity) return false;
    if (prev.activity?.score !== next.activity?.score) return false;
    if (prev.activity?.timeTaken !== next.activity?.timeTaken) return false;
    if (prev.activity?.difficulty !== next.activity?.difficulty) return false;
    return true;
};

export default React.memo(HeatmapCell, areEqual);
