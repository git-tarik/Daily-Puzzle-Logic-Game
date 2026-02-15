import React from 'react';
import { motion } from 'framer-motion';

const Home = ({ onStart }) => {
    const Motion = motion;
    const features = [
        { title: 'Daily Challenge', desc: 'A fresh logic puzzle every 24 hours.' },
        { title: 'Track Progress', desc: 'Build your streak and analyze performance.' },
        { title: 'Brain Training', desc: 'Sharpen your mind with pattern recognition.' }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <Motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight"
            >
                <span className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    Logic Looper
                </span>
            </Motion.h1>

            <Motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mb-12 leading-relaxed"
            >
                Daily logic puzzles.
                <br />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">One brain. Infinite loops.</span>
            </Motion.p>

            <Motion.button
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                onClick={onStart}
            >
                Start Today&apos;s Puzzle
                <span className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors" />
            </Motion.button>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-left">
                {features.map((feature, i) => (
                    <Motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.25 + (i * 0.08) }}
                        className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                    </Motion.div>
                ))}
            </div>
        </div>
    );
};

export default Home;
