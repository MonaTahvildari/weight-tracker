/**
 * Firebase Cloud Messaging Module
 * Handles push notifications via FCM
 */

const FirebaseMessaging = (function() {
    let messaging = null;
    let fcmToken = null;

    /**
     * Initialize FCM
     */
    function init() {
        try {
            // Check if Firebase is initialized
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                console.warn('[FCM] Firebase not initialized');
                return;
            }

            messaging = firebase.messaging();

            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('[FCM] Notification permission granted');
                        registerFCMToken();
                    }
                });
            } else if (Notification.permission === 'granted') {
                registerFCMToken();
            }

            // Handle messages when app is in foreground
            messaging.onMessage((payload) => {
                console.log('[FCM] Message received:', payload);

                const title = payload.notification?.title || 'Update';
                const body = payload.notification?.body || '';

                // Show browser notification
                new Notification(title, {
                    body: body,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230a0e27"/><text x="60" y="85" font-size="70" font-weight="900" fill="%23ff006e" text-anchor="middle">75</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230a0e27"/><text x="60" y="85" font-size="70" font-weight="900" fill="%23ff006e" text-anchor="middle">75</text></svg>',
                    tag: payload.notification?.tag || 'fcm-message',
                    vibrate: [200, 100, 200]
                });

                // Show in-app toast if UI is available
                if (typeof UI !== 'undefined' && UI.showToast) {
                    UI.showToast(body);
                }
            });

            console.log('[FCM] Initialized');
        } catch (error) {
            console.error('[FCM] Initialization error:', error);
        }
    }

    /**
     * Register device for FCM
     */
    function registerFCMToken() {
        if (!messaging) return;

        // Get the existing service worker registration and use it for FCM
        navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length > 0) {
                const swRegistration = registrations[0];
                messaging.getToken({
                    vapidKey: 'BEjL5Rp9KuGzfBBB0PxPWKDf8qGiW9IvRFNSuykvyDncGLfQt3JbRXiYxFB-xcrOU2YdFcMdbLEOZcjMo3MOmqQ',
                    serviceWorkerRegistration: swRegistration
                })
                .then((token) => {
                    if (token) {
                        fcmToken = token;
                        console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
                        storeFCMToken(token);
                    } else {
                        console.log('[FCM] No token available');
                    }
                })
                .catch((error) => {
                    console.error('[FCM] Error getting token:', error);
                });
            } else {
                console.warn('[FCM] No service worker registration found');
            }
        });
    }

    /**
     * Store FCM token in Firebase database
     */
    function storeFCMToken(token) {
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) return;

        const db = firebase.database();
        const tokensRef = db.ref('fcmTokens');

        tokensRef.child(token.substring(0, 20)).set({
            token: token,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch(error => {
            console.error('[FCM] Error storing token:', error);
        });
    }

    /**
     * Send FCM notification to all devices
     * (Note: This should be called from a Cloud Function on the backend)
     */
    function sendNotificationToAll(title, body, tag) {
        console.log('[FCM] Notification queued (send via Cloud Function):', { title, body, tag });
        // This would be triggered by a Firebase Cloud Function
        // that listens to database changes and sends FCM messages
    }

    return {
        init,
        registerFCMToken,
        sendNotificationToAll
    };
})();
