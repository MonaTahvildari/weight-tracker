/**
 * UI Module for 75 Hard Challenge
 * Handles all UI rendering and user interactions
 */

const UI = (function() {
    let currentScreen = 'dashboard';
    let selectedPlayerId = null;

    function init() {
        setupEventListeners();
        showScreen('dashboard');
        renderLeaderboard();
    }

    function setupEventListeners() {
        // Back buttons
        document.getElementById('back-from-detail')?.addEventListener('click', () => {
            showScreen('dashboard');
            renderLeaderboard();
        });

        document.getElementById('back-from-rules')?.addEventListener('click', () => {
            showScreen('dashboard');
        });

        document.getElementById('back-from-admin')?.addEventListener('click', () => {
            showScreen('dashboard');
        });

        // Header buttons
        document.getElementById('rules-btn')?.addEventListener('click', () => {
            showScreen('rules-screen');
        });

        document.getElementById('admin-btn')?.addEventListener('click', () => {
            showScreen('admin-screen');
            resetAdminForm();
        });

        // FAB
        document.getElementById('fab')?.addEventListener('click', () => {
            const players = Storage.getAllPlayers();
            if (players.length === 0) {
                showToast('Add players via Admin Panel first!');
                showScreen('admin-screen');
            } else {
                showLeaderboardAndPickPlayer();
            }
        });

        // Admin login
        document.getElementById('admin-login')?.addEventListener('click', handleAdminLogin);
        document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminLogin();
        });

        // Add player form
        document.getElementById('add-player-form')?.addEventListener('submit', handleAddPlayer);

        // PIN entry
        document.getElementById('pin-submit')?.addEventListener('click', handlePINSubmit);
        document.getElementById('pin-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handlePINSubmit();
        });

        // Tasks form
        document.getElementById('tasks-form')?.addEventListener('submit', handleTasksSubmit);

        // Task checkboxes
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateTasksCount);
        });
    }

    function handleAdminLogin() {
        const password = document.getElementById('admin-password').value;
        if (password === '0189') {
            document.getElementById('admin-auth').classList.add('hidden');
            document.getElementById('admin-controls').classList.remove('hidden');
            renderAdminPlayersList();
        } else {
            showToast('Incorrect password!', 'error');
            document.getElementById('admin-password').value = '';
        }
    }

    function resetAdminForm() {
        document.getElementById('admin-auth').classList.remove('hidden');
        document.getElementById('admin-controls').classList.add('hidden');
        document.getElementById('admin-password').value = '';
    }

    function handleAddPlayer(e) {
        e.preventDefault();

        const name = document.getElementById('player-name').value.trim();
        const pin = document.getElementById('player-pin').value.trim();
        const diet = document.getElementById('player-diet').value.trim();

        if (!name || !pin || !diet) {
            showToast('All fields required!', 'error');
            return;
        }

        Storage.addPlayer(name, pin, diet);
        showToast(`${name} added to the challenge!`);

        // Clear form and refresh list
        document.getElementById('add-player-form').reset();
        renderAdminPlayersList();
    }

    function renderAdminPlayersList() {
        const container = document.getElementById('admin-players-list');
        const players = Storage.getAllPlayers();

        if (players.length === 0) {
            container.innerHTML = '<p class="empty-state">No players yet</p>';
            return;
        }

        container.innerHTML = players.map(player => `
            <div class="admin-player-item">
                <div class="admin-player-info">
                    <div class="admin-player-avatar">${player.name[0]}</div>
                    <div>
                        <h3>${player.name}</h3>
                        <p>Day ${player.currentDay} • ${player.diet}</p>
                        ${player.eliminated ? '<p class="eliminated">ELIMINATED</p>' : ''}
                    </div>
                </div>
                <button class="btn-icon btn-delete" onclick="UI.removePlayer('${player.id}')" title="Remove">✕</button>
            </div>
        `).join('');
    }

    function removePlayer(playerId) {
        const player = Storage.getPlayer(playerId);
        if (!player) return;

        if (confirm(`Remove ${player.name} from the challenge?`)) {
            Storage.removePlayer(playerId);
            showToast(`${player.name} removed!`);
            renderAdminPlayersList();
        }
    }

    function renderLeaderboard() {
        const container = document.getElementById('players-grid');
        const players = Storage.getAllPlayers();

        if (players.length === 0) {
            document.getElementById('no-players').classList.remove('hidden');
            container.innerHTML = '';
            return;
        }

        document.getElementById('no-players').classList.add('hidden');

        // Sort by current day (descending), then by name
        const sorted = [...players].sort((a, b) => {
            if (a.eliminated && !b.eliminated) return 1;
            if (!a.eliminated && b.eliminated) return -1;
            return b.currentDay - a.currentDay;
        });

        container.innerHTML = sorted.map(player => {
            const today = Storage.getToday();
            const todayLog = Storage.getDailyLog(player.id, today);
            const tasksCompleted = todayLog ? todayLog.completedCount : 0;
            const progress = (tasksCompleted / 10) * 100;
            const isToday = !Storage.hasLoggedToday(player.id);

            return `
                <div class="player-card ${player.eliminated ? 'eliminated' : ''}" onclick="UI.selectPlayer('${player.id}')">
                    <div class="card-header">
                        <div class="player-avatar">${player.name[0]}</div>
                        <div class="card-title">
                            <h3>${player.name}</h3>
                            <p class="diet-badge">${player.diet}</p>
                        </div>
                        ${player.eliminated ? '<span class="status-eliminated">OUT</span>' : ''}
                    </div>

                    <div class="progress-section">
                        <div class="progress-info">
                            <span class="progress-label">Day ${player.currentDay || 1}</span>
                            <span class="progress-percent">${progress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>

                    ${isToday && !player.eliminated ? '<div class="needs-logging">⚠️ No entry today</div>' : ''}

                    <div class="card-footer">
                        <span class="stat">${Object.keys(player.dailyLogs || {}).length} logged</span>
                        <span class="stat">${Object.values(player.dailyLogs || {}).reduce((sum, log) => sum + (log.completedCount || 0), 0) || 0}/${Object.keys(player.dailyLogs || {}).length * 10 || 0} tasks</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function selectPlayer(playerId) {
        selectedPlayerId = playerId;
        const player = Storage.getPlayer(playerId);

        if (!player) return;

        // Update detail view
        document.getElementById('detail-avatar').textContent = player.name[0];
        document.getElementById('detail-player-name').textContent = player.name;
        document.getElementById('detail-player-diet').textContent = player.diet;
        document.getElementById('detail-status').textContent = `Day ${player.currentDay || 1}`;

        if (player.eliminated) {
            document.getElementById('detail-eliminated-badge').classList.remove('hidden');
        } else {
            document.getElementById('detail-eliminated-badge').classList.add('hidden');
        }

        // Reset PIN form
        document.getElementById('pin-container').classList.remove('hidden');
        document.getElementById('tasks-form').classList.add('hidden');
        document.getElementById('completed-view').classList.add('hidden');
        document.getElementById('pin-input').value = '';

        // Update date display
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        document.getElementById('task-date').textContent = dateStr;

        // Reset checkboxes
        document.querySelectorAll('.task-checkbox').forEach(cb => cb.checked = false);

        showScreen('player-detail');
    }

    function handlePINSubmit() {
        const pin = document.getElementById('pin-input').value;
        const player = Storage.getPlayer(selectedPlayerId);

        if (!player) {
            showToast('Player not found!', 'error');
            return;
        }

        if (pin !== player.pin) {
            showToast('Incorrect PIN!', 'error');
            document.getElementById('pin-input').value = '';
            return;
        }

        // Check if already logged today
        if (Storage.hasLoggedToday(selectedPlayerId)) {
            const log = Storage.getDailyLog(selectedPlayerId, Storage.getToday());
            if (log && log.tasks) {
                // Pre-fill form with existing tasks
                Object.keys(log.tasks).forEach(taskKey => {
                    const checkbox = document.querySelector(`input[name="task"][value="${taskKey}"]`);
                    if (checkbox) {
                        checkbox.checked = log.tasks[taskKey];
                    }
                });
            }
        }

        document.getElementById('pin-container').classList.add('hidden');
        document.getElementById('tasks-form').classList.remove('hidden');
        updateTasksCount();
    }

    function updateTasksCount() {
        const checked = document.querySelectorAll('.task-checkbox:checked').length;
        const total = document.querySelectorAll('.task-checkbox').length;
        document.getElementById('tasks-count').textContent = `${checked}/${total}`;
    }

    function handleTasksSubmit(e) {
        e.preventDefault();

        const tasks = {};
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            tasks[checkbox.value] = checkbox.checked;
        });

        const today = Storage.getToday();
        const player = Storage.getPlayer(selectedPlayerId);

        Storage.saveDailyTasks(selectedPlayerId, today, tasks);

        // Show completion message
        document.getElementById('tasks-form').classList.add('hidden');
        document.getElementById('completed-view').classList.remove('hidden');

        const completedCount = Object.values(tasks).filter(v => v).length;

        if (completedCount >= 8) {
            showToast(`${player.name} crushed it! ${completedCount}/10 tasks done! 🔥`);
        } else {
            showToast(`${player.name} logged ${completedCount}/10 tasks. Check at 12 PM!`);
        }

        // Auto return after 2 seconds
        setTimeout(() => {
            showScreen('dashboard');
            renderLeaderboard();
        }, 2000);
    }

    function showLeaderboardAndPickPlayer() {
        showScreen('dashboard');
    }

    function showScreen(screenId) {
        currentScreen = screenId;

        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show requested screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');

        toastMessage.textContent = message;
        toast.classList.remove('hidden', 'error');
        if (type === 'error') toast.classList.add('error');
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    // Public API
    return {
        init,
        showScreen,
        showToast,
        selectPlayer,
        removePlayer,
        getCurrentScreen: () => currentScreen
    };
})();
