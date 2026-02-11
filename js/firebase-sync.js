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
     * Initial sync - merge local and remote data
     */
    function initialSync() {
        if (!dataRef) return;

        dataRef.once('value')
            .then((snapshot) => {
                const remoteData = snapshot.val();
                const localData = Storage.getData();

                if (!remoteData) {
                    // Firebase is empty, push local data up
                    pushToFirebase(localData);
                } else if (!localData || localData.lastUpdated < remoteData.lastUpdated) {
                    // Remote is newer, update local
                    isSyncing = true;
                    Storage.saveData(remoteData);
                    isSyncing = false;
                    refreshUI();
                } else if (localData.lastUpdated > remoteData.lastUpdated) {
                    // Local is newer, push to Firebase
                    pushToFirebase(localData);
                }
                // If equal timestamps, no action needed
            })
            .catch((error) => {
                console.error('[Firebase] Initial sync error:', error);
            });
    }

    /**
     * Start listening for real-time changes from Firebase
     */
    function startListening() {
        if (!dataRef || isListening) return;

        dataRef.on('value', (snapshot) => {
            // Skip if we're the ones who just wrote
            if (isSyncing) return;

            const remoteData = snapshot.val();
            if (!remoteData) return;

            const localData = Storage.getData();

            // Only update if remote is newer
            if (remoteData.lastUpdated > localData.lastUpdated) {
                isSyncing = true;
                Storage.saveData(remoteData);
                isSyncing = false;
                refreshUI();
                console.log('[Firebase] Received update from other device');
            }
        });

        isListening = true;
    }

    /**
     * Push data to Firebase
     */
    function pushToFirebase(data) {
        if (!dataRef) return;

        isSyncing = true;
        dataRef.set(data)
            .then(() => {
                isSyncing = false;
            })
            .catch((error) => {
                isSyncing = false;
                console.error('[Firebase] Push error:', error);
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
    function refreshUI() {
        try {
            const userId = UI.getCurrentUser();
            if (userId) {
                UI.switchTab(userId);
                UI.updateTabStreaks();
            }
        } catch (e) {
            // UI might not be initialized yet
        }
    }

    return {
        init,
        onDataChanged
    };
})();
