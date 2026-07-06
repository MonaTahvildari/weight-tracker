/**
 * Firebase Sync Module
 * Syncs localStorage data with Firebase Realtime Database
 * localStorage remains the primary store for offline support
 */

const FirebaseSync = (function() {
    let db = null;
    let dataRef = null;
    let isListening = false;
    let isSyncing = false; // Prevents sync loops
    let lastOwnWriteTime = 0; // Track our own writes to ignore echo

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyDrntXc1hCkeBCWZTErvP9oiMDpAZ4yeAE",
        authDomain: "weight-tracker-7e111.firebaseapp.com",
        databaseURL: "https://weight-tracker-7e111-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "weight-tracker-7e111",
        storageBucket: "weight-tracker-7e111.firebasestorage.app",
        messagingSenderId: "85746047968",
        appId: "1:85746047968:web:b85d5c213b5779165da985"
    };

    /**
     * Initialize Firebase and start listening
     */
    function init() {
        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                console.warn('[Firebase] SDK not loaded, running offline only');
                return;
            }

            // Initialize Firebase app (only once)
            if (!firebase.apps || firebase.apps.length === 0) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            db = firebase.database();
            dataRef = db.ref('weightTrackerData');

            // First sync: push local data to Firebase if Firebase is empty,
            // otherwise pull Firebase data to local
            initialSync();

            // Listen for remote changes
            startListening();

            console.log('[Firebase] Initialized and syncing');
        } catch (error) {
            console.error('[Firebase] Init error:', error);
        }
    }

    /**
     * Merge two player datasets, keeping all logs
     */
    function mergePlayerData(localPlayer, remotePlayer) {
        if (!remotePlayer) return localPlayer;
        if (!localPlayer) return remotePlayer;

        return {
            ...remotePlayer,
            // Keep all daily logs from both sources
            dailyLogs: {
                ...localPlayer.dailyLogs,
                ...remotePlayer.dailyLogs
            }
        };
    }

    /**
     * Initial sync - merge local and remote data
     */
    function initialSync() {
        if (!dataRef) return;

        dataRef.once('value')
            .then((snapshot) => {
                const remoteData = snapshot.val();
                const localData = Storage.getData();

                console.log('[Firebase] Initial sync - Remote:', !!remoteData, 'Local players:', Object.keys(localData.players || {}).length);

                if (!remoteData) {
                    // Firebase is empty, push local data up
                    console.log('[Firebase] Firebase empty, pushing local data');
                    pushToFirebase(localData);
                } else if (remoteData.lastUpdated > localData.lastUpdated) {
                    // Remote is newer, but MERGE instead of replace
                    const remotePlayerCount = Object.keys(remoteData.players || {}).length;
                    const localPlayerCount = Object.keys(localData.players || {}).length;

                    if (remotePlayerCount > 0) {
                        console.log('[Firebase] Remote is newer, merging data');
                        // Merge players: remote data with local logs
                        const mergedPlayers = {};
                        Object.keys(remoteData.players || {}).forEach(playerId => {
                            mergedPlayers[playerId] = mergePlayerData(
                                localData.players?.[playerId],
                                remoteData.players[playerId]
                            );
                        });
                        // Also keep local-only players
                        Object.keys(localData.players || {}).forEach(playerId => {
                            if (!mergedPlayers[playerId]) {
                                mergedPlayers[playerId] = localData.players[playerId];
                            }
                        });

                        const mergedData = {
                            ...remoteData,
                            players: mergedPlayers,
                            lastUpdated: Math.max(localData.lastUpdated, remoteData.lastUpdated)
                        };

                        isSyncing = true;
                        Storage.saveData(mergedData);
                        isSyncing = false;
                        refreshUI();
                    } else if (localPlayerCount > 0 && remotePlayerCount === 0) {
                        // DANGER: Remote is empty but local has data - don't accept this!
                        console.warn('[Firebase] BLOCKED: Remote has 0 players but local has', localPlayerCount, '- refusing to accept empty data');
                        // Push our data to Firebase instead
                        pushToFirebase(localData);
                    }
                } else if (localData.lastUpdated > remoteData.lastUpdated) {
                    // Local is newer or has more data, push to Firebase
                    console.log('[Firebase] Local is newer, pushing to Firebase');
                    pushToFirebase(localData);
                }
                // If equal timestamps, no action needed
            })
            .catch((error) => {
                console.error('[Firebase] Initial sync error:', error);
                // If Firebase fails, just use local data
                console.log('[Firebase] Using local storage only');
            });
    }

    /**
     * Start listening for real-time changes from Firebase
     */
    let lastKnownData = null;
    function startListening() {
        if (!dataRef || isListening) return;

        dataRef.on('value', (snapshot) => {
            // Skip if we're the ones who just wrote (within 1 second)
            const now = Date.now();
            if (now - lastOwnWriteTime < 1000) {
                console.log('[Firebase] Ignoring our own write echo');
                return;
            }

            const remoteData = snapshot.val();
            if (!remoteData) return;

            const localData = Storage.getData();
            const remotePlayerCount = Object.keys(remoteData.players || {}).length;
            const localPlayerCount = Object.keys(localData.players || {}).length;

            // Only update if remote is significantly newer (more than 2 seconds)
            // This prevents sync loops while allowing legitimate updates
            if (remoteData.lastUpdated > localData.lastUpdated + 2000) {
                // SAFETY CHECK: Never accept empty data if we have players locally
                if (remotePlayerCount === 0 && localPlayerCount > 0) {
                    console.warn('[Firebase] BLOCKED: Refusing empty data from Firebase (local has', localPlayerCount, 'players)');
                    return;
                }

                console.log('[Firebase] Received update from another device');

                // Detect changes and send notifications
                detectChangesAndNotify(localData, remoteData);

                // MERGE instead of replace to preserve all logs
                const mergedPlayers = {};
                Object.keys(remoteData.players || {}).forEach(playerId => {
                    mergedPlayers[playerId] = mergePlayerData(
                        localData.players?.[playerId],
                        remoteData.players[playerId]
                    );
                });
                // Also keep local-only players
                Object.keys(localData.players || {}).forEach(playerId => {
                    if (!mergedPlayers[playerId]) {
                        mergedPlayers[playerId] = localData.players[playerId];
                    }
                });

                const mergedData = {
                    ...remoteData,
                    players: mergedPlayers
                };

                isSyncing = true;
                Storage.saveData(mergedData);
                isSyncing = false;
                refreshUI();
            }
        });

        isListening = true;
    }

    /**
     * Detect changes between local and remote data and trigger notifications
     */
    function detectChangesAndNotify(localData, remoteData) {
        const localPlayers = localData.players || {};
        const remotePlayers = remoteData.players || {};
        const today = Storage.getToday();

        Object.keys(remotePlayers).forEach(playerId => {
            const remotePlayer = remotePlayers[playerId];
            const localPlayer = localPlayers[playerId];

            if (!localPlayer) return; // Skip new players

            // Check for elimination change
            if (!localPlayer.eliminated && remotePlayer.eliminated) {
                sendNotification(`⚠️ ${remotePlayer.name} has been ELIMINATED!`, {
                    icon: '💥',
                    tag: 'elimination-' + playerId
                });
            }

            // Check for perfect day (all 8 tasks completed)
            const todayLog = remotePlayer.dailyLogs?.[today];
            const localTodayLog = localPlayer.dailyLogs?.[today];

            if (todayLog && (!localTodayLog || localTodayLog.completedCount !== todayLog.completedCount)) {
                if (todayLog.completedCount === 8) {
                    sendNotification(`🎉 ${remotePlayer.name} just completed PERFECT DAY! 8/8! 🔥`, {
                        icon: '✨',
                        tag: 'perfect-day-' + playerId
                    });
                } else if (todayLog.completedCount >= 6 && (!localTodayLog || localTodayLog.completedCount < 6)) {
                    sendNotification(`🔥 ${remotePlayer.name} just logged tasks! ${todayLog.completedCount}/8`, {
                        icon: '💪',
                        tag: 'tasks-logged-' + playerId
                    });
                }
            }
        });
    }

    /**
     * Send notification - both in-app toast and browser push
     */
    function sendNotification(message, options = {}) {
        // In-app toast notification
        if (typeof UI !== 'undefined' && UI.showToast) {
            UI.showToast(message);
        }

        // Browser push notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('75 Hard Challenge', {
                    body: message,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%230a0e27"/><rect x="32" y="32" width="128" height="128" fill="%23ff006e"/><text x="96" y="140" font-size="100" font-weight="900" fill="%2300f5ff" text-anchor="middle">75</text></svg>',
                    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%230a0e27"/><text x="96" y="140" font-size="100" font-weight="900" fill="%23ff006e" text-anchor="middle">75</text></svg>',
                    tag: options.tag || 'notification-' + Date.now(),
                    requireInteraction: false,
                    vibrate: [200, 100, 200]
                });
            } catch (error) {
                console.log('[Firebase] Notification error:', error);
            }
        }

        console.log('[Firebase] Notification sent:', message);
    }

    /**
     * Push data to Firebase
     */
    function pushToFirebase(data) {
        if (!dataRef) return;

        const playerCount = Object.keys(data.players || {}).length;
        console.log('[Firebase] Pushing data - Players:', playerCount);

        // Mark that we're making a write (used to ignore echo from Firebase listener)
        lastOwnWriteTime = Date.now();

        isSyncing = true;
        dataRef.set(data)
            .then(() => {
                isSyncing = false;
                console.log('[Firebase] Push successful - Players:', playerCount);
            })
            .catch((error) => {
                isSyncing = false;
                console.error('[Firebase] Push error:', error);
                console.warn('[Firebase] Data may not sync - running offline mode with local storage only');
            });
    }

    /**
     * Called by Storage.saveData() after every local write
     */
    function onDataChanged(data) {
        if (isSyncing) return; // Don't re-push data we just received
        pushToFirebase(data);
    }

    /**
     * Refresh the UI after receiving remote data
     */
    let lastReloadTime = 0;
    function refreshUI() {
        try {
            console.log('[Firebase] Data updated from another device');

            // Only reload if user is NOT actively logging tasks
            const currentScreen = UI.getCurrentScreen?.() || 'dashboard';
            const isInTasksScreen = currentScreen === 'player-detail';

            // Don't reload while user is logging tasks - they'll see updates when done
            if (isInTasksScreen) {
                console.log('[Firebase] Skipping reload - user is logging tasks');
                return;
            }

            // Debounce reloads (max once per 3 seconds) to prevent refresh loops
            const now = Date.now();
            if (now - lastReloadTime > 3000) {
                lastReloadTime = now;
                location.reload();
            }
        } catch (e) {
            console.warn('[Firebase] Unable to refresh UI:', e);
        }
    }

    return {
        init,
        onDataChanged
    };
})();
