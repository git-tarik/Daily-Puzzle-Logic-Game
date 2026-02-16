const APP_SHELL_CACHE = 'logiclooper-app-shell-v1';
const RUNTIME_CACHE = 'logiclooper-runtime-v1';
const LEADERBOARD_CACHE = 'logiclooper-leaderboard-v1';

const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE, LEADERBOARD_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

const staleWhileRevalidate = async (request, cacheName) => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        return cached;
    }

    const networkResponse = await networkPromise;
    if (networkResponse) return networkResponse;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
};

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    if (url.pathname.startsWith('/api/leaderboard')) {
        event.respondWith(staleWhileRevalidate(request, LEADERBOARD_CACHE));
        return;
    }

    const isAppShellRequest = request.mode === 'navigate';
    const isStaticAsset =
        url.pathname.startsWith('/assets/') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.svg');

    if (isAppShellRequest) {
        event.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    if (isStaticAsset) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    }
});
