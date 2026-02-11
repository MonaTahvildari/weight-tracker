/**
 * UI Module
 * Handles all UI rendering and user interactions
 */

const UI = (function() {
    let activeTab = 'katy';
    let currentScreen = 'dashboard';

    /**
     * Initialize UI elements and event listeners
     */
    function init() {
        setupEventListeners();
        updateTabStreaks();
        switchTab('katy');
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.user);
            });
        });

        // Back buttons (from forms back to dashboard)
        document.getElementById('back-from-daily')?.addEventListener('click', () => {
            showScreen('dashboard');
        });

        document.getElementById('back-from-weight')?.addEventListener('click', () => {
            showScreen('dashboard');
        });

        // FAB button
        document.getElementById('fab')?.addEventListener('click', () => {
            showDailyEntryForm();
        });

        // Forms
        document.getElementById('profile-form')?.addEventListener('submit', handleProfileSubmit);
        document.getElementById('daily-form')?.addEventListener('submit', handleDailySubmit);
        document.getElementById('weight-form')?.addEventListener('submit', handleWeightSubmit);

        // Form interactions
        setupFormInteractions();

        // Data management
        document.getElementById('export-data-btn')?.addEventListener('click', () => {
            Storage.exportData();
            showToast('Data exported successfully!');
        });

        document.getElementById('reset-data-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset ALL data? This cannot be undone!')) {
                Storage.clearAllData();
                location.reload();
            }
        });

        // Profile modal
        document.getElementById('close-profile-modal')?.addEventListener('click', hideProfileModal);
        document.getElementById('profile-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hideProfileModal();
        });

        // Reminder banner
        document.getElementById('reminder-log-now')?.addEventListener('click', () => {
            hideReminderBanner();
            showDailyEntryForm();
        });

        document.getElementById('reminder-dismiss')?.addEventListener('click', () => {
            hideReminderBanner();
        });
    }

    /**
     * Setup form interactions
     */
    function setupFormInteractions() {
        // Calculate total calories
        const calorieInputs = ['breakfast', 'lunch', 'dinner', 'snack'];
        calorieInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', updateTotalCalories);
            }
        });

        // Workout toggle
        const workoutCheckbox = document.getElementById('workout-completed');
        if (workoutCheckbox) {
            workoutCheckbox.addEventListener('change', (e) => {
                const exercisesDiv = document.getElementById('workout-exercises');
                if (e.target.checked) {
                    exercisesDiv.classList.remove('hidden');
                } else {
                    exercisesDiv.classList.add('hidden');
                    document.querySelectorAll('input[name="exercise"]').forEach(cb => {
                        cb.checked = false;
                    });
                }
            });
        }

        // Running toggle
        const runningCheckbox = document.getElementById('running-completed');
        if (runningCheckbox) {
            runningCheckbox.addEventListener('change', (e) => {
                const distanceGroup = document.getElementById('running-distance-group');
                if (e.target.checked) {
                    distanceGroup.classList.remove('hidden');
                    document.getElementById('running-distance').required = true;
                } else {
                    distanceGroup.classList.add('hidden');
                    document.getElementById('running-distance').required = false;
                    document.getElementById('running-distance').value = '';
                }
            });
        }
    }

    /**
     * Update total calories display
     */
    function updateTotalCalories() {
        const breakfast = parseInt(document.getElementById('breakfast').value) || 0;
        const lunch = parseInt(document.getElementById('lunch').value) || 0;
        const dinner = parseInt(document.getElementById('dinner').value) || 0;
        const snack = parseInt(document.getElementById('snack').value) || 0;
        const total = breakfast + lunch + dinner + snack;

        document.getElementById('total-calories').textContent = total;
    }

    /**
     * Switch between user tabs
     */
    function switchTab(userId) {
        activeTab = userId;

        // Update tab active states
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.user === userId);
        });

        // Check if profile setup is needed
        const profile = Storage.getUserProfile(userId);
        if (!profile.setupComplete || !profile.height || !profile.age || !profile.startWeight) {
            showProfileModal(userId);
            return;
        }

        // Update dashboard content for this user
        updateStatsCards(userId);
        renderRecentEntries(userId);
        Charts.renderWeightChart(userId, true);
        Notifications.checkReminders(userId);
    }

    /**
     * Show profile setup modal
     */
    function showProfileModal(userId) {
        const profile = Storage.getUserProfile(userId);
        document.getElementById('profile-modal-user-name').textContent = profile.name;

        // Pre-fill existing values
        if (profile.height) document.getElementById('profile-height').value = profile.height;
        if (profile.age) document.getElementById('profile-age').value = profile.age;
        if (profile.startWeight) document.getElementById('profile-start-weight').value = profile.startWeight;
        if (profile.goalWeight) document.getElementById('profile-goal-weight').value = profile.goalWeight;

        document.getElementById('profile-modal').classList.remove('hidden');
    }

    /**
     * Hide profile modal
     */
    function hideProfileModal() {
        document.getElementById('profile-modal').classList.add('hidden');
    }

    /**
     * Show dashboard (refresh data for active tab)
     */
    function showDashboard(userId) {
        activeTab = userId || activeTab;
        switchTab(activeTab);
        showScreen('dashboard');
    }

    /**
     * Update stats cards
     */
    function updateStatsCards(userId) {
        const stats = Storage.getUserStats(userId);

        document.getElementById('stat-current-weight').textContent =
            stats.currentWeight ? `${stats.currentWeight.toFixed(1)} kg` : '-';

        if (stats.weekChange !== null) {
            const change = stats.weekChange.toFixed(1);
            const sign = stats.weekChange > 0 ? '+' : '';
            document.getElementById('stat-week-change').textContent = `${sign}${change} kg`;
        } else {
            document.getElementById('stat-week-change').textContent = '-';
        }

        document.getElementById('stat-days-tracked').textContent = stats.daysTracked;
        document.getElementById('stat-streak').textContent = stats.streak;
    }

    /**
     * Render recent entries list
     */
    function renderRecentEntries(userId) {
        const container = document.getElementById('entries-list');
        const entries = Storage.getDailyEntries(userId, 7);

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">+</div>
                    <p>No entries yet. Tap + to add your first entry!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = entries.map(entry => {
            const exercises = entry.workout?.exercises?.join(', ') || 'None';
            const running = entry.running?.completed ?
                `${entry.running.distance} km` : 'No';

            return `
                <div class="entry-item">
                    <span class="entry-date">${formatDate(entry.date)}</span>
                    <div class="entry-details">
                        <span class="entry-badge">${entry.calories.total} kcal</span>
                        <span class="entry-badge">${exercises}</span>
                        <span class="entry-badge">${running}</span>
                    </div>
                    <div class="entry-actions">
                        <button class="btn-icon" onclick="UI.editEntry('${entry.id}')" title="Edit">&#9998;</button>
                        <button class="btn-icon" onclick="UI.deleteEntry('${entry.id}')" title="Delete">&#10005;</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Show daily entry form
     */
    function showDailyEntryForm() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('daily-entry-date').textContent = formatDate(today);

        // Check if entry exists for today
        const existingEntry = Storage.getDailyEntryByDate(activeTab, today);

        if (existingEntry) {
            // Pre-fill form with existing data
            document.getElementById('breakfast').value = existingEntry.calories.breakfast || 0;
            document.getElementById('lunch').value = existingEntry.calories.lunch || 0;
            document.getElementById('dinner').value = existingEntry.calories.dinner || 0;
            document.getElementById('snack').value = existingEntry.calories.snack || 0;

            document.getElementById('workout-completed').checked = existingEntry.workout?.completed || false;
            if (existingEntry.workout?.completed) {
                document.getElementById('workout-exercises').classList.remove('hidden');
                existingEntry.workout.exercises?.forEach(exercise => {
                    const checkbox = document.querySelector(`input[name="exercise"][value="${exercise}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            document.getElementById('running-completed').checked = existingEntry.running?.completed || false;
            if (existingEntry.running?.completed) {
                document.getElementById('running-distance-group').classList.remove('hidden');
                document.getElementById('running-distance').value = existingEntry.running.distance || '';
            }
        } else {
            // Reset form
            document.getElementById('daily-form').reset();
            document.getElementById('workout-exercises').classList.add('hidden');
            document.getElementById('running-distance-group').classList.add('hidden');
        }

        updateTotalCalories();
        showScreen('daily-entry-form');
    }

    /**
     * Show weight entry form
     */
    function showWeightEntryForm() {
        const lastWeight = Storage.getLatestWeight(activeTab);

        if (lastWeight) {
            document.getElementById('weight-comparison').innerHTML = `
                <div class="weight-comparison-label">Previous Weight</div>
                <div class="weight-comparison-value">${lastWeight.toFixed(1)} kg</div>
            `;
        } else {
            document.getElementById('weight-comparison').innerHTML = '';
        }

        document.getElementById('current-weight').value = '';
        document.getElementById('weight-notes').value = '';
        document.getElementById('motivation-message').innerHTML = '';

        showScreen('weight-entry-form');
    }

    /**
     * Handle profile form submission
     */
    function handleProfileSubmit(e) {
        e.preventDefault();

        const height = parseInt(document.getElementById('profile-height').value);
        const age = parseInt(document.getElementById('profile-age').value);
        const startWeight = parseFloat(document.getElementById('profile-start-weight').value);
        const goalWeight = parseFloat(document.getElementById('profile-goal-weight').value);

        const updates = {
            height,
            age,
            startWeight,
            goalWeight,
            setupComplete: true
        };

        if (Storage.updateUserProfile(activeTab, updates)) {
            // Also save initial weight entry
            const today = new Date().toISOString().split('T')[0];
            Storage.saveWeightEntry(activeTab, {
                date: today,
                actualWeight: startWeight,
                predictedWeight: startWeight
            });

            hideProfileModal();
            showToast('Profile saved!');
            switchTab(activeTab);
        } else {
            showToast('Error saving profile', 'error');
        }
    }

    /**
     * Handle daily entry form submission
     */
    function handleDailySubmit(e) {
        e.preventDefault();

        const today = new Date().toISOString().split('T')[0];

        const entry = {
            date: today,
            userId: activeTab,
            calories: {
                breakfast: parseInt(document.getElementById('breakfast').value) || 0,
                lunch: parseInt(document.getElementById('lunch').value) || 0,
                dinner: parseInt(document.getElementById('dinner').value) || 0,
                snack: parseInt(document.getElementById('snack').value) || 0
            },
            workout: {
                completed: document.getElementById('workout-completed').checked,
                exercises: []
            },
            running: {
                completed: document.getElementById('running-completed').checked,
                distance: 0
            }
        };

        // Get selected exercises
        if (entry.workout.completed) {
            document.querySelectorAll('input[name="exercise"]:checked').forEach(checkbox => {
                entry.workout.exercises.push(checkbox.value);
            });
        }

        // Get running distance
        if (entry.running.completed) {
            entry.running.distance = parseFloat(document.getElementById('running-distance').value) || 0;
        }

        if (Storage.saveDailyEntry(activeTab, entry)) {
            showToast('Entry saved!');

            // Check if weight entry is due
            if (Storage.isWeightEntryDue(activeTab)) {
                showWeightEntryForm();
            } else {
                showDashboard(activeTab);
            }
        } else {
            showToast('Error saving entry', 'error');
        }
    }

    /**
     * Handle weight entry form submission
     */
    function handleWeightSubmit(e) {
        e.preventDefault();

        const weight = parseFloat(document.getElementById('current-weight').value);
        const notes = document.getElementById('weight-notes').value;
        const today = new Date().toISOString().split('T')[0];

        // Calculate prediction
        const dailyEntries = Storage.getDailyEntries(activeTab);
        const profile = Storage.getUserProfile(activeTab);
        const prediction = Calculations.predictWeight(profile, dailyEntries, weight);

        const entry = {
            date: today,
            userId: activeTab,
            actualWeight: weight,
            predictedWeight: prediction.predictedWeight,
            notes: notes
        };

        if (Storage.saveWeightEntry(activeTab, entry)) {
            showToast('Weight saved!');
            showDashboard(activeTab);
        } else {
            showToast('Error saving weight', 'error');
        }
    }

    /**
     * Show a specific screen
     */
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

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');

        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    /**
     * Show reminder banner
     */
    function showReminderBanner() {
        const banner = document.getElementById('reminder-banner');
        if (banner) {
            banner.classList.remove('hidden');
        }
    }

    /**
     * Hide reminder banner
     */
    function hideReminderBanner() {
        const banner = document.getElementById('reminder-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    /**
     * Update tab streak badges
     */
    function updateTabStreaks() {
        ['katy', 'mona'].forEach(userId => {
            const stats = Storage.getUserStats(userId);
            const streakEl = document.getElementById(`tab-${userId}-streak`);
            if (streakEl) {
                streakEl.textContent = stats.streak > 0 ? `${stats.streak}d` : '';
            }
        });
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Edit entry
     */
    function editEntry(entryId) {
        showDailyEntryForm();
    }

    /**
     * Delete entry
     */
    function deleteEntry(entryId) {
        if (confirm('Are you sure you want to delete this entry?')) {
            if (Storage.deleteDailyEntry(activeTab, entryId)) {
                showToast('Entry deleted!');
                showDashboard(activeTab);
            } else {
                showToast('Error deleting entry', 'error');
            }
        }
    }

    // Public API
    return {
        init,
        switchTab,
        showDashboard,
        showDailyEntryForm,
        showWeightEntryForm,
        showToast,
        showReminderBanner,
        hideReminderBanner,
        updateTabStreaks,
        editEntry,
        deleteEntry,
        getCurrentUser: () => activeTab,
        getCurrentScreen: () => currentScreen
    };
})();
