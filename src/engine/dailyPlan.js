import dayjs from 'dayjs';

export const PUZZLE_TYPES = ['matrix', 'pattern', 'sequence', 'deduction', 'binary'];

const dayOfYear = (dateISO) => {
    const date = dayjs(dateISO);
    return date.diff(date.startOf('year'), 'day');
};

export const getDailyPuzzleMeta = (dateISO) => {
    const ordinal = dayOfYear(dateISO);
    const type = PUZZLE_TYPES[ordinal % PUZZLE_TYPES.length];
    const difficulty = Math.min(5, Math.floor(ordinal / 73) + 1);
    return { type, difficulty, ordinal };
};
