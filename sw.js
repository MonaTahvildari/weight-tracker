/**
 * Service Worker for Weight Tracker PWA
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'weight-tracker-v2.0.0';
const ASSETS_TO_CACHE = [
    '/weight-tracker/',
    '/weight-tracker/index.html',
    '/weight-tracker/css/main.css',
    '/weight-tracker/css/components.css',
    '/weight-tracker/css/responsive.css',
    '/weight-tracker/js/storage.js',
    '/weight-tracker/js/calculations.js',
    '/weight-tracker/js/charts.js',
    '/weight-tracker/js/ui.js',
    '/weight-tracker/js/notifications.js',
    '/weight-tracker/js/app.js',
    '/weight-tracker/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js'
];

/**
 * Install event - cache assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Service worker installed');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return cached response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                // Make network request
                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the fetched response
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.log('[SW] Fetch failed, returning offline page:', error);

                        // Return cached index.html for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/weight-tracker/index.html');
                        }
                    });
            })
    );
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(event.data.urls))
        );
    }
});

/**
 * Background sync event (for future use)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Background sync triggered');
        // Could sync data to cloud storage here
    }
});

/**
 * Push notification event (for future use)
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body || 'Time to log your daily entry!',
            icon: '/weight-tracker/assets/icons/icon-192x192.png',
            badge: '/weight-tracker/assets/icons/icon-96x96.png',
            vibrate: [200, 100, 200],
            tag: 'weight-tracker-notification',
            requireInteraction: false
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Weight Tracker', options)
        );
    }
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes('/weight-tracker/') && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window if no existing window
                if (clients.openWindow) {
                    return clients.openWindow('/weight-tracker/');
                }
            })
    );
});

console.log('[SW] Service worker loaded');
