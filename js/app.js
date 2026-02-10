/**
 * Main Application Controller
 * Initializes and coordinates all modules
 */

(function() {
    'use strict';

    /**
     * Initialize the application
     */
    function init() {
        console.log('Weight Tracker initializing...');

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

            // Hide loading overlay
            hideLoading();

            console.log('✓ Weight Tracker ready!');

            // Log app info
            logAppInfo();

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
        const forms = ['daily-entry-form', 'weight-entry-form', 'profile-setup'];

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
            // User returned to the tab
            const userId = UI.getCurrentUser();
            if (userId) {
                // Refresh reminders
                Notifications.checkReminders(userId);

                // Update user cards
                UI.updateUserCards();
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
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (confirm('A new version is available. Reload to update?')) {
                    window.location.reload();
                }
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const currentScreen = UI.getCurrentScreen();

            // ESC key - go back
            if (e.key === 'Escape') {
                if (currentScreen === 'dashboard') {
                    // Go back to user selection
                    const backBtn = document.getElementById('back-to-selection');
                    if (backBtn) backBtn.click();
                } else if (['daily-entry-form', 'weight-entry-form'].includes(currentScreen)) {
                    // Go back to dashboard
                    const backBtn = document.querySelector('.btn-back');
                    if (backBtn) backBtn.click();
                }
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
    window.WeightTracker = {
        Storage,
        Calculations,
        UI,
        Charts,
        Notifications,
        version: '1.0.0'
    };

})();
