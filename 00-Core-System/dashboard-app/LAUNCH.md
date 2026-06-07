# 🌊 Cymatic OS Command Center - Launch Guide

## 🎯 What You Have

A **complete productivity command center** that replaces VS Code as your primary interface for Claude Code. This integrates:

- ✅ **Eat the Frog** - Single most important task prioritization
- ✅ **Energy-Based Tasks** - High/Low/Creative buckets based on your state
- ✅ **GTD (Getting Things Done)** - Full inbox processing workflow
- ✅ **Time Blocking** - Schedule your day with visual blocks
- ✅ **Pomodoro Focus Mode** - Distraction-free deep work
- ✅ **Claude Code Chat** - Direct communication with Claude
- ✅ **Knowledge Vault Editor** - Edit markdown files in-app
- ✅ **Real-time Sync** - WebSocket updates across all clients
- ✅ **Insights & Analytics** - Energy patterns, completion rates, AI recommendations

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd "Cymatic OS/00-Core-System/dashboard-app"
npm install
```

This installs:
- `express` - Web server
- `cors` - Cross-origin requests
- `ws` - WebSocket server
- `chokidar` - File watching
- `gray-matter` - Markdown parsing

### Step 2: Launch the Server

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
✅ Initial data loaded
```

### Step 3: Open the Dashboard

Navigate to: **http://localhost:8080/index-v2.html**

Or for the original version: **http://localhost:8080**

## 📱 Interface Overview

### Sidebar Navigation (Left)

1. **📊 Dashboard** - Main productivity hub
2. **🎯 Focus Mode** - Pomodoro timer + minimal distractions
3. **🚀 Projects** - All active projects with status
4. **🗂️ Knowledge Vault** - File browser + markdown editor
5. **🤖 Claude Code** - Chat interface with Claude
6. **💡 Insights** - Analytics and AI recommendations

**Energy Widget** (Bottom) - Adjust your current energy level to get smart task suggestions

### Main Dashboard Features

#### 🐸 Eat the Frog
- Your **#1 priority** for today
- Large, prominent section at top
- Set task, deadline, and why it matters
- Complete with celebration animation

#### ⚡ Energy-Based Tasks
**Three Buckets:**
- **High Energy** - Deep work, complex problem solving
- **Low Energy** - Admin, emails, simple tasks
- **Creative** - Writing, design, brainstorming

The system suggests which bucket based on your energy slider!

#### 📥 GTD Inbox
- Capture everything quickly (Cmd+K anywhere)
- Process items: Project / Action / Waiting / Someday
- Keeps your mind clear

#### 🕐 Time Blocks
- Block your day in focused chunks
- "NOW" indicator shows current block
- Notifications when blocks start

#### 📅 This Week's Wins
- 3 key outcomes for the week
- Progress ring shows completion %
- Check off as you complete

#### ⚠️ Blockers
- Track what's preventing progress
- Review daily to clear obstacles

### Focus Mode (🎯)

Enter distraction-free mode:
- Large Pomodoro timer (15/25/45/90 min presets)
- Current task displayed prominently
- Focus notes area for quick captures
- Browser notifications when complete

**Pro Tip:** Use 90-min blocks for deep work during high energy times!

### Claude Code Chat (🤖)

**Full Claude Integration:**
- Chat directly with Claude about your productivity
- Execute commands: `/dashboard`, `/update`, `/analyze`
- Quick actions for common tasks
- Typing indicator and markdown support

**Example Messages:**
- "What should I focus on now?"
- "Show my energy patterns this week"
- "Update my progress tracker"
- "Review my blockers and suggest solutions"

### Knowledge Vault (🗂️)

**Built-in File Editor:**
- Browse your Knowledge Vault
- Edit markdown files directly
- Auto-save on blur
- Syntax highlighting

**Files you'll edit:**
- `current-state.md` - Daily status
- `progress-tracker.md` - Actions and wins
- `project-contexts.md` - Project details
- `behavioral-patterns.md` - Patterns and insights

### Insights (💡)

**Analytics Dashboard:**
- Energy patterns over time
- Task completion rates
- Focus time analysis
- AI-powered recommendations

## 🔧 How It Works

### Data Flow

1. **You interact** with dashboard → Updates UI instantly (optimistic)
2. **Dashboard sends** to server via API → Saves to JSON files
3. **Server updates** markdown files in Knowledge Vault
4. **Server broadcasts** via WebSocket → All clients update in real-time
5. **File watcher** detects changes → Re-parses markdown → Broadcasts updates

### File Storage

**JSON Data** (`.dashboard-data/`):
- `tasks.json` - High/Low/Creative buckets
- `gtd.json` - Inbox items
- `timeblocks.json` - Time blocks
- `projects.json` - All projects
- `frog.json` - Daily frog task
- `week-goals.json` - Weekly outcomes
- `blockers.json` - Current blockers
- `claude-queue.json` - Claude messages

