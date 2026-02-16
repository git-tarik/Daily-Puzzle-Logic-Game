const isProd = typeof __APP_IS_PROD__ === 'boolean' ? __APP_IS_PROD__ : false;

export const logger = {
    info: (...args) => {
        if (!isProd) console.info(...args);
    },
    warn: (...args) => {
        if (!isProd) console.warn(...args);
    },
    error: (...args) => {
        if (!isProd) console.error(...args);
    },
};
