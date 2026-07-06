/**
 * Service Worker for Weight Tracker PWA
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'weight-tracker-v1.2.5';
const ASSETS_TO_CACHE = [
    '/weight-tracker/',
    '/weight-tracker/index.html',
    '/weight-tracker/css/main.css',
    '/weight-tracker/css/components.css',
    '/weight-tracker/css/responsive.css',
    '/weight-tracker/js/storage.js',
    '/weight-tracker/js/firebase-sync.js',
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
            .then(() => {
                return self.clients.matchAll();
            })
            .then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'CACHE_CLEARED' });
                });
            })
    );
});

/**
 * Fetch event - network-first for JS, cache-first for others
 */
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const isJsFile = url.pathname.endsWith('.js');

    if (isJsFile) {
        // Network-only for JavaScript files - no caching at all
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .catch(() => {
                    // If network fails, try cache as fallback
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache-first strategy for other files (CSS, images, etc)
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }

                    const fetchRequest = event.request.clone();

                    return fetch(fetchRequest)
                        .then((response) => {
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });

                            return response;
                        })
                        .catch(() => {
                            if (event.request.mode === 'navigate') {
                                return caches.match('/weight-tracker/index.html');
                            }
                        });
                })
        );
    }
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
