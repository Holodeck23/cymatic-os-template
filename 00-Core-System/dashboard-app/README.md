# Cymatic OS Productivity Dashboard

A beautiful, real-time web dashboard for tracking your life, projects, and progress.

## 🎯 Features

- **Live Status Tracking**: Energy, stress, emotional state, and peak hours
- **Project Management**: Top 3 active projects with deadlines and next actions
- **Weekly Outcomes**: Track this week's key objectives
- **Blockers & Constraints**: Visual tracking of what's holding you back
- **Quick Actions**: High-impact tasks you can do in under 30 minutes
- **Progress History**: Recent actions and key wins
- **Smart Insights**: AI-generated insights based on your current state

## 🚀 Quick Start

### Option 1: Simple HTML (No Server Required)

1. Open `index.html` directly in your browser
2. The dashboard will load with sample data from your knowledge vault

### Option 2: Local Server (Recommended)

For live data integration from your markdown files:

```bash
# Navigate to the dashboard directory
cd "Cymatic OS/00-Core-System/dashboard-app"

# Start a simple HTTP server (Python 3)
python3 -m http.server 8080

# Or use Node.js http-server
npx http-server -p 8080
```

Then open: http://localhost:8080

### Option 3: Advanced - Auto-Refresh from Files

For automatic data loading from your Knowledge Vault:

```bash
# Install Node.js dependencies (if needed)
npm install

# Run the data loader server
node server.js
```

This will:
- Watch your markdown files for changes
- Auto-refresh the dashboard
- Parse live data from your Knowledge Vault

## 📁 File Structure

```
dashboard-app/
├── index.html          # Main dashboard page
├── styles.css          # Beautiful dark theme styling
├── dashboard.js        # Frontend logic and rendering
├── data-loader.js      # Markdown parser for live data
├── server.js           # Optional: Node.js server for live updates
└── README.md           # This file
```

## 🔧 Configuration

### Data Sources

The dashboard pulls from these files in your Knowledge Vault:

- `01-Knowledge-Vault/current-state.md` → Current status, energy, today's priority
- `01-Knowledge-Vault/project-contexts.md` → Active projects
- `01-Knowledge-Vault/progress-tracker.md` → Recent actions and wins
- `01-Knowledge-Vault/behavioral-patterns.md` → Blockers and insights

### Customization

**Change theme colors** - Edit CSS variables in `styles.css`:

```css
:root {
    --primary: #6366f1;
    --bg-primary: #0f172a;
    /* ... more variables */
}
```

**Modify layout** - Adjust grid in `styles.css`:

```css
.dashboard-grid {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}
```

**Add new sections** - Extend `dashboard.js` with new render functions

## 🎨 Dashboard Sections

### Current Status
- Energy level (0-10 with visual bar)
- Stress level (0-10 with visual bar)
- Emotional status badge
- Peak productivity hours

### Today's Priority
- Single most important task
- Deadline
- Why it matters

### Active Projects
- Top 3 projects with status
- Deadlines and revenue impact
- Next actions for each

### This Week's Outcomes
- 3 key objectives for the week
- Checkbox tracking

### Blockers
- Top 3 things preventing progress
- Visual warning indicators

### Quick Actions
- High-impact tasks under 30 minutes
- Momentum builders

### Recent Progress
- Last 7 days of actions
- Key wins celebration

### Insights & Patterns
- AI-generated insights based on your state
- Pattern observations
- Recommendations

## 🔄 Refresh Data

- **Manual**: Click the "🔄 Refresh" button
- **Auto**: Dashboard auto-refreshes every 5 minutes
- **Live**: Use server.js for real-time file watching

## 💡 Tips

1. **Update your Knowledge Vault daily** - The dashboard is only as good as your data
2. **Use during morning planning** - Review status and set today's priority
3. **Check blockers weekly** - Address what's holding you back
4. **Celebrate wins** - Track progress in the progress tracker
5. **Mobile friendly** - Responsive design works on all devices

## 🛠️ Troubleshooting

**Dashboard shows "--" everywhere**
- Update your markdown files with current data
- Check file paths are correct
- Verify markdown formatting matches expected patterns

**Styles not loading**
- Make sure all files are in the same directory
- Use a local server instead of opening HTML directly

**Data not updating**
- Click the refresh button
- Check browser console for errors
- Verify markdown file locations

## 🔮 Future Enhancements

- [ ] Mobile app version
- [ ] Voice input for quick updates
- [ ] Integration with calendar/email
- [ ] AI-powered task suggestions
- [ ] Habit tracking
- [ ] Energy pattern analysis
- [ ] Weekly/monthly reports

## 📞 Support

Part of **Cymatic OS Universal v2.0**

For issues or questions, update your `current-state.md` and ask your AI assistant!

---

**Last Updated**: [Date]
**Version**: 1.0.0
