# Cymatic OS 2.5 - Upgrade Guide

## 🎉 What's New Today

You just added three powerful features to Cymatic OS that work with your **local models** (Ollama/LMStudio) and **Claude Code**:

### 1. **Self-Improvement System** 🤖
Your system can now analyze itself and propose upgrades automatically!

### 2. **Advanced Journaling** ✍️
Guided reflection with pattern detection and automatic dashboard updates.

### 3. **Dashboard Sync Algorithm** 📊
Real-time synchronization between your Knowledge Vault and Tauri dashboard.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Tool Dependencies

```bash
cd "~/cymatic-os/00-Core-System/tools"
npm install
```

### Step 2: Make Tools Executable

```bash
chmod +x update-dashboard.ts system-upgrade.ts
```

### Step 3: Test Dashboard Sync

```bash
npm run dashboard
```

You should see:
```
✅ Updated current-status.json
✅ Updated active-projects.json
✅ Updated recent-progress.json
✅ Dashboard data sync complete!
```

### Step 4: Run in Watch Mode (Optional)

Keep dashboard auto-synced:
```bash
npm run dashboard:watch
```

This watches your Knowledge Vault and updates the dashboard in real-time!

---

## 📖 How to Use New Features

### 1. Self-Improvement System

**Basic upgrade check:**
```bash
cd "~/cymatic-os/00-Core-System/tools"
npm run upgrade
```

This will:
- ✅ Analyze your current Cymatic OS setup
- ✅ Check Daniel Miessler's PAI repo for updates
- ✅ Check Anthropic Claude Code releases
- ✅ Generate an upgrade proposal

**Output:**
Creates `/01-Knowledge-Vault/history/upgrade-proposals/proposal-YYYY-MM-DD.md`

**Then analyze with AI:**

**Using local model:**
```bash
cat "~/cymatic-os/01-Knowledge-Vault/history/upgrade-proposals/proposal-$(date +%Y-%m-%d).md" | ollama run llama3.1:70b
```

**Using Claude Code:**
- Open the proposal file in Claude Code
- Ask: "Review this upgrade proposal and give me the top 3 improvements I should make"

### 2. Advanced Journaling

**In your Tauri app:**

```
/journal
```
Quick check-in (energy, stress, priority, blocker)

```
/journal-quick
```
Even faster check-in

```
/journal-deep
```
Deep reflection session with pattern analysis

**What happens automatically:**
- ✅ Updates `current-state.md`
- ✅ Syncs to dashboard (if watch mode is running)
- ✅ Detects mood from your response
- ✅ Cross-references with behavioral patterns
- ✅ Saves to `000-Conversations/`

### 3. Dashboard Sync

**Manual sync:**
```bash
cd "~/cymatic-os/00-Core-System/tools"
npm run dashboard
```

**Auto-sync (recommended):**
```bash
npm run dashboard:watch
```

Leave this running in a terminal. Every time you update:
- `current-state.md`
- `project-contexts.md`
- `progress-tracker.md`
- Any conversation file

...the dashboard JSON files are automatically updated!

**In Tauri app:**
```
/dashboard-sync
```
Triggers manual sync from within the app.

---

## 🔧 Integration with Your Workflow

### Morning Routine

**Option A: Terminal-first**
```bash
# 1. Start dashboard watch
cd "~/cymatic-os/00-Core-System/tools"
npm run dashboard:watch &

# 2. Open your Tauri app
cd "~/cymatic-app"
npm run tauri dev

# 3. Journal check-in
Type: /journal-quick
```

**Option B: App-only**
```
# In Tauri app
/journal

# Dashboard auto-updates!
```

### Weekly System Upgrade

**Every Monday:**
```bash
cd "~/cymatic-os/00-Core-System/tools"
npm run upgrade
```

Review the proposal, pick 1-2 improvements, implement them.

---

## 📁 File Structure