**Markdown Files** (Knowledge Vault):
- `current-state.md` - Syncs with frog, energy, blockers
- `project-contexts.md` - Syncs with projects
- `tasks.md` - Syncs with energy buckets (new file)
- `progress-tracker.md` - Manual updates

### API Endpoints

**Full REST API available:**
```
GET/POST/PUT/DELETE /api/tasks
GET/POST/DELETE /api/gtd/inbox
GET/POST/PUT/DELETE /api/timeblocks
GET/POST/PUT/DELETE /api/projects
GET/POST /api/frog
GET/POST/DELETE /api/week-goals
GET/POST/DELETE /api/blockers
GET/POST /api/vault/*
POST /api/claude/message
GET /api/insights/*
```

## 💡 Productivity Workflows

### Morning Routine (5 min)

1. Open dashboard → Check energy level
2. Set **Frog Task** (most important)
3. Review **Week's Wins** progress
4. Add **Time Blocks** for the day
5. Process **GTD Inbox** (2-min rule)

### During Work

1. Check **Current Time Block**
2. Work on tasks in matching **Energy Bucket**
3. Quick capture distractions to GTD Inbox
4. Use **Focus Mode** for deep work
5. Chat with **Claude** for decisions

### End of Day (3 min)

1. Complete **Frog Task** if done 🎉
2. Update **Week's Wins**
3. Note any new **Blockers**
4. Quick capture tomorrow's priorities
5. Check **Insights** for patterns

### Weekly Review

1. Review **Completion Rates** in Insights
2. Analyze **Energy Patterns**
3. Clear completed **Blockers**
4. Set next **Week's Wins**
5. Archive completed projects

## ⌨️ Keyboard Shortcuts

- `Cmd/Ctrl + K` - Quick Capture (anywhere)
- `Cmd/Ctrl + 1-6` - Switch views (1=Dashboard, 2=Focus, etc.)
- `Enter` in GTD Inbox - Capture item
- `Enter` in Claude chat - Send message
- `Cmd/Ctrl + S` in Vault - Save file
- `Esc` - Close modals

## 🔄 Syncing with Claude Code

The dashboard creates a **`.dashboard-requests/`** folder where it drops command requests:

```json
{
  "command": "analyze-patterns",
  "context": { "energy": 3, "stress": 8 },
  "timestamp": "[ISO timestamp]",
  "status": "pending"
}
```

Claude Code can monitor this folder and respond to requests!

## 🐛 Troubleshooting

### Server won't start

```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or change port in server.js
const PORT = 3000;
```

### Dashboard shows old data

1. Hard refresh browser (Cmd+Shift+R)
2. Check server console for errors
3. Restart server: `npm start`
4. Clear browser cache

### WebSocket disconnected

- Check server is running
- Look for "Connected to Cymatic OS Server" in browser console
- Auto-reconnect happens after 5s

### Files not syncing

1. Verify Knowledge Vault path in server.js
2. Check file permissions
3. Restart server to re-establish file watch

### Claude not responding

- Messages go to `.dashboard-data/claude-queue.json`
- Check if file exists and is valid JSON
- Implementation requires Claude Code to monitor this file

## 🎨 Customization

### Change Theme Colors

Edit `styles-v2.css`:
```css
:root {
    --primary: #6366f1;  /* Your color */
    --success: #10b981;
    /* etc. */
}
```

### Add Custom Views

1. Add to sidebar in `index-v2.html`
2. Create view div with id
3. Add to `switchView()` in `app-v2.js`

### Modify Energy Buckets

Edit `app-v2.js`:
```javascript
const buckets = ['high', 'low', 'creative', 'admin']; // Add 'admin'
```

## 📊 Mobile Access

Access from phone on same network:

1. Find computer IP: `ifconfig | grep inet` (macOS/Linux)
2. Open on phone: `http://192.168.1.XXX:8080/index-v2.html`

## 🔮 Future Enhancements

- [ ] Calendar integration (Google/Outlook)
- [ ] Email processing to GTD Inbox
- [ ] Voice input for quick capture
- [ ] Mobile app (React Native)
- [ ] Team collaboration features
- [ ] Habit tracking
- [ ] AI-powered task estimation
- [ ] Integration with other tools (Notion, Todoist, etc.)

## 🆘 Need Help?

1. Check browser console (F12)
2. Check server logs in terminal
3. Review Knowledge Vault file structure
4. Ask Claude via the chat interface!

---

## 🚀 You're Ready!

This is your **complete productivity command center**. It replaces scattered tools with one integrated system that:

✅ Knows your energy levels
✅ Adapts to your state
✅ Keeps you focused on what matters
✅ Syncs everything automatically
✅ Connects directly with Claude Code

**Now go build something amazing!** 🌊

---

**Version:** 2.0.0
**Last Updated:** [Date]
**Status:** Production Ready
