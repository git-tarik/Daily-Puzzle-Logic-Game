// In development, Vite proxy handles '/api' -> 'http://localhost:3001/api'
// In production, we need to point to the remote backend URL directly.

// If VITE_API_URL is set (e.g. in Vercel), use it. 
// Otherwise, fall back to empty string (relative path) which works if served from same origin 
// OR if using Vite proxy in dev.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getApiUrl = (endpoint) => {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${path}`;
};
