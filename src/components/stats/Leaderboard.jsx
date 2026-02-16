import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { cachedGet } from '../../lib/apiClient';

const Leaderboard = () => {
    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        const load = async () => {
            setStatus('loading');
            try {
                const today = dayjs().format('YYYY-MM-DD');
                const data = await cachedGet(`/api/leaderboard?date=${today}`, {
                    ttlMs: 120000,
                    onUpdate: (fresh) => {
                        setRows(Array.isArray(fresh) ? fresh.slice(0, 10) : []);
                        setStatus('ready');
                    }
                });
                setRows(Array.isArray(data) ? data.slice(0, 10) : []);
                setStatus('ready');
            } catch {
                setStatus('error');
            }
        };
        load();
    }, []);

    if (status === 'loading') return <div className="text-sm text-gray-400">Loading leaderboard...</div>;
    if (status === 'error') return <div className="text-sm text-gray-400">Leaderboard unavailable.</div>;
    if (!rows.length) return <div className="text-sm text-gray-400">No scores yet today.</div>;

    return (
        <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Today Top 10</h3>
            <div className="space-y-2">
                {rows.map((row) => (
                    <div key={`${row.rank}-${row.name}`} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-gray-500 w-10">#{row.rank}</span>
                        <span className="flex-1">{row.name}</span>
                        <span className="font-semibold">{row.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;
