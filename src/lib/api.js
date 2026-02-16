const resolvedBaseUrl =
    typeof __APP_API_BASE_URL__ === 'string' ? __APP_API_BASE_URL__ : '';
const API_BASE_URL = resolvedBaseUrl.replace(/\/$/, '');

export const getApiUrl = (endpoint) => {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${path}`;
};
