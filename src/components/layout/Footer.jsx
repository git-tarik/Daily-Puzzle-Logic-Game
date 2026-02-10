import React from 'react';

const Footer = () => {
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>&copy; {new Date().getFullYear()} Logic Looper. One brain. Infinite loops.</p>
            </div>
        </footer>
    );
};

export default Footer;
