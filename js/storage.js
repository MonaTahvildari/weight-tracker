/**
 * Storage Module - localStorage abstraction layer
 * Handles all data persistence with validation and export/import capabilities
 */

const Storage = (function() {
    const STORAGE_KEY = 'weightTrackerData';
    const VERSION = '1.0.0';

    // Default data structure
    const DEFAULT_DATA = {
        version: VERSION,
        lastUpdated: Date.now(),
        users: {
            katy: {
                profile: {
                    name: 'Katy',
                    height: null,
                    age: null,
                    gender: 'female',
                    goalWeight: null,
                    startWeight: null,
                    startDate: '2026-02-10',
                    setupComplete: false
                },
                dailyEntries: [],
                weightEntries: [],
                lastEntryDate: null,
                nextWeightPrompt: null
            },
            mona: {
                profile: {
                    name: 'Mona',
                    height: null,
                    age: null,
                    gender: 'female',
                    goalWeight: null,
                    startWeight: null,
                    startDate: '2026-02-10',
                    setupComplete: false
                },
                dailyEntries: [],
                weightEntries: [],
                lastEntryDate: null,
                nextWeightPrompt: null
            }
        },
        settings: {
            reminderTime: '21:00', // 9 PM
            theme: 'light',
            units: 'metric'
        }
    };

    /**
     * Initialize storage with default data if not exists
     */
    function init() {
        try {
            const existing = localStorage.getItem(STORAGE_KEY);
            if (!existing) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
                return DEFAULT_DATA;
            }
            return JSON.parse(existing);
        } catch (error) {
            console.error('Storage initialization error:', error);
            return DEFAULT_DATA;
        }
    }

    /**
     * Get all data from storage
     */
    function getData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : DEFAULT_DATA;
        } catch (error) {
            console.error('Error reading data:', error);
            return DEFAULT_DATA;
        }
    }

    /**
     * Save all data to storage
     */
    function saveData(data) {
        try {
            data.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded! Please export your data and clear old entries.');
            }
            return false;
        }
    }

    /**
     * Get user profile
     */
    function getUserProfile(userId) {
        const data = getData();
        return data.users[userId]?.profile || null;
    }

    /**
     * Update user profile
     */
    function updateUserProfile(userId, updates) {
        const data = getData();
        if (!data.users[userId]) {
            console.error('User not found:', userId);
            return false;
        }

        data.users[userId].profile = {
            ...data.users[userId].profile,
            ...updates
        };

        return saveData(data);
    }

    /**
     * Save daily entry
     */
    function saveDailyEntry(userId, entry) {
        const data = getData();
        if (!data.users[userId]) {
            console.error('User not found:', userId);
            return false;
        }

        // Generate ID if not exists
        if (!entry.id) {
            entry.id = generateId();
        }

        // Add timestamp if not exists
        if (!entry.timestamp) {
            entry.timestamp = Date.now();
        }

        // Calculate total calories
        entry.calories.total =
            (entry.calories.breakfast || 0) +
            (entry.calories.lunch || 0) +
            (entry.calories.dinner || 0) +
            (entry.calories.snack || 0);

        // Check if entry for this date already exists
        const existingIndex = data.users[userId].dailyEntries.findIndex(
            e => e.date === entry.date
        );

        if (existingIndex !== -1) {
            // Update existing entry
            data.users[userId].dailyEntries[existingIndex] = entry;
        } else {
            // Add new entry
            data.users[userId].dailyEntries.push(entry);
        }

        // Sort entries by date (newest first)
        data.users[userId].dailyEntries.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        // Update last entry date
        data.users[userId].lastEntryDate = entry.date;

        return saveData(data);
    }

    /**
     * Get daily entries for user
     */
    function getDailyEntries(userId, limit = null) {
        const data = getData();
        const entries = data.users[userId]?.dailyEntries || [];
        return limit ? entries.slice(0, limit) : entries;
    }

    /**
     * Get daily entry by date
     */
    function getDailyEntryByDate(userId, date) {
        const data = getData();
        return data.users[userId]?.dailyEntries.find(e => e.date === date) || null;
    }

    /**
     * Delete daily entry
     */
    function deleteDailyEntry(userId, entryId) {
        const data = getData();
        if (!data.users[userId]) return false;

        data.users[userId].dailyEntries = data.users[userId].dailyEntries.filter(
            e => e.id !== entryId
        );

        return saveData(data);
    }

    /**
     * Save weight entry
     */
    function saveWeightEntry(userId, entry) {
        const data = getData();
        if (!data.users[userId]) {
            console.error('User not found:', userId);
            return false;
        }

        // Generate ID if not exists
        if (!entry.id) {
            entry.id = generateId();
        }

        // Add timestamp if not exists
        if (!entry.timestamp) {
            entry.timestamp = Date.now();
        }

        // Calculate week number
        const startDate = new Date(data.users[userId].profile.startDate);
        const entryDate = new Date(entry.date);
        entry.weekNumber = Math.ceil((entryDate - startDate) / (7 * 24 * 60 * 60 * 1000));

        // Add entry
        data.users[userId].weightEntries.push(entry);

        // Sort entries by date (newest first)
        data.users[userId].weightEntries.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        // Calculate next weight prompt date (7 days from now)
        const nextDate = new Date(entryDate);
        nextDate.setDate(nextDate.getDate() + 7);
        data.users[userId].nextWeightPrompt = nextDate.toISOString().split('T')[0];

        return saveData(data);
    }

    /**
     * Get weight entries for user
     */
    function getWeightEntries(userId) {
        const data = getData();
        return data.users[userId]?.weightEntries || [];
    }

    /**
     * Get latest weight for user
     */
    function getLatestWeight(userId) {
        const entries = getWeightEntries(userId);
        if (entries.length === 0) {
            const profile = getUserProfile(userId);
            return profile.startWeight || null;
        }
        return entries[0].actualWeight;
    }

    /**
     * Check if weight entry is due
     */
    function isWeightEntryDue(userId) {
        const data = getData();
        const user = data.users[userId];

        if (!user) return false;

        // If no weight entries yet and profile is complete
        if (user.weightEntries.length === 0 && user.profile.setupComplete) {
            return true;
        }

        // Check if next prompt date has passed
        if (user.nextWeightPrompt) {
            const today = new Date().toISOString().split('T')[0];
            return today >= user.nextWeightPrompt;
        }

        return false;
    }

    /**
     * Check if daily entry exists for today
     */
    function hasTodayEntry(userId) {
        const today = new Date().toISOString().split('T')[0];
        const entry = getDailyEntryByDate(userId, today);
        return entry !== null;
    }

    /**
     * Calculate streak (consecutive days with entries)
     */
    function calculateStreak(userId) {
        const entries = getDailyEntries(userId);
        if (entries.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Check if there's an entry for today or yesterday (grace period)
        const todayStr = currentDate.toISOString().split('T')[0];
        currentDate.setDate(currentDate.getDate() - 1);
        const yesterdayStr = currentDate.toISOString().split('T')[0];

        let hasRecentEntry = entries.some(e => e.date === todayStr || e.date === yesterdayStr);
        if (!hasRecentEntry) return 0;

        // Count consecutive days
        currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < entries.length; i++) {
            const entryDateStr = currentDate.toISOString().split('T')[0];
            if (entries.some(e => e.date === entryDateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Get stats for user
     */
    function getUserStats(userId) {
        const profile = getUserProfile(userId);
        const dailyEntries = getDailyEntries(userId);
        const weightEntries = getWeightEntries(userId);
        const currentWeight = getLatestWeight(userId);
        const streak = calculateStreak(userId);

        // Calculate weight change this week
        let weekChange = null;
        if (weightEntries.length >= 2) {
            const latest = weightEntries[0].actualWeight;
            const previous = weightEntries[1].actualWeight;
            weekChange = latest - previous;
        }

        // Calculate total weight change
        let totalChange = null;
        if (profile.startWeight && currentWeight) {
            totalChange = currentWeight - profile.startWeight;
        }

        return {
            currentWeight,
            startWeight: profile.startWeight,
            goalWeight: profile.goalWeight,
            totalChange,
            weekChange,
            daysTracked: dailyEntries.length,
            weeksTracked: weightEntries.length,
            streak
        };
    }

    /**
     * Export all data as JSON
     */
    function exportData() {
        const data = getData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `weight-tracker-backup-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import data from JSON
     */
    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Basic validation
            if (!data.users || !data.version) {
                throw new Error('Invalid data format');
            }

            // Save imported data
            if (saveData(data)) {
                return { success: true, message: 'Data imported successfully!' };
            } else {
                throw new Error('Failed to save imported data');
            }
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, message: 'Failed to import data: ' + error.message };
        }
    }

    /**
     * Clear all data (reset)
     */
    function clearAllData() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get settings
     */
    function getSettings() {
        const data = getData();
        return data.settings || DEFAULT_DATA.settings;
    }

    /**
     * Update settings
     */
    function updateSettings(updates) {
        const data = getData();
        data.settings = {
            ...data.settings,
            ...updates
        };
        return saveData(data);
    }

    // Initialize on load
    init();

    // Public API
    return {
        init,
        getData,
        saveData,
        getUserProfile,
        updateUserProfile,
        saveDailyEntry,
        getDailyEntries,
        getDailyEntryByDate,
        deleteDailyEntry,
        saveWeightEntry,
        getWeightEntries,
        getLatestWeight,
        isWeightEntryDue,
        hasTodayEntry,
        calculateStreak,
        getUserStats,
        exportData,
        importData,
        clearAllData,
        getSettings,
        updateSettings
    };
})();
