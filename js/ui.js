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

        document.getElementById('back-from-summary')?.addEventListener('click', () => {
            showScreen('dashboard');
            renderLeaderboard();
        });

        // Header buttons
        document.getElementById('today-btn')?.addEventListener('click', () => {
            showScreen('daily-summary');
            renderDailySummary();
        });

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

        // Set personal rule
        document.getElementById('set-rule-form')?.addEventListener('submit', handleSetPersonalRule);
        document.getElementById('refresh-avatar-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            refreshRuleAvatar();
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
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}" alt="${player.name}" class="admin-player-avatar" style="width: 40px; height: 40px; border-radius: 50%;">
                    <div>
                        <h3>${player.name}</h3>
                        <p>Day ${player.currentDay} • ${player.diet}</p>
                        <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 2px;">📌 ${player.personalRule}</p>
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
            // Refresh leaderboard in case user goes back to dashboard
            renderLeaderboard();
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
            // Calculate total tasks completed across all days
            const allLogs = player.dailyLogs || {};
            const totalTasksCompleted = Object.values(allLogs).reduce((sum, log) => sum + (log.completedCount || 0), 0);
            const totalTasksPossible = 600; // 75 days × 8 tasks
            const progress = (totalTasksCompleted / totalTasksPossible) * 100;

            const today = Storage.getToday();
            const isToday = !Storage.hasLoggedToday(player.id);

            return `
                <div class="player-card ${player.eliminated ? 'eliminated' : ''}" onclick="UI.selectPlayer('${player.id}')">
                    <div class="card-header">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}" alt="${player.name}" class="player-avatar" style="width: 48px; height: 48px; border-radius: 50%;">
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

    function renderDailySummary() {
        const today = Storage.getToday();
        const players = Storage.getAllPlayers();

        // Format date
        const dateObj = new Date(today);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        document.getElementById('summary-date').textContent = dateStr;

        const container = document.getElementById('daily-summary-list');

        if (players.length === 0) {
            container.innerHTML = '<p class="empty-state">No players yet</p>';
            return;
        }

        // Color palette for unique player colors
        const colors = [
            '#6366f1', // indigo
            '#ec4899', // pink
            '#f59e0b', // amber
            '#10b981', // emerald
            '#06b6d4', // cyan
            '#8b5cf6', // violet
            '#ef4444', // red
            '#14b8a6', // teal
        ];

        const taskNames = ['diet', 'alcohol', 'workout1', 'workout2', 'photo', 'water', 'reading', 'personal-rule'];
        const taskLabels = {
            'diet': 'Follow Diet',
            'alcohol': 'No Alcohol',
            'workout1': 'Workout 1 (Outdoor)',
            'workout2': 'Workout 2',
            'photo': 'Progress Photo',
            'water': 'Drink Water',
            'reading': 'Read 10 Pages',
            'personal-rule': 'Personal Rule'
        };
        const taskIcons = {
            'diet': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="20" cy="20" r="15"/><path d="M20 5v30M5 20h30"/><circle cx="20" cy="20" r="8" fill="currentColor" opacity="0.3"/></svg>',
            'alcohol': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8h16l-3 10h3c0 4-3 7-5 7s-5-3-5-7h3l-3-10z" stroke-linejoin="round"/><circle cx="20" cy="8" r="2" fill="currentColor"/><path d="M8 32h24" stroke-linecap="round" stroke-width="2.5"/><line x1="10" y1="28" x2="30" y2="28" stroke-width="2"/></svg>',
            'workout1': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="10" r="3" fill="currentColor"/><path d="M20 13v8"/><path d="M13 19l-5 8"/><path d="M27 19l5 8"/><path d="M14 27l-2 8"/><path d="M26 27l2 8"/></svg>',
            'workout2': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="10" width="7" height="18" rx="1"/><rect x="27" y="10" width="7" height="18" rx="1"/><path d="M13 19h14" stroke-width="2.5"/><circle cx="20" cy="6" r="2.5" fill="currentColor"/></svg>',
            'photo': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="32" height="24" rx="2"/><circle cx="20" cy="18" r="6"/><circle cx="10" cy="10" r="2" fill="currentColor"/><path d="M4 28l8-8m24 8l-8-8"/></svg>',
            'water': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4c-3 4-5 8-5 12 0 5 3 8 5 8s5-3 5-8c0-4-2-8-5-12z" fill="currentColor" opacity="0.3"/><path d="M12 20h16v10c0 2-2 4-4 4h-8c-2 0-4-2-4-4v-10z"/></svg>',
            'reading': '<svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6v28h20V6H10z"/><line x1="14" y1="10" x2="26" y2="10"/><line x1="14" y1="16" x2="26" y2="16"/><line x1="14" y1="22" x2="22" y2="22"/><line x1="14" y1="28" x2="26" y2="28"/><line x1="20" y1="6" x2="20" y2="34" stroke-width="1.5" opacity="0.5"/></svg>',
            'personal-rule': '<svg viewBox="0 0 40 40" width="28" height="28" fill="currentColor"><path d="M20 4l5 10h11l-9 7 3 10-10-7-10 7 3-10-9-7h11l5-10z" opacity="0.8"/><circle cx="20" cy="20" r="6" fill="currentColor"/></svg>'
        };

        container.innerHTML = players.map((player, index) => {
            const playerColor = colors[index % colors.length];
            const todayLog = Storage.getDailyLog(player.id, today);
            const tasks = todayLog ? todayLog.tasks : {};
            const completed = todayLog ? todayLog.completedCount : 0;
            const progressPercent = (completed / 8) * 100; // 8 tasks total

            const taskChecks = taskNames.map(taskKey => {
                const isCompleted = tasks[taskKey] || false;
                return `<span class="task-check ${isCompleted ? 'done' : 'pending'}" title="${taskLabels[taskKey]}" style="--task-color: ${playerColor}">
                    <span class="task-icon-wrapper" style="color: ${playerColor}; opacity: ${isCompleted ? '1' : '0.6'};">${taskIcons[taskKey]}</span>${isCompleted ? '<span class="task-done-mark">✓</span>' : ''}
                </span>`;
            }).join('');

            return `
                <div class="daily-summary-card ${player.eliminated ? 'eliminated' : ''}" style="--player-color: ${playerColor}">
                    <div class="summary-header">
                        <div class="summary-player">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}" alt="${player.name}" class="player-avatar" style="width: 48px; height: 48px; border-radius: 50%;">
                            <div>
                                <h3>${player.name}</h3>
                                <p class="summary-meta">Day ${player.currentDay || 1} • ${player.diet}</p>
                                <p style="font-size: 0.7rem; color: ${playerColor}; margin-top: 3px; font-weight: 600;">📌 ${player.personalRule}</p>
                            </div>
                        </div>
                        <div class="summary-score">
                            <span class="score-number">${completed}/8</span>
                            <span class="score-label">tasks</span>
                        </div>
                    </div>

                    <div class="summary-tasks">
                        ${taskChecks}
                    </div>

                    <div class="daily-progress-bar">
                        <div class="daily-progress-fill" style="width: ${progressPercent}%; background: ${playerColor}"></div>
                    </div>

                    ${player.eliminated ? '<div class="summary-eliminated">⚠️ ELIMINATED</div>' : completed >= 6 ? '<div class="summary-safe">✓ ON TRACK</div>' : '<div class="summary-warning">⚠️ NEEDS ' + (6 - completed) + ' MORE</div>'}
                </div>
            `;
        }).join('');
    }

    function selectPlayer(playerId) {
        selectedPlayerId = playerId;
        const player = Storage.getPlayer(playerId);

        if (!player) return;

        // Update detail view
        const detailAvatar = document.getElementById('detail-avatar');
        detailAvatar.style.backgroundImage = `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}')`;
        detailAvatar.style.backgroundSize = 'cover';
        detailAvatar.style.backgroundPosition = 'center';
        detailAvatar.textContent = '';
        document.getElementById('detail-player-name').textContent = player.name;
        document.getElementById('detail-player-diet').textContent = player.diet;
        document.getElementById('detail-status').textContent = `Day ${player.currentDay || 1}`;

        // Update personal rule display
        document.getElementById('personal-rule-name').textContent = player.personalRule;
        document.getElementById('personal-rule-desc').textContent = 'Your custom daily challenge';

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

        // Check if player has set their personal rule
        if (!player.personalRule) {
            // Show personal rule setup screen
            document.getElementById('rule-player-name').textContent = player.name;
            updateRuleAvatar();
            document.getElementById('pin-container').classList.add('hidden');
            document.getElementById('set-personal-rule').classList.remove('hidden');
            return;
        }

        // Show tasks form
        showTasksForm();
    }

    function showTasksForm() {
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
        document.getElementById('set-personal-rule').classList.add('hidden');
        document.getElementById('tasks-form').classList.remove('hidden');
        updateTasksCount();
    }

    function updateRuleAvatar() {
        const player = Storage.getPlayer(selectedPlayerId);
        if (!player) return;
        const avatarImg = document.getElementById('rule-avatar');
        avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed}&timestamp=${Date.now()}`;
    }

    function refreshRuleAvatar() {
        // Generate new random seed
        const newSeed = Math.random().toString(36).substr(2, 9);
        Storage.updatePlayerAvatarSeed(selectedPlayerId, newSeed);
        updateRuleAvatar();
        showToast('New avatar! Keep clicking if you want another 🎨');
    }

    function handleSetPersonalRule(e) {
        e.preventDefault();

        const personalRule = document.getElementById('set-rule-input').value.trim();
        const player = Storage.getPlayer(selectedPlayerId);

        if (!personalRule) {
            showToast('Please enter your personal rule!', 'error');
            return;
        }

        // Save the personal rule
        Storage.setPlayerPersonalRule(selectedPlayerId, personalRule);
        showToast(`${player.name}, your rule is set! Let's go! 🔥`);

        // Clear form and show tasks
        document.getElementById('set-rule-input').value = '';
        document.getElementById('set-personal-rule').classList.add('hidden');

        // Update the personal rule display in tasks form
        document.getElementById('personal-rule-name').textContent = personalRule;

        showTasksForm();
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

        if (completedCount >= 6) {
            showToast(`${player.name} crushed it! ${completedCount}/8 tasks done! 🔥`);
        } else {
            showToast(`${player.name} logged ${completedCount}/8 tasks. Check at 12 PM!`);
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
