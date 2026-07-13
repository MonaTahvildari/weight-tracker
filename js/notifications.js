/**
 * Notifications Module for 75 Hard Challenge
 * Handles task completion alerts and 12 PM elimination checks
 */

const Notifications = (function() {
    /**
     * Initialize notifications
     */
    function init() {
        // Check every minute for 12 PM elimination check
        setInterval(checkDaily12PMElimination, 60000); // Every minute

        // Check every minute for 11:50 PM reminder
        setInterval(checkDaily1150PMReminder, 60000); // Every minute

        // Also check on app load
        checkDaily12PMElimination();
        checkDaily1150PMReminder();
    }

    /**
     * Get/set last check date from localStorage
     */
    function getLastCheck(type) {
        return localStorage.getItem(`lastCheck_${type}`);
    }

    function setLastCheck(type, date) {
        localStorage.setItem(`lastCheck_${type}`, date);
    }

    /**
     * Check daily: eliminate players who didn't complete yesterday (6+ tasks)
     */
    function checkDaily12PMElimination() {
        const today = Storage.getToday();

        // Only check once per day (persisted in localStorage)
        if (getLastCheck('elimination') === today) return;
        setLastCheck('elimination', today);

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
                notifyElimination(player.name, player.currentDay);
            }
        });
    }

    /**
     * Check at 11:50 PM for daily reminder
     */
    function checkDaily1150PMReminder() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Check if it's 11:50 PM (23:50)
        if (hours !== 23 || minutes < 50 || minutes > 51) return; // Allow 1 minute window

        // Don't check twice on the same day (persisted in localStorage)
        const today = Storage.getToday();
        if (getLastCheck('reminder') === today) return;
        setLastCheck('reminder', today);

        const players = Storage.getAllPlayers();

        players.forEach(player => {
            if (player.eliminated) return; // Skip already eliminated

            const hasLogged = Storage.hasLoggedToday(player.id);

            if (!hasLogged) {
                // Haven't logged today - send reminder
                const message = `⏰ ${player.name}, you have 10 minutes left to log your tasks! Don't lose your progress! 🔥`;
                sendNotification(message, { tag: 'daily-reminder-' + player.id });
                UI.showToast(message);
            }
        });
    }

    /**
     * Notify when a player logs tasks
     */
    function notifyTaskLogging(playerName, completedCount) {
        const message = completedCount === 8
            ? `🎉 ${playerName} just crushed it! PERFECT DAY 8/8! 🔥`
            : `🔥 ${playerName} just logged ${completedCount}/8 tasks!`;

        sendNotification(message, { tag: 'task-logged-' + playerName });
        UI.showToast(message);
    }

    /**
     * Notify when a player is eliminated
     */
    function notifyElimination(playerName, day) {
        const message = `💥 ELIMINATED! ${playerName} is OUT after Day ${day}! 😬`;
        sendNotification(message, { tag: 'eliminated-' + playerName });
        UI.showToast(message, 'error');
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
        requestNotificationPermission,
        notifyTaskLogging,
        notifyElimination
    };
})();
