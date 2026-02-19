import React from 'react';
import HeatmapCell from './HeatmapCell';

const HeatmapColumn = ({
    column,
    activityMap,
    isMilestonePulse,
    onHover,
    onLeave,
}) => (
    <div className="flex flex-col gap-1">
        {column.map((cell, rowIndex) => {
            const activity = cell ? activityMap.get(cell.dateISO) : null;
            return (
                <HeatmapCell
                    key={cell?.dateISO || `empty-${rowIndex}`}
                    cell={cell}
                    activity={activity}
                    isMilestonePulse={isMilestonePulse}
                    onHover={onHover}
                    onLeave={onLeave}
                />
            );
        })}
    </div>
);

export default React.memo(HeatmapColumn);
