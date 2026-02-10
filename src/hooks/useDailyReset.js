import { useEffect } from 'react';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { fetchDailyPuzzle } from '../features/puzzles/puzzleSlice';

export const useDailyReset = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const checkReset = () => {
            const now = dayjs();
            const nextMidnight = dayjs().endOf('day').add(1, 'second');
            const msUntilMidnight = nextMidnight.diff(now);

            const timer = setTimeout(() => {
                // Trigger Reset
                const today = dayjs().format('YYYY-MM-DD');
                dispatch(fetchDailyPuzzle(today));

                // Reschedule next
                checkReset();
            }, msUntilMidnight);

            return () => clearTimeout(timer);
        };

        const cleanup = checkReset();
        return cleanup;
    }, [dispatch]);
};
