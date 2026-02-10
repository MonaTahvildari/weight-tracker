# Weight Tracker - Katy & Mona

A beautiful, interactive weight loss tracking web application for two users. Track daily calories, exercises, running, and weekly weight progress with intelligent predictions based on calorie deficit and activity levels.

## Features

- 📊 **Dual-User Support**: Separate profiles for Katy and Mona with side-by-side comparison
- 🍽️ **Daily Tracking**: Log breakfast, lunch, dinner, and snack calories
- 💪 **Exercise Tracking**: Track workouts (bicep/tricep, shoulder, back, chest, booty, leg, abs)
- 🏃 **Running Tracker**: Log running distance in kilometers
- ⚖️ **Weekly Weigh-Ins**: Record weight every 7 days
- 📈 **Weight Prediction**: AI-powered predictions based on BMR, TDEE, and calorie balance
- 📉 **Interactive Charts**: Beautiful visualizations of actual vs predicted weight over time
- 🔥 **Streak Tracking**: Monitor consecutive days of logging
- ⏰ **Smart Reminders**: Get notified when it's time to log entries
- 📱 **PWA Support**: Install as an app on your phone or desktop
- 💾 **Local Storage**: All data stored securely in your browser
- 📥 **Export/Import**: Backup and restore your data easily

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no framework)
- **Charts**: Chart.js 4.x
- **Storage**: localStorage with cloud migration support
- **PWA**: Progressive Web App with offline support

## Getting Started

### Local Development

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. That's it! No build process required.

### Using a Local Server (Recommended for PWA features)

```bash
# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Deployment

### GitHub Pages (Recommended)

1. Create a GitHub repository
2. Push the code:

```bash
git init
git add .
git commit -m "Initial commit: Weight tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/weight-tracker.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: Deploy from branch → main
   - Save

4. Your site will be live at: `https://YOUR-USERNAME.github.io/weight-tracker/`

### Custom Domain

To add a custom domain:

1. Purchase a domain (e.g., `weighttrack.fit`)
2. Add CNAME file to repository with your domain
3. Configure DNS A records at your registrar:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
4. Enable HTTPS in GitHub Pages settings (automatic)

## Usage Guide

### First Time Setup

1. Select your profile (Katy or Mona)
2. Enter your:
   - Height (cm)
   - Age (years)
   - Current weight (kg)
   - Goal weight (kg)
3. Click "Save Profile"

### Daily Logging

1. Click the **+** button or open the app after 9 PM
2. Enter calories for each meal
3. Select if you worked out (choose exercise types)
4. Select if you ran (enter distance in km)
5. Click "Save Entry"

### Weekly Weigh-In

- Every 7 days, you'll be prompted to enter your current weight
- The app shows your previous weight for comparison
- Click "Save Weight" to record

### Viewing Progress

- **Dashboard**: Shows current stats, streak, and recent entries
- **Chart**: Interactive graph of actual vs predicted weight
- **Compare**: Toggle to see both users side-by-side

### Data Management

- **Export**: Click 📥 icon to download your data as JSON
- **Import**: Use exported JSON to restore data
- **Reset**: Clear all data (use with caution!)

## How Predictions Work

The weight prediction algorithm uses:

1. **BMR (Basal Metabolic Rate)**: Calculated using Mifflin-St Jeor equation
   ```
   BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161 (for females)
   ```

2. **TDEE (Total Daily Energy Expenditure)**: BMR × activity multiplier
   - Sedentary: 1.2
   - Light: 1.375
   - Moderate: 1.55
   - Active: 1.725
   - Very Active: 1.9

3. **Activity Level**: Dynamically calculated from logged workouts and running

4. **Exercise Calories**: Calculated using MET (Metabolic Equivalent) values

5. **Weight Change**: Based on calorie deficit/surplus
   ```
   7700 calories = 1 kg of body weight
   ```

6. **Prediction**: Current weight + (daily calorie balance / 7700) × 7 days

## File Structure

```
weight-tracker/
├── index.html           # Main HTML
├── manifest.json        # PWA manifest
├── sw.js               # Service worker
├── css/
│   ├── main.css        # Core styles
│   ├── components.css  # Component styles
│   └── responsive.css  # Mobile responsive
├── js/
│   ├── app.js          # Main controller
│   ├── storage.js      # Data persistence
│   ├── calculations.js # Algorithms
│   ├── ui.js           # UI components
│   ├── charts.js       # Chart.js integration
│   └── notifications.js # Reminders
└── assets/
    └── icons/          # PWA icons
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

## Data Privacy

- All data stored locally in your browser
- No data sent to external servers
- Export your data regularly for backups
- Cloud sync can be added later (Firebase, Supabase)

## Future Enhancements

- [ ] Photo progress tracking
- [ ] Meal photos and notes
- [ ] Body measurements (waist, hips, etc.)
- [ ] Goal milestones and celebrations
- [ ] Nutrition insights and recommendations
- [ ] PDF progress reports
- [ ] Cloud sync (Firebase/Supabase)
- [ ] Multi-device synchronization
- [ ] Dark mode
- [ ] Multiple language support

## Keyboard Shortcuts

- `ESC` - Go back to previous screen
- `Ctrl/Cmd + E` - Export data
- `Ctrl/Cmd + N` - New entry (from dashboard)

## Troubleshooting

### Data not saving
- Check browser console for errors
- Ensure localStorage is not disabled
- Check available storage space

### Charts not displaying
- Ensure Chart.js CDN is loading
- Check browser console for errors
- Try refreshing the page

### Reminders not working
- Reminders only show after 9 PM
- Must open the app to see reminders
- Enable notifications for push alerts (PWA mode)

## Contributing

This is a personal project for Katy and Mona, but feel free to fork and adapt for your own use!

## License

MIT License - Feel free to use and modify for personal use.

## Credits

- Built with ❤️ for Katy & Mona
- Chart.js for beautiful visualizations
- MDN Web Docs for PWA guidance
- Mifflin-St Jeor equation for accurate BMR calculations

---

**Start Date**: February 10, 2026

Track your journey, celebrate your progress! 🎉
