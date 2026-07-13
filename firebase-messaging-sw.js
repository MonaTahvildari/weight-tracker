/**
 * Firebase Cloud Messaging Service Worker
 * Required by Firebase for handling push notifications
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase (same config as main app)
const firebaseConfig = {
    apiKey: "AIzaSyDRxRxX4L7Y8z9X0a1B2c3D4e5F6g7H8i9J",
    authDomain: "weight-tracker-75hard.firebaseapp.com",
    projectId: "weight-tracker-75hard",
    storageBucket: "weight-tracker-75hard.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM-SW] Background message received:', payload);

    const title = payload.notification?.title || '75 Hard Challenge';
    const options = {
        body: payload.notification?.body || 'Update!',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230a0e27"/><text x="60" y="85" font-size="70" font-weight="900" fill="%23ff006e" text-anchor="middle">75</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230a0e27"/><text x="60" y="85" font-size="70" font-weight="900" fill="%23ff006e" text-anchor="middle">75</text></svg>',
        tag: payload.notification?.tag || 'fcm-background',
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[FCM-SW] Notification clicked:', event);
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window
                for (const client of clientList) {
                    if (client.url.includes('/weight-tracker/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow('/weight-tracker/');
                }
            })
    );
});

console.log('[FCM-SW] Service worker loaded');
