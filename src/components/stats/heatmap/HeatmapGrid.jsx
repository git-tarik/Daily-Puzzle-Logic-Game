import React, { useMemo } from 'react';
import HeatmapColumn from './HeatmapColumn';

const HeatmapGrid = ({
    columns,
    activityMap,
    onHover,
    onLeave,
    shouldPulseMilestone,
}) => {
    const monthLabels = useMemo(
        () =>
            columns.map((column) => {
                const monthStart = column.find((cell) => cell?.dayOfMonth === 1);
                if (!monthStart) return '';
                return new Date(`${monthStart.dateISO}T00:00:00`).toLocaleString('en-US', { month: 'short' });
            }),
        [columns]
    );

    const dayLabels = [' ', 'Mon', ' ', 'Wed', ' ', 'Fri', ' '];

    return (
        <div className="flex gap-2">
            <div className="w-8 shrink-0 text-xs text-gray-500">
                <div className="h-5 mb-1" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                    {dayLabels.map((label, index) => (
                        <div key={`day-label-${index}`} className="h-3 md:h-4 leading-none">
                            {label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto pb-1">
                <div className="inline-block min-w-max">
                    <div className="relative h-5 mb-1">
                        <div className="flex gap-1">
                            {columns.map((column, index) => (
                                <div key={`month-anchor-${index}`} className="w-3 md:w-4 shrink-0 relative">
                                    {monthLabels[index] ? (
                                        <span className="absolute left-0 top-0 text-xs text-gray-600 whitespace-nowrap">
                                            {monthLabels[index]}
                                        </span>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {columns.map((column, index) => (
                            <HeatmapColumn
                                key={`week-${index}`}
                                column={column}
                                activityMap={activityMap}
                                onHover={onHover}
                                onLeave={onLeave}
                                isMilestonePulse={shouldPulseMilestone}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(HeatmapGrid);
