import { getApiUrl } from './api';
import { getApiCache, saveApiCache } from './db';

const inFlightRequests = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

const buildCacheKey = (url) => `GET:${url}`;

const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
};

const mergeConditionalHeaders = (headers = {}, cacheEntry) => {
    const merged = { ...headers };
    if (cacheEntry?.etag) merged['If-None-Match'] = cacheEntry.etag;
    if (cacheEntry?.lastModified) merged['If-Modified-Since'] = cacheEntry.lastModified;
    return merged;
};

const fetchAndCache = async (url, options = {}, cacheEntry = null, ttlMs = DEFAULT_TTL_MS) => {
    const response = await fetch(url, {
        ...options,
        headers: mergeConditionalHeaders(options.headers, cacheEntry),
    });

    if (response.status === 304 && cacheEntry) {
        await saveApiCache({
            key: buildCacheKey(url),
            data: cacheEntry.data,
            etag: cacheEntry.etag,
            lastModified: cacheEntry.lastModified,
            ttlMs,
        });
        return cacheEntry.data;
    }

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    const data = await parseResponse(response);
    await saveApiCache({
        key: buildCacheKey(url),
        data,
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        ttlMs,
    });
    return data;
};

const getOrCreateInFlight = (key, creator) => {
    if (inFlightRequests.has(key)) return inFlightRequests.get(key);
    const request = creator().finally(() => inFlightRequests.delete(key));
    inFlightRequests.set(key, request);
    return request;
};

export const cachedGet = async (endpoint, { ttlMs = DEFAULT_TTL_MS, onUpdate, headers } = {}) => {
    const url = getApiUrl(endpoint);
    const cacheKey = buildCacheKey(url);
    const cacheEntry = await getApiCache(cacheKey);
    const now = Date.now();

    if (cacheEntry?.data !== undefined) {
        const isStale = !cacheEntry.expiresAt || cacheEntry.expiresAt <= now;
        if (isStale && isOnline()) {
            getOrCreateInFlight(cacheKey, async () => {
                try {
                    const fresh = await fetchAndCache(url, { method: 'GET', headers }, cacheEntry, ttlMs);
                    if (typeof onUpdate === 'function') onUpdate(fresh);
                } catch {
                    // Return stale cache silently.
                }
            });
        }
        return cacheEntry.data;
    }

    if (!isOnline()) {
        return null;
    }

    return getOrCreateInFlight(cacheKey, () => fetchAndCache(url, { method: 'GET', headers }, null, ttlMs));
};

export const postJson = async (endpoint, body, { headers } = {}) => {
    const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const maybeJson = await parseResponse(response).catch(() => null);
        const message = typeof maybeJson === 'string' ? maybeJson : maybeJson?.error;
        throw new Error(message || `Request failed (${response.status})`);
    }

    return parseResponse(response);
};

export const getJson = async (endpoint, { headers } = {}) => {
    const response = await fetch(getApiUrl(endpoint), {
        method: 'GET',
        headers: {
            ...(headers || {}),
        },
    });

    if (!response.ok) {
        const maybeJson = await parseResponse(response).catch(() => null);
        const message = typeof maybeJson === 'string' ? maybeJson : maybeJson?.error;
        throw new Error(message || `Request failed (${response.status})`);
    }

    return parseResponse(response);
};
