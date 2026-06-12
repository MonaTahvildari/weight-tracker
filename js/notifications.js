/**
 * Notifications Module for 75 Hard Challenge
 * Handles task completion alerts and 12 PM elimination checks
 */

const Notifications = (function() {
    let last12PMCheck = null;

    /**
     * Initialize notifications
     */
    function init() {
        // Check every minute for 12 PM elimination check
        setInterval(checkDaily12PMElimination, 60000); // Every minute

        // Also check on app load
        checkDaily12PMElimination();
    }

    /**
     * Check at 12 PM for players who haven't logged
     */
    function checkDaily12PMElimination() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Check if it's 12:00 PM (noon)
        if (hours !== 12 || minutes > 1) return; // Allow 1 minute window

        // Don't check twice on the same day
        const today = Storage.getToday();
        if (last12PMCheck === today) return;
        last12PMCheck = today;

        const players = Storage.getAllPlayers();

        players.forEach(player => {
            if (player.eliminated) return; // Skip already eliminated

            const hasLogged = Storage.hasLoggedToday(player.id);

            if (!hasLogged) {
                // Haven't logged - check if they should be eliminated
                const log = Storage.getDailyLog(player.id, today);

                if (!log) {
                    // No tasks logged, eliminate them
                    Storage.eliminatePlayer(player.id, player.currentDay);
                    UI.showToast(`⚠️ ${player.name} has been ELIMINATED for not logging by 12 PM!`, 'error');
                }
            }
        });
    }

    /**
     * Show task completion notification
     */
    function showTaskCompletion(playerName, completedCount, totalCount) {
        const emoji = completedCount >= 8 ? '🔥' : '⚠️';
        const status = completedCount >= 8 ? 'crushed it' : 'needs to do better';

        UI.showToast(`${emoji} ${playerName} ${status}! ${completedCount}/${totalCount} tasks.`);
    }

    /**
     * Request browser notification permission
     */
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Send browser notification
     */
    function sendNotification(title, body) {
        if (Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '/weight-tracker/assets/icons/icon-192x192.png',
            badge: '/weight-tracker/assets/icons/icon-96x96.png',
            tag: '75hard-notification',
            renotify: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }

    // Public API
    return {
        init,
        showTaskCompletion,
        sendNotification,
        requestNotificationPermission
    };
})();
