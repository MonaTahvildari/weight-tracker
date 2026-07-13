/**
 * Storage Module for 75 Hard Challenge
 * Manages local storage and data persistence
 */

const Storage = (function() {
    const STORAGE_KEY = '75hard_data';
    const VERSION = '1.0.0';

    // Default data structure
    const DEFAULT_DATA = {
        version: VERSION,
        lastUpdated: 0, // Use 0 so Firebase data is always newer on first load
        players: {}
    };

    /**
     * Initialize storage
     */
    function init() {
        if (!getData()) {
            saveData(DEFAULT_DATA);
        }
    }

    /**
     * Get all data
     */
    function getData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : DEFAULT_DATA;
        } catch (error) {
            console.error('Error reading storage:', error);
            return DEFAULT_DATA;
        }
    }

    /**
     * Save all data
     */
    function saveData(data) {
        try {
            data.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            // Notify Firebase sync
            if (typeof FirebaseSync !== 'undefined' && FirebaseSync.onDataChanged) {
                FirebaseSync.onDataChanged(data);
            }
        } catch (error) {
            console.error('Error saving storage:', error);
        }
    }

    /**
     * Add a new player
     */
    function addPlayer(name, pin, diet, personalRule = '') {
        const data = getData();

        // Ensure players object exists
        if (!data.players) {
            data.players = {};
        }

        const playerId = generateId();
        const avatarSeed = generateId(); // Random seed for DiceBear avatar

        const today = new Date().toISOString().split('T')[0];

        data.players[playerId] = {
            id: playerId,
            name,
            pin,
            diet,
            personalRule,
            avatarSeed,
            currentDay: 1,
            eliminated: false,
            eliminatedDate: null,
            lastAdvancedDate: null,
            startDate: today,
            createdAt: new Date().toISOString(),
            dailyLogs: {}
        };

        saveData(data);
        return playerId;
    }

    /**
     * Update player's personal rule
     */
    function setPlayerPersonalRule(playerId, personalRule) {
        const data = getData();
        const player = data.players[playerId];

        if (player) {
            player.personalRule = personalRule;
            saveData(data);
            return true;
        }
        return false;
    }

    /**
     * Update player's avatar seed
     */
    function updatePlayerAvatarSeed(playerId, newSeed) {
        const data = getData();
        const player = data.players[playerId];

        if (player) {
            player.avatarSeed = newSeed;
            saveData(data);
            return true;
        }
        return false;
    }

    /**
     * Remove a player
     */
    function removePlayer(playerId) {
        const data = getData();
        if (!data.players) {
            data.players = {};
        }
        delete data.players[playerId];
        saveData(data);
    }

    /**
     * Get current day for a player (unified day calculation)
     */
    function getPlayerCurrentDay(playerId) {
        const player = getPlayer(playerId);
        if (!player) return 1;
        return player.currentDay || 1;
    }

    /**
     * Get player by ID
     */
    function getPlayer(playerId) {
        const data = getData();
        const player = data.players[playerId];

        if (!player) return null;

        // Ensure currentDay exists
        if (!player.currentDay) {
            player.currentDay = 1;
        }

        // Ensure startDate exists (for backward compatibility with old players)
        if (!player.startDate) {
            player.startDate = player.createdAt ? player.createdAt.split('T')[0] : getToday();
            saveData(data);
        }

        // Advance day counter once per calendar day (only if not eliminated)
        if (!player.eliminated) {
            const today = getToday();

            // Initialize lastAdvancedDate on first run
            if (!player.lastAdvancedDate) {
                player.lastAdvancedDate = today;
            }

            // If a new day has passed, increment the counter
            if (player.lastAdvancedDate !== today) {
                player.currentDay = Math.min((player.currentDay || 1) + 1, 75);
                player.lastAdvancedDate = today;
                saveData(data); // Persist the day advancement
            }
        }
        // If eliminated, currentDay stays frozen at the day they were eliminated

        // Ensure avatarSeed exists (for backward compatibility with old players)
        if (!player.avatarSeed) {
            player.avatarSeed = generateId();
            saveData(data);
        }

        return player;
    }

    /**
     * Get all players
     */
    function getAllPlayers() {
        const data = getData();
        if (!data.players) {
            return [];
        }

        // Ensure all players have avatarSeed for DiceBear avatars
        let needsSave = false;
        Object.values(data.players).forEach(player => {
            if (!player.avatarSeed) {
                player.avatarSeed = generateId();
                needsSave = true;
            }
        });

        if (needsSave) {
            saveData(data);
        }

        return Object.values(data.players);
    }

    /**
     * Get player by name (for display)
     */
    function getPlayerByName(name) {
        const data = getData();
        if (!data.players) {
            return null;
        }
        return Object.values(data.players).find(p => p.name === name) || null;
    }

    /**
     * Save daily tasks for a player
     */
    function saveDailyTasks(playerId, day, tasks, timestamp) {
        const data = getData();
        const player = data.players[playerId];

        if (!player) return false;

        if (!player.dailyLogs) {
            player.dailyLogs = {};
        }

        const completedCount = Object.values(tasks).filter(v => v === true).length;

        player.dailyLogs[day] = {
            tasks,
            completedCount,
            timestamp: timestamp || new Date().toISOString()
        };

        // Day advancement is calculated in getPlayer() based on successful days + startDate
        // No manual increment needed here

        saveData(data);
        return true;
    }

    /**
     * Eliminate a player
     */
    function eliminatePlayer(playerId, day) {
        const data = getData();
        const player = data.players[playerId];

        if (player) {
            player.eliminated = true;
            player.eliminatedDate = new Date().toISOString();
            player.currentDay = day;
            saveData(data);
        }
    }

    /**
     * Reset a player to day 1
     */
    function resetPlayer(playerId) {
        const data = getData();
        const player = data.players[playerId];

        if (player) {
            player.currentDay = 1;
            player.eliminated = false;
            player.eliminatedDate = null;
            player.lastAdvancedDate = getToday(); // Reset advancement tracker
            player.dailyLogs = {};
            saveData(data);
        }
    }

    /**
     * Get daily log for a player
     */
    function getDailyLog(playerId, day) {
        const player = getPlayer(playerId);
        if (!player || !player.dailyLogs) return null;
        return player.dailyLogs[day] || null;
    }

    /**
     * Get player stats
     */
    function getPlayerStats(playerId) {
        const player = getPlayer(playerId);
        if (!player) return null;

        const logsCompleted = Object.keys(player.dailyLogs || {}).length;
        const avgCompletion = logsCompleted > 0
            ? Object.values(player.dailyLogs).reduce((sum, log) => sum + (log.completedCount || 0), 0) / logsCompleted
            : 0;

        return {
            currentDay: player.currentDay,
            eliminated: player.eliminated,
            logsCompleted,
            avgCompletion: Math.round(avgCompletion * 100) / 100
        };
    }

    /**
     * Check if player has logged today
     */
    function hasLoggedToday(playerId) {
        const player = getPlayer(playerId);
        if (!player) return false;

        const today = getToday();
        return player.dailyLogs && player.dailyLogs[today] ? true : false;
    }

    /**
     * Get today's date as YYYY-MM-DD
     */
    function getToday() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    /**
     * Export data
     */
    function exportData() {
        const data = getData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `75hard-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import data
     */
    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.version && data.players) {
                saveData(data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * Clear all data
     */
    function clearAllData() {
        if (confirm('Are you sure? This will delete all data!')) {
            localStorage.removeItem(STORAGE_KEY);
            saveData(DEFAULT_DATA);
            return true;
        }
        return false;
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    return {
        init,
        getData,
        saveData,
        addPlayer,
        removePlayer,
        getPlayer,
        getPlayerCurrentDay,
        getAllPlayers,
        getPlayerByName,
        setPlayerPersonalRule,
        updatePlayerAvatarSeed,
        saveDailyTasks,
        eliminatePlayer,
        resetPlayer,
        getDailyLog,
        getPlayerStats,
        hasLoggedToday,
        getToday,
        exportData,
        importData,
        clearAllData
    };
})();
