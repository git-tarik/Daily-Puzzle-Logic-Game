import React from 'react';

const Home = ({ onStart }) => {
    const features = [
        { title: 'Daily Challenge', desc: 'A fresh logic puzzle every 24 hours.', icon: 'bi-calendar-check-fill' },
        { title: 'Track Progress', desc: 'Build your streak and analyze performance.', icon: 'bi-bar-chart-line-fill' },
        { title: 'Brain Training', desc: 'Sharpen your mind with pattern recognition.', icon: 'bi-lightbulb-fill' }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-indigo-600">Logic Looper</h1>

            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mb-12 leading-relaxed brand-secondary-font">
                Daily logic puzzles.
                <br />
                <span className="font-semibold text-indigo-600">One brain. Infinite loops.</span>
            </p>

            <button
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-full transition-colors"
                onClick={onStart}
            >
                <i className="bi bi-play-circle-fill mr-2" aria-hidden="true"></i>
                Start Today&apos;s Puzzle
            </button>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-left">
                {features.map((feature) => (
                    <div
                        key={feature.title}
                        className="p-6 bg-white rounded-xl border border-gray-200"
                    >
                        <h3 className="font-bold text-lg mb-2 text-gray-900 flex items-center gap-2">
                            <i className={`bi ${feature.icon} text-indigo-600`} aria-hidden="true"></i>
                            {feature.title}
                        </h3>
                        <p className="text-gray-600 brand-secondary-font">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
