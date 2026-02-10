/**
 * Calculations Module
 * Contains all algorithms for BMR, TDEE, activity levels, and weight predictions
 */

const Calculations = (function() {

    // MET (Metabolic Equivalent of Task) values for exercises
    const MET_VALUES = {
        'bicep/tricep': 3.5,
        'shoulder': 3.5,
        'back': 4.0,
        'chest': 4.0,
        'booty': 4.5,
        'leg': 4.5,
        'abs': 3.0,
        'running': 9.8 // Average for moderate pace
    };

    // Average workout duration in minutes
    const WORKOUT_DURATION = 45;

    // Calories per kg of body weight (7700 cal = 1 kg)
    const CALORIES_PER_KG = 7700;

    /**
     * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
     * Most accurate formula according to research
     *
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @param {number} age - Age in years
     * @param {string} gender - 'male' or 'female'
     * @returns {number} BMR in calories per day
     */
    function calculateBMR(weight, height, age, gender) {
        if (!weight || !height || !age) {
            return null;
        }

        const baseCalc = (10 * weight) + (6.25 * height) - (5 * age);

        if (gender === 'female') {
            return baseCalc - 161;
        } else {
            return baseCalc + 5;
        }
    }

    /**
     * Calculate TDEE (Total Daily Energy Expenditure)
     *
     * @param {number} bmr - Basal Metabolic Rate
     * @param {string} activityLevel - Activity level key
     * @returns {number} TDEE in calories per day
     */
    function calculateTDEE(bmr, activityLevel) {
        if (!bmr) return null;

        const multipliers = {
            sedentary: 1.2,     // Little or no exercise
            light: 1.375,       // Light exercise 1-3 days/week
            moderate: 1.55,     // Moderate exercise 3-5 days/week
            active: 1.725,      // Hard exercise 6-7 days/week
            veryActive: 1.9     // Very hard exercise & physical job
        };

        const multiplier = multipliers[activityLevel] || multipliers.sedentary;
        return bmr * multiplier;
    }

    /**
     * Determine activity level based on weekly workout data
     *
     * @param {Array} weeklyEntries - Array of daily entries for the past week
     * @returns {string} Activity level key
     */
    function getWeeklyActivityLevel(weeklyEntries) {
        if (!weeklyEntries || weeklyEntries.length === 0) {
            return 'sedentary';
        }

        // Count workout days
        const workoutDays = weeklyEntries.filter(entry =>
            entry.workout && entry.workout.completed
        ).length;

        // Calculate total running distance
        const totalRunDistance = weeklyEntries
            .filter(entry => entry.running && entry.running.completed)
            .reduce((sum, entry) => sum + (entry.running.distance || 0), 0);

        // Count total exercises
        const totalExercises = weeklyEntries
            .filter(entry => entry.workout && entry.workout.completed)
            .reduce((sum, entry) => sum + (entry.workout.exercises?.length || 0), 0);

        // Scoring system
        let score = 0;
        score += workoutDays * 10;          // 10 points per workout day
        score += totalRunDistance * 5;      // 5 points per km
        score += totalExercises * 2;        // 2 points per exercise type

        // Map score to activity level
        if (score >= 100) return 'veryActive';
        if (score >= 70) return 'active';
        if (score >= 40) return 'moderate';
        if (score >= 15) return 'light';
        return 'sedentary';
    }

    /**
     * Calculate calories burned from exercises
     *
     * @param {number} weight - Weight in kg
     * @param {object} exerciseData - Object containing workout and running data
     * @returns {number} Calories burned
     */
    function calculateExerciseCalories(weight, exerciseData) {
        if (!weight) return 0;

        let totalCalories = 0;

        // Strength training calories
        if (exerciseData.workout && exerciseData.workout.completed) {
            const exercises = exerciseData.workout.exercises || [];
            if (exercises.length > 0) {
                // Calculate average MET for selected exercises
                const totalMET = exercises.reduce((sum, exercise) => {
                    return sum + (MET_VALUES[exercise] || 3.5);
                }, 0);
                const avgMET = totalMET / exercises.length;

                // Calories = (MET * weight * duration) / 60
                totalCalories += (avgMET * weight * WORKOUT_DURATION) / 60;
            }
        }

        // Running calories
        if (exerciseData.running && exerciseData.running.completed) {
            const distance = exerciseData.running.distance || 0;
            // Assume 10 min/km average pace
            const runTime = distance * 10;

            // Calories = (MET * weight * time) / 60
            totalCalories += (MET_VALUES.running * weight * runTime) / 60;
        }

        return Math.round(totalCalories);
    }

    /**
     * Calculate average daily metrics from recent entries
     *
     * @param {Array} entries - Array of daily entries
     * @param {number} days - Number of days to average (default 7)
     * @returns {object} Average metrics
     */
    function calculateAverages(entries, days = 7) {
        if (!entries || entries.length === 0) {
            return {
                avgCalories: 0,
                avgExerciseCalories: 0,
                workoutDays: 0,
                runningDays: 0
            };
        }

        const recentEntries = entries.slice(0, days);
        const count = recentEntries.length;

        const avgCalories = recentEntries.reduce((sum, entry) =>
            sum + (entry.calories?.total || 0), 0
        ) / count;

        // For exercise calories, we need the current weight
        // This will be calculated in predictWeight function

        const workoutDays = recentEntries.filter(entry =>
            entry.workout?.completed
        ).length;

        const runningDays = recentEntries.filter(entry =>
            entry.running?.completed
        ).length;

        return {
            avgCalories: Math.round(avgCalories),
            workoutDays,
            runningDays,
            entries: recentEntries
        };
    }

    /**
     * Predict weight based on calorie balance and activity
     *
     * @param {object} profile - User profile with height, age, gender
     * @param {Array} dailyEntries - Array of daily entries
     * @param {number} currentWeight - Current weight in kg
     * @returns {object} Prediction data
     */
    function predictWeight(profile, dailyEntries, currentWeight) {
        if (!profile || !currentWeight || !dailyEntries || dailyEntries.length === 0) {
            return {
                predictedWeight: currentWeight,
                dailyBalance: 0,
                tdee: 0,
                bmr: 0,
                confidence: 0,
                avgExerciseCalories: 0
            };
        }

        // Get last 7 days of data (or available days if less)
        const recentEntries = dailyEntries.slice(0, Math.min(7, dailyEntries.length));
        const averages = calculateAverages(recentEntries);

        // Calculate average exercise calories burned
        const avgExerciseCalories = recentEntries.reduce((sum, entry) => {
            return sum + calculateExerciseCalories(currentWeight, entry);
        }, 0) / recentEntries.length;

        // Calculate BMR for current weight
        const bmr = calculateBMR(
            currentWeight,
            profile.height,
            profile.age,
            profile.gender
        );

        // Determine activity level from recent entries
        const activityLevel = getWeeklyActivityLevel(recentEntries);

        // Calculate TDEE
        const tdee = calculateTDEE(bmr, activityLevel);

        // Calculate net calorie balance
        const dailyBalance = averages.avgCalories - (tdee + avgExerciseCalories);

        // Weight change calculation
        // 7700 calories = 1 kg of body weight
        const dailyWeightChange = dailyBalance / CALORIES_PER_KG;

        // Predict weight for next week (7 days)
        const daysAhead = 7;
        const predictedWeight = currentWeight + (dailyWeightChange * daysAhead);

        // Calculate confidence based on data availability
        // Full confidence with 7 days of data, scales linearly
        const confidence = Math.min(recentEntries.length / 7, 1);

        // Apply dampening factor (predictions aren't perfect)
        // This makes predictions more conservative
        const dampedPrediction = currentWeight +
            ((predictedWeight - currentWeight) * confidence * 0.9);

        return {
            predictedWeight: Math.round(dampedPrediction * 10) / 10,
            dailyBalance: Math.round(dailyBalance),
            tdee: Math.round(tdee),
            bmr: Math.round(bmr),
            avgExerciseCalories: Math.round(avgExerciseCalories),
            activityLevel: activityLevel,
            confidence: Math.round(confidence * 100),
            daysOfData: recentEntries.length
        };
    }

    /**
     * Calculate weight loss rate (kg per week)
     *
     * @param {Array} weightEntries - Array of weight entries
     * @returns {number} Average kg lost per week
     */
    function calculateWeightLossRate(weightEntries) {
        if (!weightEntries || weightEntries.length < 2) {
            return 0;
        }

        // Get first and last weights
        const sorted = [...weightEntries].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const weightChange = last.actualWeight - first.actualWeight;
        const weeksPassed = last.weekNumber - first.weekNumber;

        if (weeksPassed === 0) return 0;

        return Math.round((weightChange / weeksPassed) * 10) / 10;
    }

    /**
     * Calculate estimated time to reach goal weight
     *
     * @param {number} currentWeight - Current weight in kg
     * @param {number} goalWeight - Goal weight in kg
     * @param {number} avgWeeklyLoss - Average weight loss per week in kg
     * @returns {object} Estimate data
     */
    function calculateTimeToGoal(currentWeight, goalWeight, avgWeeklyLoss) {
        if (!currentWeight || !goalWeight || avgWeeklyLoss >= 0) {
            return {
                weeksRemaining: null,
                estimatedDate: null
            };
        }

        const weightToLose = currentWeight - goalWeight;
        if (weightToLose <= 0) {
            return {
                weeksRemaining: 0,
                estimatedDate: new Date(),
                achieved: true
            };
        }

        const weeksRemaining = Math.ceil(weightToLose / Math.abs(avgWeeklyLoss));
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + (weeksRemaining * 7));

        return {
            weeksRemaining,
            estimatedDate,
            achieved: false
        };
    }

    /**
     * Get healthy weight range for height (BMI based)
     *
     * @param {number} height - Height in cm
     * @returns {object} Min and max healthy weights
     */
    function getHealthyWeightRange(height) {
        if (!height) return null;

        const heightM = height / 100;
        const minWeight = 18.5 * heightM * heightM;
        const maxWeight = 24.9 * heightM * heightM;

        return {
            min: Math.round(minWeight * 10) / 10,
            max: Math.round(maxWeight * 10) / 10
        };
    }

    /**
     * Calculate BMI
     *
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @returns {number} BMI value
     */
    function calculateBMI(weight, height) {
        if (!weight || !height) return null;

        const heightM = height / 100;
        const bmi = weight / (heightM * heightM);

        return Math.round(bmi * 10) / 10;
    }

    /**
     * Get BMI category
     *
     * @param {number} bmi - BMI value
     * @returns {string} BMI category
     */
    function getBMICategory(bmi) {
        if (!bmi) return 'Unknown';

        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    }

    // Public API
    return {
        calculateBMR,
        calculateTDEE,
        getWeeklyActivityLevel,
        calculateExerciseCalories,
        calculateAverages,
        predictWeight,
        calculateWeightLossRate,
        calculateTimeToGoal,
        getHealthyWeightRange,
        calculateBMI,
        getBMICategory,
        MET_VALUES
    };
})();
