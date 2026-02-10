/**
 * Charts Module
 * Handles Chart.js visualization for weight progress
 */

const Charts = (function() {
    let weightChart = null;
    let currentView = 'individual'; // 'individual' or 'comparison'
    let currentUserId = null;

    /**
     * Create or update the main weight chart
     *
     * @param {string} userId - User ID ('katy' or 'mona')
     * @param {boolean} comparison - Whether to show comparison view
     */
    function renderWeightChart(userId, comparison = false) {
        currentUserId = userId;
        currentView = comparison ? 'comparison' : 'individual';

        const canvas = document.getElementById('weight-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (weightChart) {
            weightChart.destroy();
        }

        if (comparison) {
            renderComparisonChart(ctx);
        } else {
            renderIndividualChart(ctx, userId);
        }
    }

    /**
     * Render individual user chart
     */
    function renderIndividualChart(ctx, userId) {
        const weightEntries = Storage.getWeightEntries(userId);
        const dailyEntries = Storage.getDailyEntries(userId);
        const profile = Storage.getUserProfile(userId);

        if (weightEntries.length === 0) {
            renderEmptyChart(ctx, 'No weight data yet. Add your first weight entry!');
            return;
        }

        // Sort by date (oldest first for chart)
        const sorted = [...weightEntries].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // Extract data
        const labels = sorted.map(entry => formatDate(entry.date));
        const actualWeights = sorted.map(entry => entry.actualWeight);
        const predictedWeights = sorted.map(entry => entry.predictedWeight || null);

        // Add future prediction if we have enough data
        if (dailyEntries.length >= 3) {
            const currentWeight = actualWeights[actualWeights.length - 1];
            const prediction = Calculations.predictWeight(profile, dailyEntries, currentWeight);

            if (prediction.predictedWeight) {
                // Add next week prediction
                const nextWeekDate = new Date(sorted[sorted.length - 1].date);
                nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                labels.push(formatDate(nextWeekDate.toISOString().split('T')[0]));
                actualWeights.push(null);
                predictedWeights.push(prediction.predictedWeight);
            }
        }

        // Determine color based on user
        const userColor = userId === 'katy' ? 'rgb(236, 72, 153)' : 'rgb(139, 92, 246)';
        const userColorLight = userId === 'katy' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(139, 92, 246, 0.1)';

        weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual Weight',
                        data: actualWeights,
                        borderColor: userColor,
                        backgroundColor: userColorLight,
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: userColor,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Predicted Weight',
                        data: predictedWeights,
                        borderColor: 'rgb(148, 163, 184)',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: 'rgb(148, 163, 184)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: getChartOptions(profile.goalWeight)
        });
    }

    /**
     * Render comparison chart for both users
     */
    function renderComparisonChart(ctx) {
        const katyWeights = Storage.getWeightEntries('katy');
        const monaWeights = Storage.getWeightEntries('mona');

        if (katyWeights.length === 0 && monaWeights.length === 0) {
            renderEmptyChart(ctx, 'No weight data for either user yet.');
            return;
        }

        // Get all unique dates from both users
        const allDates = new Set([
            ...katyWeights.map(e => e.date),
            ...monaWeights.map(e => e.date)
        ]);

        const sortedDates = Array.from(allDates).sort((a, b) =>
            new Date(a) - new Date(b)
        );

        const labels = sortedDates.map(date => formatDate(date));

        // Create data arrays
        const katyData = sortedDates.map(date => {
            const entry = katyWeights.find(e => e.date === date);
            return entry ? entry.actualWeight : null;
        });

        const monaData = sortedDates.map(date => {
            const entry = monaWeights.find(e => e.date === date);
            return entry ? entry.actualWeight : null;
        });

        weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Katy',
                        data: katyData,
                        borderColor: 'rgb(236, 72, 153)',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgb(236, 72, 153)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        spanGaps: true
                    },
                    {
                        label: 'Mona',
                        data: monaData,
                        borderColor: 'rgb(139, 92, 246)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgb(139, 92, 246)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.3,
                        spanGaps: true
                    }
                ]
            },
            options: getChartOptions()
        });
    }

    /**
     * Render empty state chart
     */
    function renderEmptyChart(ctx, message) {
        weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'No data',
                    data: [],
                    borderColor: 'rgb(226, 232, 240)',
                    backgroundColor: 'rgba(226, 232, 240, 0.1)'
                }]
            },
            options: {
                ...getChartOptions(),
                plugins: {
                    ...getChartOptions().plugins,
                    title: {
                        display: true,
                        text: message,
                        font: {
                            size: 16
                        },
                        color: 'rgb(148, 163, 184)'
                    }
                }
            }
        });
    }

    /**
     * Get chart configuration options
     */
    function getChartOptions(goalWeight = null) {
        const annotations = [];

        // Add goal weight line if provided
        if (goalWeight) {
            annotations.push({
                type: 'line',
                yMin: goalWeight,
                yMax: goalWeight,
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2,
                borderDash: [10, 5],
                label: {
                    content: 'Goal',
                    enabled: true,
                    position: 'start',
                    backgroundColor: 'rgb(16, 185, 129)',
                    color: 'white'
                }
            });
        }

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1) + ' kg';
                            }
                            return label;
                        },
                        afterBody: function(tooltipItems) {
                            // Add calorie balance info if available
                            const dataIndex = tooltipItems[0].dataIndex;
                            const userId = currentUserId;

                            if (currentView === 'individual' && userId) {
                                const entries = Storage.getDailyEntries(userId);
                                if (entries.length > 0) {
                                    const profile = Storage.getUserProfile(userId);
                                    const currentWeight = Storage.getLatestWeight(userId);
                                    const prediction = Calculations.predictWeight(profile, entries, currentWeight);

                                    return [
                                        '',
                                        `Daily balance: ${prediction.dailyBalance > 0 ? '+' : ''}${prediction.dailyBalance} kcal`,
                                        `TDEE: ${prediction.tdee} kcal`
                                    ];
                                }
                            }
                            return [];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Weight (kg)',
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgb(241, 245, 249)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + ' kg';
                        },
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        };
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
    }

    /**
     * Toggle between individual and comparison view
     */
    function toggleComparisonView() {
        if (!currentUserId) return;

        currentView = currentView === 'individual' ? 'comparison' : 'individual';
        renderWeightChart(currentUserId, currentView === 'comparison');

        return currentView;
    }

    /**
     * Destroy chart instance
     */
    function destroy() {
        if (weightChart) {
            weightChart.destroy();
            weightChart = null;
        }
    }

    // Public API
    return {
        renderWeightChart,
        toggleComparisonView,
        destroy,
        getCurrentView: () => currentView
    };
})();
