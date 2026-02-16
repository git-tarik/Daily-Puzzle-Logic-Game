import React from 'react';
import HeatmapColumn from './HeatmapColumn';

const HeatmapGrid = ({
    columns,
    activityMap,
    hoveredDate,
    onHover,
    onLeave,
    shouldPulseMilestone,
}) => (
    <div className="flex gap-1 overflow-x-auto pb-1">
        {columns.map((column, index) => (
            <HeatmapColumn
                key={`week-${index}`}
                column={column}
                activityMap={activityMap}
                hoveredDate={hoveredDate}
                onHover={onHover}
                onLeave={onLeave}
                isMilestonePulse={shouldPulseMilestone}
            />
        ))}
    </div>
);

export default React.memo(HeatmapGrid);

