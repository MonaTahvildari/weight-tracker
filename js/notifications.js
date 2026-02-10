/**
 * Notifications Module
 * Handles entry reminders and notifications
 */

const Notifications = (function() {

    /**
     * Check if reminders should be shown for user
     *
     * @param {string} userId - User ID
     */
    function checkReminders(userId) {
        if (!userId) return;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight
        const reminderTime = getReminderTimeInMinutes();

        // Only show reminders if it's past the reminder time
        if (currentTime < reminderTime) {
            return;
        }

        // Check if daily entry exists for today
        const hasEntry = Storage.hasTodayEntry(userId);
        if (!hasEntry) {
            UI.showReminderBanner();
            return;
        }

        // Check if weight entry is due
        const isWeightDue = Storage.isWeightEntryDue(userId);
        if (isWeightDue) {
            showWeightReminderBanner();
            return;
        }
    }

    /**
     * Get reminder time in minutes since midnight
     */
    function getReminderTimeInMinutes() {
        const settings = Storage.getSettings();
        const reminderTime = settings.reminderTime || '21:00'; // Default 9 PM

        const [hours, minutes] = reminderTime.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Show weight reminder banner
     */
    function showWeightReminderBanner() {
        const banner = document.getElementById('reminder-banner');
        if (!banner) return;

        const content = banner.querySelector('.reminder-text');
        const logNowBtn = document.getElementById('reminder-log-now');

        content.textContent = "Time for your weekly weigh-in! Let's track your progress.";

        // Update button to show weight form
        logNowBtn.onclick = () => {
            UI.hideReminderBanner();
            UI.showWeightEntryForm();
        };

        banner.classList.remove('hidden');
    }

    /**
     * Request notification permission (for PWA)
     */
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
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
     *
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     */
    function sendNotification(title, body) {
        if (Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body: body,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-96x96.png',
            tag: 'weight-tracker-reminder',
            renotify: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }

    /**
     * Schedule daily reminder
     * This would typically be done with a service worker in a full PWA
     */
    function scheduleDailyReminder() {
        const now = new Date();
        const reminderTime = getReminderTimeInMinutes();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        let timeUntilReminder;
        if (currentTime < reminderTime) {
            // Reminder is later today
            timeUntilReminder = (reminderTime - currentTime) * 60 * 1000;
        } else {
            // Reminder is tomorrow
            const minutesUntilMidnight = (24 * 60) - currentTime;
            timeUntilReminder = (minutesUntilMidnight + reminderTime) * 60 * 1000;
        }

        setTimeout(() => {
            const userId = UI.getCurrentUser();
            if (userId && !Storage.hasTodayEntry(userId)) {
                sendNotification(
                    'Weight Tracker Reminder',
                    "Don't forget to log your daily calories and exercise!"
                );
            }

            // Schedule next day's reminder
            scheduleDailyReminder();
        }, timeUntilReminder);
    }

    /**
     * Initialize notifications
     */
    function init() {
        // Request permission if in PWA context
        if (window.matchMedia('(display-mode: standalone)').matches) {
            requestNotificationPermission().then(granted => {
                if (granted) {
                    scheduleDailyReminder();
                }
            });
        }
    }

    // Public API
    return {
        init,
        checkReminders,
        requestNotificationPermission,
        sendNotification
    };
})();
