import {
    buildActivityMap,
    calculateStreak,
    computeIntensity,
    evaluateMilestones,
    generateYearGrid,
} from '../lib/heatmapUtils';

describe('heatmap date grid generation', () => {
    test('generates 366 days for leap year', () => {
        const grid = generateYearGrid({ year: 2024, todayISO: '2024-02-01' });
        expect(grid.dayCount).toBe(366);
        const dates = grid.columns.flat().filter(Boolean).map((cell) => cell.dateISO);
        expect(dates[0]).toBe('2024-01-01');
        expect(dates[dates.length - 1]).toBe('2024-12-31');
    });

    test('generates 365 days for non-leap year', () => {
        const grid = generateYearGrid({ year: 2025, todayISO: '2025-02-01' });
        expect(grid.dayCount).toBe(365);
    });

    test('marks today in local-date-safe format', () => {
        const grid = generateYearGrid({ year: 2026, todayISO: '2026-02-16' });
        const todayCell = grid.columns.flat().find((cell) => cell?.isToday);
        expect(todayCell.dateISO).toBe('2026-02-16');
    });
});

describe('streak logic correctness', () => {
    test('counts consecutive solved days backwards from today', () => {
        const map = buildActivityMap([
            { date: '2026-02-14', solved: true },
            { date: '2026-02-15', solved: true },
            { date: '2026-02-16', solved: true },
        ]);
        expect(calculateStreak(map, '2026-02-16')).toBe(3);
    });

    test('stops at first unsolved or missing day', () => {
        const map = buildActivityMap([
            { date: '2026-02-16', solved: true },
            { date: '2026-02-15', solved: false },
            { date: '2026-02-14', solved: true },
        ]);
        expect(calculateStreak(map, '2026-02-16')).toBe(1);
    });
});

describe('intensity and milestones', () => {
    test('maps score/time/difficulty to deterministic intensity', () => {
        expect(computeIntensity({ solved: false, score: 0, timeTaken: 0, difficulty: 1 })).toBe(0);
        expect(computeIntensity({ solved: true, score: 50, timeTaken: 500, difficulty: 1 })).toBe(1);
        expect(computeIntensity({ solved: true, score: 95, timeTaken: 400, difficulty: 2 })).toBe(2);
        expect(computeIntensity({ solved: true, score: 150, timeTaken: 250, difficulty: 3 })).toBe(3);
        expect(computeIntensity({ solved: true, score: 185, timeTaken: 80, difficulty: 4 })).toBe(4);
    });

    test('detects streak and completion milestones', () => {
        const activities = Array.from({ length: 100 }).map((_, index) => ({
            date: `2026-01-${String(index + 1).padStart(2, '0')}`,
            solved: true,
            score: 120,
            timeTaken: 100,
            difficulty: 3,
        }));
        const milestones = evaluateMilestones(activities, '2026-01-31');
        const ids = milestones.map((item) => item.id);
        expect(ids).toContain('STREAK_7_DAYS');
        expect(ids).toContain('STREAK_30_DAYS');
        expect(ids).toContain('COMPLETED_100_DAYS');
        expect(ids).toContain('PERFECT_MONTH');
    });
});

