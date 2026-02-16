import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import HeatmapGrid from './HeatmapGrid';
import {
    DAILY_ACTIVITY_CHANGE_EVENT,
    getActivityYears,
    getAllDailyActivity,
    getMilestoneAchievements,
    getYearDailyActivity,
    upsertMilestoneAchievement,
} from '../../../lib/dailyActivityDb';
import {
    buildActivityMap,
    calculateStreak,
    computeIntensity,
    evaluateMilestones,
    generateYearGrid,
} from '../../../lib/heatmapUtils';

const badgeMeta = {
    STREAK_7_DAYS: { label: '7-Day Streak', style: 'bg-amber-100 text-amber-800 border-amber-200' },
    STREAK_30_DAYS: { label: '30-Day Streak', style: 'bg-orange-100 text-orange-800 border-orange-200' },
    COMPLETED_100_DAYS: { label: '100 Days Completed', style: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    PERFECT_MONTH: { label: 'Perfect Month', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const HeatmapContainer = () => {
    const [selectedYear, setSelectedYear] = useState(dayjs().year());
    const [years, setYears] = useState([dayjs().year()]);
    const [yearActivities, setYearActivities] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [hoveredDate, setHoveredDate] = useState(null);

    const loadData = useCallback(async (year) => {
        const [yearData, allData, allYears, milestoneData] = await Promise.all([
            getYearDailyActivity(year),
            getAllDailyActivity(),
            getActivityYears(),
            getMilestoneAchievements(),
        ]);

        const normalizedYearData = yearData.map((entry) => ({
            ...entry,
            intensity: computeIntensity(entry),
        }));

        setYearActivities(normalizedYearData);
        setAllActivities(allData);
        setYears(allYears);
        setAchievements(milestoneData);
    }, []);

    useEffect(() => {
        loadData(selectedYear);
    }, [loadData, selectedYear]);

    useEffect(() => {
        const handler = () => {
            loadData(selectedYear);
        };
        window.addEventListener(DAILY_ACTIVITY_CHANGE_EVENT, handler);
        return () => window.removeEventListener(DAILY_ACTIVITY_CHANGE_EVENT, handler);
    }, [loadData, selectedYear]);

    useEffect(() => {
        const todayISO = dayjs().format('YYYY-MM-DD');
        const milestones = evaluateMilestones(allActivities, todayISO);
        milestones.forEach((milestone) => {
            upsertMilestoneAchievement(milestone).catch(() => null);
        });
    }, [allActivities]);

    const activityMap = useMemo(() => buildActivityMap(yearActivities), [yearActivities]);
    const fullActivityMap = useMemo(() => buildActivityMap(allActivities), [allActivities]);
    const streak = useMemo(() => calculateStreak(fullActivityMap), [fullActivityMap]);
    const grid = useMemo(
        () => generateYearGrid({ year: selectedYear, todayISO: dayjs().format('YYYY-MM-DD') }),
        [selectedYear]
    );

    const shouldPulseMilestone = useMemo(
        () => achievements.some((achievement) => achievement.dateEarned === dayjs().format('YYYY-MM-DD')),
        [achievements]
    );

    const totalCompleted = useMemo(() => allActivities.filter((entry) => entry.solved).length, [allActivities]);

    const onHover = useCallback((dateISO) => setHoveredDate(dateISO), []);
    const onLeave = useCallback(() => setHoveredDate(null), []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Contribution Heatmap</h3>
                <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900"
                >
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            <HeatmapGrid
                columns={grid.columns}
                activityMap={activityMap}
                hoveredDate={hoveredDate}
                onHover={onHover}
                onLeave={onLeave}
                shouldPulseMilestone={shouldPulseMilestone}
            />

            <div className="text-xs text-gray-500 flex flex-wrap gap-4">
                <span>Current streak: {streak} days</span>
                <span>Completed days: {totalCompleted}</span>
                <span>{grid.dayCount} days in {selectedYear}</span>
            </div>

            {achievements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {achievements.map((achievement) => (
                        <span
                            key={achievement.id}
                            className={`text-[11px] px-2 py-1 rounded-full border ${
                                badgeMeta[achievement.id]?.style || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                        >
                            {badgeMeta[achievement.id]?.label || achievement.type}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HeatmapContainer;

