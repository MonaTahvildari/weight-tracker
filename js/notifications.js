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
     * Check daily: eliminate players who didn't complete yesterday (6+ tasks)
     */
    function checkDaily12PMElimination() {
        const today = Storage.getToday();

        // Only check once per day
        if (last12PMCheck === today) return;
        last12PMCheck = today;

        const players = Storage.getAllPlayers();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        players.forEach(player => {
            if (player.eliminated) return; // Skip already eliminated

            // Check if player has a log for yesterday with 6+ tasks
            const yesterdayLog = Storage.getDailyLog(player.id, yesterdayStr);

            if (!yesterdayLog || yesterdayLog.completedCount < 6) {
                // Yesterday they didn't complete 6+ tasks (or no log) → eliminate
                Storage.eliminatePlayer(player.id, player.currentDay);
                UI.showToast(`⚠️ ${player.name} has been ELIMINATED for not completing 6+ tasks yesterday!`, 'error');
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
