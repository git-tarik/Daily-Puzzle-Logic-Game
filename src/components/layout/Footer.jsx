import React from 'react';

const Footer = () => {
    return (
        <footer className="border-t border-gray-200 py-6 mt-auto bg-white">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500 brand-secondary-font">
                <p>&copy; {new Date().getFullYear()} Logic Looper. One brain. Infinite loops.</p>
            </div>
        </footer>
    );
};

export default Footer;