```
Cymatic OS/
├── 00-Core-System/
│   ├── skills/                    # NEW!
│   │   ├── journal/
│   │   │   └── skill.md
│   │   └── system-upgrade/
│   │       └── skill.md
│   ├── tools/                     # NEW!
│   │   ├── package.json
│   │   ├── update-dashboard.ts
│   │   └── system-upgrade.ts
│   └── dashboard-app/
│       └── .dashboard-data/       # NEW!
│           ├── current-status.json
│           ├── active-projects.json
│           ├── recent-progress.json
│           └── dashboard-summary.json
├── 01-Knowledge-Vault/
│   ├── history/                   # NEW!
│   │   └── upgrade-proposals/
│   └── 000-Conversations/
└── cymatic-app/                   # Your Tauri app
```

---

## 💡 Cost Optimization

### Using Local Models (Free!)

**For journaling:**
```
# In Tauri app, select Ollama model
/journal-quick
```
Uses Ollama/LMStudio = $0

**For system upgrades:**
```bash
# Generate proposal (free)
npm run upgrade

# Analyze with local model (free)
cat proposal.md | ollama run llama3.1:70b
```

### Using Claude Code (When You Need Quality)

**For complex analysis:**
```
# In Claude Code
Read the proposal at: 01-Knowledge-Vault/history/upgrade-proposals/proposal-2025-12-20.md

Then: "Give me detailed implementation steps for the top 3 improvements"
```

**Hybrid approach:**
- Use local models for journaling (daily)
- Use Claude Code for upgrades (weekly)
- Use local models for dashboard sync (always, it's deterministic code!)

---

## 🎯 Quick Wins You Can Do Right Now

### 1. Test Journaling (2 minutes)
```
# In Tauri app
/journal-quick

Energy: 7
Stress: 3
Priority: Test the new journaling feature
Blocker: None

# Check current-state.md - it's updated!
# Check dashboard JSON - it's synced!
```

### 2. Run First Upgrade (5 minutes)
```bash
cd "~/cymatic-os/00-Core-System/tools"
npm run upgrade

# Review the proposal
cat ../../../01-Knowledge-Vault/history/upgrade-proposals/proposal-*.md
```

### 3. Auto-Sync Dashboard (1 minute)
```bash
cd "~/cymatic-os/00-Core-System/tools"
npm run dashboard:watch

# Leave it running, make changes to vault files, watch them sync!
```

---

## 🐛 Troubleshooting

### "Module not found" error
```bash
cd "~/cymatic-os/00-Core-System/tools"
npm install
```

### Dashboard not syncing
Check watch mode is running:
```bash
ps aux | grep "update-dashboard"
```

If not:
```bash
npm run dashboard:watch
```

### Can't execute .ts files
Make them executable:
```bash
chmod +x *.ts
```

### Ollama not responding
Check Ollama is running:
```bash
ollama list
```

Start it:
```bash
ollama serve
```

---

## 🎁 What This Gives You

### Before Today:
- Manual journaling
- Static dashboard
- No self-improvement
- Mostly AI-powered (expensive)

### After Today:
- ✅ Guided journaling with pattern detection
- ✅ Real-time dashboard sync
- ✅ Self-upgrading system
- ✅ Deterministic tools (faster, cheaper)
- ✅ Works with free local models
- ✅ Hybrid local + Claude approach

### Cost Impact:
```
Before: Could cost $50-200/month depending on usage
After:  Can run for $0/month (local) or $10-30/month (hybrid)
```

### Speed Impact:
```
Before: Everything through AI inference
After:  Deterministic code runs instantly
```

---

## 🚀 Next Steps

1. **Today**: Test all three features
2. **This week**: Set up dashboard watch mode in your workflow
3. **Weekly**: Run system upgrade and implement 1-2 improvements
4. **Monthly**: Review how much you're saving with local models

---

**Questions?** Open Claude Code and ask about any of these features!

**Want more?** The system can now improve itself - just run weekly upgrades and it will get better over time! 🎉
