import React from 'react';

const Home = ({ onStart }) => {
    const features = [
        { title: 'Daily Challenge', desc: 'A fresh logic puzzle every 24 hours.' },
        { title: 'Track Progress', desc: 'Build your streak and analyze performance.' },
        { title: 'Brain Training', desc: 'Sharpen your mind with pattern recognition.' }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight animate-[fade-in_0.45s_ease-out]">
                <span className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    Logic Looper
                </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mb-12 leading-relaxed animate-[fade-in_0.55s_ease-out]">
                Daily logic puzzles.
                <br />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">One brain. Infinite loops.</span>
            </p>

            <button
                className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                onClick={onStart}
            >
                Start Today&apos;s Puzzle
                <span className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors" />
            </button>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-left">
                {features.map((feature, i) => (
                    <div
                        key={feature.title}
                        style={{ animationDelay: `${0.2 + i * 0.08}s` }}
                        className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
