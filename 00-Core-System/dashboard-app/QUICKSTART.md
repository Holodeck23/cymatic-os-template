# Cymatic OS Dashboard - Quick Start Guide

## 🚀 Two Ways to Launch

### Option 1: Standalone (No Server) - **WORKS NOW**

Just double-click `index.html` or run:

```bash
cd "Cymatic OS/00-Core-System/dashboard-app"
open index.html
```

✅ Dashboard will open with sample data
❌ No live updates from your markdown files
❌ No Claude Code integration

### Option 2: Full Server (Recommended) - **Live Data**

#### Step 1: Install Dependencies

```bash
cd "Cymatic OS/00-Core-System/dashboard-app"
npm install
```

#### Step 2: Start Server

```bash
npm start
```

You should see:

```
🌊 Cymatic OS Dashboard Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Dashboard: http://localhost:8080
🔌 WebSocket: ws://localhost:8080
📁 Watching: /path/to/01-Knowledge-Vault
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 3: Open Dashboard

Navigate to: **http://localhost:8080**

✅ Live data from your markdown files
✅ Real-time updates when you edit files
✅ Claude Code integration
✅ WebSocket connection for instant refresh

## 🔧 Troubleshooting

### "Cannot find module..."

Install dependencies:

```bash
cd "Cymatic OS/00-Core-System/dashboard-app"
npm install
```

### Dashboard shows "Update your current-state.md"

The dashboard is reading from your Knowledge Vault but finding placeholder text. Update these files:

- `01-Knowledge-Vault/current-state.md`
- `01-Knowledge-Vault/project-contexts.md`
- `01-Knowledge-Vault/progress-tracker.md`

### Port 8080 already in use

Change the port in `server.js`:

```javascript
const PORT = 3000; // or any available port
```

### Dashboard not updating when I edit files

1. Make sure server is running
2. Check browser console for WebSocket connection
3. Files must be in `01-Knowledge-Vault/` directory
4. Refresh browser if needed

## 🌟 Features When Connected to Server

### Real-Time Updates
- Edit any file in your Knowledge Vault
- Dashboard updates instantly via WebSocket
- No manual refresh needed

### Claude Code Integration
- Send commands from dashboard to Claude Code
- View available slash commands
- Create quick notes and updates

### API Endpoints

```bash
# Get dashboard data
GET http://localhost:8080/api/dashboard

# Update today's priority
POST http://localhost:8080/api/priority
{
  "priority": "Finish the security audit",
  "deadline": "Today by 6 PM",
  "why": "Unblocks release"
}

# Add a quick note
POST http://localhost:8080/api/note
{
  "note": "Had a breakthrough on the authentication flow"
}

# Get Claude commands
GET http://localhost:8080/api/claude/commands

# Execute Claude command
POST http://localhost:8080/api/claude/execute
{
  "command": "dashboard",
  "context": "Show my current state"
}
```

## 📱 Mobile Access

If server is running, you can access from your phone on the same network:

1. Find your computer's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep inet

   # Windows
   ipconfig
   ```

2. Open on phone: `http://YOUR_IP:8080`

Example: `http://192.168.1.100:8080`

## 🎯 Next Steps

1. ✅ Launch dashboard (standalone or server)
2. ✅ Update your Knowledge Vault files with real data
3. ✅ Watch the dashboard auto-update
4. ✅ Use it during your daily planning
5. ✅ Check it throughout the day for quick status

## 💡 Pro Tips

- **Morning Routine**: Open dashboard, review energy/priorities, set today's priority
- **During Work**: Quick glance at next actions and blockers
- **End of Day**: Update progress tracker, mark week outcomes complete
- **Weekly Review**: Review patterns and insights for improvements

---

**Ready to go?** Run `npm start` or open `index.html`!
