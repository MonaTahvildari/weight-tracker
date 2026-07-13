/**
 * Main Application Controller
 * Initializes and coordinates all modules
 */

(function() {
    'use strict';

    /**
     * Check if app version is fresh (cache buster)
     */
    function checkAppVersion() {
        const CURRENT_VERSION = '1.2.5';
        const STORED_VERSION = localStorage.getItem('appVersion');

        if (STORED_VERSION !== CURRENT_VERSION) {
            console.log('[App] Version changed:', STORED_VERSION, '→', CURRENT_VERSION);
            localStorage.setItem('appVersion', CURRENT_VERSION);

            // Clear all caches to force fresh load
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
        }
    }

    /**
     * Initialize the application
     */
    function init() {
        checkAppVersion();
        console.log('75 Hard Challenge initializing...');

        try {
            // Initialize storage
            Storage.init();
            console.log('✓ Storage initialized');

            // Initialize UI
            UI.init();
            console.log('✓ UI initialized');

            // Initialize notifications
            Notifications.init();
            console.log('✓ Notifications initialized');

            // Initialize Firebase sync
            FirebaseSync.init();
            console.log('✓ Firebase sync initialized');

            // Initialize Firebase Cloud Messaging
            FirebaseMessaging.init();
            console.log('✓ Firebase Cloud Messaging initialized');

            // Hide loading overlay
            hideLoading();

            console.log('✓ 75 Hard Challenge ready!');

        } catch (error) {
            console.error('Error initializing app:', error);
            alert('Error initializing application. Please refresh the page.');
        }
    }

    /**
     * Hide loading overlay
     */
    function hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            setTimeout(() => {
                loading.classList.add('hidden');
            }, 300);
        }
    }

    /**
     * Log app information
     */
    function logAppInfo() {
        const data = Storage.getData();

        console.log('📊 Weight Tracker v' + data.version);
        console.log('👥 Users:', Object.keys(data.users).join(', '));

        Object.keys(data.users).forEach(userId => {
            const stats = Storage.getUserStats(userId);
            console.log(`\n${data.users[userId].profile.name}:`);
            console.log('  Days tracked:', stats.daysTracked);
            console.log('  Current weight:', stats.currentWeight ? stats.currentWeight + ' kg' : 'Not set');
            console.log('  Streak:', stats.streak + ' days');
        });

        console.log('\n💡 Tip: Use Storage.exportData() to backup your data');
    }

    /**
     * Handle app errors
     */
    function handleError(error, context) {
        console.error(`Error in ${context}:`, error);

        // Show user-friendly error message
        UI.showToast(`An error occurred in ${context}. Please try again.`, 'error');

        // Log to external service in production
        // Example: Sentry.captureException(error);
    }

    /**
     * Handle window beforeunload
     */
    function handleBeforeUnload(e) {
        // Check if there's unsaved data
        const currentScreen = UI.getCurrentScreen();
        const forms = ['daily-entry-form', 'weight-entry-form'];

        if (forms.includes(currentScreen)) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    /**
     * Handle visibility change (tab switching)
     */
    function handleVisibilityChange() {
        if (!document.hidden) {
            // User returned to the tab - refresh leaderboard if on dashboard
            const currentScreen = UI.getCurrentScreen();
            if (currentScreen === 'dashboard') {
                location.reload();
            }
        }
    }

    /**
     * Handle online/offline events
     */
    function handleOnlineStatus() {
        window.addEventListener('online', () => {
            UI.showToast('You are back online', 'success');
        });

        window.addEventListener('offline', () => {
            UI.showToast('You are offline. Data will be saved locally.', 'info');
        });
    }

    /**
     * Setup global error handling
     */
    function setupErrorHandling() {
        window.addEventListener('error', (e) => {
            handleError(e.error, 'Global');
        });

        window.addEventListener('unhandledrejection', (e) => {
            handleError(e.reason, 'Promise');
        });
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Before unload
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Visibility change
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Online/offline status
        handleOnlineStatus();
    }

    /**
     * Check for updates (in PWA context)
     */
    function checkForUpdates() {
        if ('serviceWorker' in navigator) {
            // Check for updates every 30 seconds
            setInterval(() => {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => {
                        registration.update();
                    });
                });
            }, 30000);

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[App] Service worker updated, reloading...');
                window.location.reload();
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const currentScreen = UI.getCurrentScreen();

            // ESC key - close modal or go back
            if (e.key === 'Escape') {
                const modal = document.getElementById('profile-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    return;
                }
                if (['daily-entry-form', 'weight-entry-form'].includes(currentScreen)) {
                    const backBtn = document.querySelector('.btn-back');
                    if (backBtn) backBtn.click();
                }
            }

            // Ctrl/Cmd + 1 - Katy tab
            if ((e.ctrlKey || e.metaKey) && e.key === '1') {
                e.preventDefault();
                UI.switchTab('katy');
            }

            // Ctrl/Cmd + 2 - Mona tab
            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                UI.switchTab('mona');
            }

            // Ctrl/Cmd + E - Export data
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                Storage.exportData();
            }

            // Ctrl/Cmd + N - New entry (when on dashboard)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && currentScreen === 'dashboard') {
                e.preventDefault();
                UI.showDailyEntryForm();
            }
        });
    }

    /**
     * Initialize performance monitoring
     */
    function monitorPerformance() {
        if ('performance' in window && 'PerformanceObserver' in window) {
            // Log load time
            window.addEventListener('load', () => {
                const perfData = performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log('⚡ Page load time:', pageLoadTime + 'ms');
            });
        }
    }

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Setup additional features
    setupErrorHandling();
    setupEventListeners();
    setupKeyboardShortcuts();
    checkForUpdates();
    monitorPerformance();

    // Expose global API for debugging
    window.HardChallenge = {
        Storage,
        UI,
        Notifications,
        version: '1.0.1',
        // Debug commands
        checkPlayers: () => {
            const players = Storage.getAllPlayers();
            console.log('All players:');
            players.forEach(p => {
                console.log(`- ${p.name}: eliminated=${p.eliminated}, day=${p.currentDay}, logs=${Object.keys(p.dailyLogs || {}).length}`);
            });
        },
        clearEliminations: () => {
            const data = Storage.getData();
            Object.values(data.players || {}).forEach(p => {
                p.eliminated = false;
                p.eliminatedDate = null;
            });
            Storage.saveData(data);
            console.log('All eliminations cleared!');
            location.reload();
        }
    };

})();
