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
        lastUpdated: Date.now(),
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
    function addPlayer(name, pin, diet) {
        const data = getData();
        const playerId = generateId();

        data.players[playerId] = {
            id: playerId,
            name,
            pin,
            diet,
            currentDay: 1,
            eliminated: false,
            eliminatedDate: null,
            createdAt: new Date().toISOString(),
            dailyLogs: {}
        };

        saveData(data);
        return playerId;
    }

    /**
     * Remove a player
     */
    function removePlayer(playerId) {
        const data = getData();
        delete data.players[playerId];
        saveData(data);
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

        return player;
    }

    /**
     * Get all players
     */
    function getAllPlayers() {
        const data = getData();
        return Object.values(data.players);
    }

    /**
     * Get player by name (for display)
     */
    function getPlayerByName(name) {
        const data = getData();
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

        // Check if player should be eliminated
        if (completedCount < 8) {
            eliminatePlayer(playerId, day);
        } else {
            // Advance to next day if not eliminated
            player.currentDay = Math.min(day + 1, 75);
        }

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
        getAllPlayers,
        getPlayerByName,
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
