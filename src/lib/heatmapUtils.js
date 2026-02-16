import dayjs from 'dayjs';

export const intensityMap = {
    0: 'bg-gray-200',
    1: 'bg-green-200',
    2: 'bg-green-400',
    3: 'bg-green-600',
    4: 'bg-green-800',
};

const parseDateISOToLocalDate = (dateISO) => {
    if (typeof dateISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        return null;
    }
    const [year, month, day] = dateISO.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }
    return date;
};

export const toDateISO = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isLeapYear = (year) => dayjs(`${year}-01-01`).isLeapYear?.() ?? new Date(year, 1, 29).getDate() === 29;

export const computeIntensity = (activity) => {
    if (!activity?.solved) return 0;

    const score = Number(activity.score) || 0;
    const timeTaken = Number(activity.timeTaken) || 0;
    const difficulty = Number(activity.difficulty) || 1;

    if (score >= 180 || (difficulty >= 4 && timeTaken <= 120)) return 4;
    if (difficulty >= 4 || score >= 140 || (difficulty >= 3 && timeTaken <= 180)) return 3;
    if (difficulty >= 2 || score >= 90) return 2;
    return 1;
};

export const buildActivityMap = (activities = []) => {
    const map = new Map();
    for (const activity of activities) {
        if (!activity?.date) continue;
        map.set(activity.date, activity);
    }
    return map;
};

export const generateYearGrid = ({ year = dayjs().year(), todayISO = dayjs().format('YYYY-MM-DD') } = {}) => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const startWeekday = start.getDay();

    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) {
        cells.push(null);
    }

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const dateISO = toDateISO(cursor);
        cells.push({
            dateISO,
            dayOfWeek: cursor.getDay(),
            dayOfMonth: cursor.getDate(),
            isToday: dateISO === todayISO,
        });
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    const columns = [];
    for (let i = 0; i < cells.length; i += 7) {
        columns.push(cells.slice(i, i + 7));
    }

    return {
        year,
        columns,
        dayCount: toDateISO(end) && Math.round((end - start) / 86400000) + 1,
    };
};

export const calculateStreak = (activityMap, todayISO = dayjs().format('YYYY-MM-DD')) => {
    const today = parseDateISOToLocalDate(todayISO);
    if (!today) return 0;

    let streak = 0;
    const cursor = new Date(today);

    while (true) {
        const dateISO = toDateISO(cursor);
        const activity = activityMap?.get?.(dateISO);
        if (!activity?.solved) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
};

const allDaysInMonthSolved = (activityMap, year, monthIndex) => {
    const date = new Date(year, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
        const activity = activityMap.get(toDateISO(date));
        if (!activity?.solved) return false;
        date.setDate(date.getDate() + 1);
    }
    return true;
};

export const evaluateMilestones = (activities, todayISO = dayjs().format('YYYY-MM-DD')) => {
    const activityMap = buildActivityMap(activities);
    const streak = calculateStreak(activityMap, todayISO);
    const totalCompletedDays = activities.filter((item) => item.solved).length;

    const milestones = [];
    if (streak >= 7) {
        milestones.push({ id: 'STREAK_7_DAYS', type: 'streak', dateEarned: todayISO });
    }
    if (streak >= 30) {
        milestones.push({ id: 'STREAK_30_DAYS', type: 'streak', dateEarned: todayISO });
    }
    if (totalCompletedDays >= 100) {
        milestones.push({ id: 'COMPLETED_100_DAYS', type: 'completion', dateEarned: todayISO });
    }

    const parsedToday = parseDateISOToLocalDate(todayISO);
    if (parsedToday) {
        const year = parsedToday.getFullYear();
        const monthIndex = parsedToday.getMonth();
        const isEndOfMonth = new Date(year, monthIndex + 1, 0).getDate() === parsedToday.getDate();
        if (isEndOfMonth && allDaysInMonthSolved(activityMap, year, monthIndex)) {
            milestones.push({ id: 'PERFECT_MONTH', type: 'consistency', dateEarned: todayISO });
        }
    }

    return milestones;
};

