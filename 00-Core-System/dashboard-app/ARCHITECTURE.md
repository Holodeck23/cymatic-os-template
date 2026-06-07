# 🌊 Cymatic OS Command Center - Architecture

## 🏗️ System Overview

The Cymatic OS Command Center is a **full-stack productivity application** that integrates modern productivity methodologies with real-time data synchronization and Claude Code integration.

### Tech Stack

**Frontend:**
- HTML5 with semantic structure
- CSS3 with custom properties (variables)
- Vanilla JavaScript ES6+ (no frameworks)
- WebSocket client for real-time updates

**Backend:**
- Node.js + Express (REST API)
- WebSocket Server (ws package)
- File System Watcher (chokidar)
- Markdown Parser (gray-matter)

**Data Layer:**
- JSON files for structured data (`.dashboard-data/`)
- Markdown files for human-readable content (Knowledge Vault)
- localStorage for offline fallback
- Dual-write pattern for consistency

## 📂 File Structure

```
dashboard-app/
├── index-v2.html           # Main UI (v2 Command Center)
├── index.html              # Original dashboard (v1)
├── styles-v2.css           # Modern styling (48KB)
├── styles.css              # Original styling
├── app-v2.js               # Main application logic (64KB, 2100+ lines)
├── dashboard.js            # Original dashboard logic
├── server.js               # Backend API + WebSocket (54KB, 1600+ lines)
├── data-loader.js          # Markdown parsing utilities
├── package.json            # Dependencies
├── LAUNCH.md               # User guide
├── QUICKSTART.md           # Quick setup
├── README.md               # Original readme
└── ARCHITECTURE.md         # This file

.dashboard-data/            # JSON data storage (auto-created)
├── tasks.json              # Energy-based task buckets
├── gtd.json                # GTD inbox items
├── timeblocks.json         # Time blocking schedule
├── projects.json           # Active projects
├── frog.json               # Daily frog task
├── week-goals.json         # Weekly outcomes
├── blockers.json           # Current blockers
└── claude-queue.json       # Claude message queue

.dashboard-requests/        # Claude Code integration (auto-created)
└── {timestamp}.json        # Command requests for Claude
```

## 🔄 Data Flow Architecture

### 1. User Interaction Flow

```
User Action (UI)
  ↓
JavaScript Handler (app-v2.js)
  ↓
Optimistic UI Update (instant feedback)
  ↓
API Request (POST/PUT/DELETE)
  ↓
Server Processing (server.js)
  ↓
JSON File Write (.dashboard-data/)
  ↓
Markdown File Sync (Knowledge Vault)
  ↓
WebSocket Broadcast (all clients)
  ↓
UI Updates (all connected devices)
```

### 2. Real-Time Sync Flow

```
File Changed (Knowledge Vault)
  ↓
Chokidar Detects Change
  ↓
Server Re-parses File
  ↓
Updates JSON Cache
  ↓
WebSocket Broadcast
  ↓
All Clients Update UI
```

### 3. Offline Mode Flow

```
User Action (UI)
  ↓
API Request Fails (offline)
  ↓
Fallback to localStorage
  ↓
Queue for Sync
  ↓
Connection Restored
  ↓
Sync Queue to Server
  ↓
Resolve Conflicts (server wins)
```

## 🎯 Productivity Systems Integration

### 1. Eat the Frog (ETF)
**Implementation:**
- Single prominent card at top of dashboard
- Stores in `frog.json` with date stamp
- Only shows if for today
- Completion triggers celebration and archive
- Syncs to `current-state.md` "Today's Priority" section

**Data Structure:**
```json
{
  "task": "Complete security audit",
  "deadline": "18:00",
  "why": "Unblocks release",
  "date": "[date]",
  "completed": false
}
```

### 2. Energy-Based Task Management
**Implementation:**
- Three buckets: High Energy, Low Energy, Creative
- Energy slider (1-10) suggests appropriate bucket
- Tasks stored in `tasks.json` by bucket
- Syncs to new `tasks.md` in Knowledge Vault

**Algorithm:**
```javascript
if (energy >= 7) suggest = 'high'
else if (energy >= 4) suggest = 'low'
else suggest = 'creative' // creative works at any energy
```

**Data Structure:**
```json
{
  "high": [
    { "id": "1696261234567", "content": "Design API", "completed": false }
  ],
  "low": [...],
  "creative": [...]
}
```

### 3. GTD (Getting Things Done)
**Implementation:**
- Quick capture input (Cmd+K anywhere)
- Inbox stored in `gtd.json`
- Processing workflow: Project / Action / Waiting / Someday
- Real-time counts: Inbox / Today / Waiting

**Processing Logic:**
```javascript
if (item.type === 'project') → Move to projects.json
if (item.type === 'action') → Move to tasks.json (appropriate bucket)
if (item.type === 'waiting') → Add to waiting list with context
if (item.type === 'someday') → Archive to someday.md
```

### 4. Time Blocking
**Implementation:**
- Create blocks with time, task, duration
- Stored in `timeblocks.json` with date
- Filter by today only
- Auto-update "NOW" indicator every minute
- Notifications when block starts (browser API)

**Current Block Algorithm:**
```javascript
const now = new Date()
const currentBlock = blocks.find(b => {
  const start = parseTime(b.time)
  const end = new Date(start.getTime() + b.duration * 60000)
  return now >= start && now < end
})
```

### 5. Pomodoro / Focus Mode
**Implementation:**
- Full-screen distraction-free view
- Timer with 15/25/45/90 min presets
- Start/Pause/Reset controls
- Focus notes auto-saved
- Browser notifications on complete

**Timer Logic:**
```javascript
let timeRemaining = duration * 60 // seconds
const interval = setInterval(() => {
  timeRemaining--
  updateDisplay()
  if (timeRemaining === 0) {
    notify('Focus session complete!')
    clearInterval(interval)
  }
}, 1000)
```

## 🔌 API Architecture

### REST Endpoints (40+ total)

**Pattern:** `METHOD /api/resource[/:id][/action]`

**Example Flows:**

1. **Create Task:**
```
POST /api/tasks
Body: { bucket: 'high', content: 'Design API', energy: 8 }
Response: { success: true, id: '1696261234567', task: {...} }
```

2. **Complete Frog:**
```
POST /api/frog/complete
Response: { success: true, celebration: '🎉 Great job!' }
WebSocket Broadcast: { type: 'frog-complete', ... }
```

3. **Search Vault:**
```
GET /api/vault/search?query=productivity
Response: {
  results: [
    { file: 'behavioral-patterns.md', line: 42, context: '...' }
  ]
}
```

### WebSocket Events

**Client → Server:**
- `refresh` - Request full data refresh
- `update-priority` - Update today's priority
- `mark-complete` - Complete week goal
- `add-blocker` - Add new blocker
- `quick-note` - Add to progress tracker

**Server → Client:**
- `initial` - Full data on connect
- `update` - Full data refresh
- `tasks-update` - Tasks changed
- `frog-complete` - Frog completed (celebration)
- `vault-change` - File changed
- `claude-message` - New Claude response

### Error Handling

```javascript
// Server-side
try {
  const data = await readJSON('tasks.json')
  // ... process
} catch (error) {
  console.error('Task error:', error)
  res.status(500).json({
    success: false,
    error: 'Failed to read tasks'
  })
}

// Client-side
try {
  const res = await fetch('/api/tasks')
  const data = await res.json()
  if (!data.success) throw new Error(data.error)
  // ... update UI
} catch (error) {
  console.error(error)
  showNotification('Failed to load tasks', 'error')
  // Fallback to localStorage
}
```

## 🎨 UI/UX Architecture

### Component Structure

**Sidebar Navigation:**
- Fixed 280px width (60px on mobile)
- Active state management
- Energy widget always visible
- Sync status indicator

**Main Content Views:**
- Single view active at a time (`.view.active`)
- Smooth fade transitions (CSS)
- Each view lazy-loads data on switch
- Keyboard shortcuts (Cmd+1-6)

**Cards:**
- Consistent styling via `.card` class
- Hover effects (transform, shadow)
- Responsive grid layout
- Auto-adjusts to content

### State Management Pattern

```javascript
// Global state object
const AppState = {
  energy: 5,
  tasks: {},
  // ... more state
}

// Update pattern
async function updateEnergy(value) {
  // 1. Optimistic update
  AppState.energy = value
  renderEnergyWidget()

  // 2. Persist to server
  try {
    await fetch('/api/dashboard/energy', {
      method: 'PUT',
      body: JSON.stringify({ energy: value })
    })
  } catch (error) {
    // 3. Rollback on error
    AppState.energy = previousValue
    renderEnergyWidget()
    showError()
  }
}
```

### Rendering Strategy

**Initial Load:**
1. Connect WebSocket
2. Request `/api/dashboard` for all data
3. Populate state
4. Render all visible components
5. Start timers (clock, current block)

**Updates:**
1. WebSocket message received
2. Update relevant state slice
3. Re-render only affected components
4. Animate changes (fade/slide)

**Example:**
```javascript
function renderTasks(bucket) {
  const container = document.getElementById(`${bucket}EnergyTasks`)
  container.innerHTML = AppState.tasks[bucket]
    .map(task => `
      <li class="task-item" data-id="${task.id}">
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span>${escapeHtml(task.content)}</span>
        <button onclick="deleteTask('${task.id}')">×</button>
      </li>
    `).join('')
}
```

## 🔐 Security & Data Integrity

### Path Validation
```javascript
// Prevent directory traversal
function validatePath(filepath) {
  const resolved = path.resolve(KNOWLEDGE_VAULT, filepath)
  if (!resolved.startsWith(KNOWLEDGE_VAULT)) {
    throw new Error('Invalid path')
  }
  return resolved
}
```

### XSS Prevention
```javascript
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

### Data Backup
```javascript
async function writeJSON(filename, data) {
  // 1. Create backup
  const backup = `${filename}.backup`
  if (await exists(filename)) {
    await fs.copyFile(filename, backup)
  }

  // 2. Write new data
  await fs.writeFile(filename, JSON.stringify(data, null, 2))
}
```

### Conflict Resolution
```javascript
// Server always wins
function syncData() {
  const localData = localStorage.getItem('tasks')
  const serverData = await fetch('/api/tasks').then(r => r.json())

  if (localData.timestamp > serverData.timestamp) {
    // Local is newer, push to server
    await fetch('/api/tasks', {
      method: 'PUT',
      body: localData
    })
  } else {
    // Server is newer, update local
    localStorage.setItem('tasks', JSON.stringify(serverData))
  }
}
```

## 🚀 Performance Optimizations

### Debouncing
```javascript
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Auto-save with debouncing
const autoSave = debounce(saveToServer, 500)
textArea.addEventListener('input', autoSave)
```

### Lazy Loading
```javascript
function switchView(viewName) {
  // Only load data when view is accessed
  if (viewName === 'insights' && !insightsLoaded) {
    loadInsightsData()
    insightsLoaded = true
  }
}
```

### Efficient Rendering
```javascript
// Only update changed items
function updateTaskList(newTasks, oldTasks) {
  const added = newTasks.filter(t => !oldTasks.find(o => o.id === t.id))
  const removed = oldTasks.filter(t => !newTasks.find(n => n.id === t.id))

  added.forEach(task => renderTask(task))
  removed.forEach(task => removeTaskElement(task.id))
}
```

## 🔮 Extension Points

### Adding New Views

1. **HTML:** Add view div with unique id
```html
<div class="view" id="myview-view">
  <!-- content -->
</div>
```

2. **CSS:** Style in styles-v2.css
```css
#myview-view { /* styles */ }
```

3. **JS:** Add to switch handler
```javascript
case 'myview':
  loadMyViewData()
  break
```

4. **Navigation:** Add to sidebar
```html
<button class="nav-item" data-view="myview">My View</button>
```

### Adding API Endpoints

1. **Server:** Add route in server.js
```javascript
app.post('/api/myresource', async (req, res) => {
  try {
    const data = await processData(req.body)
    res.json({ success: true, data })
    broadcast({ type: 'myresource-update', data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
```

2. **Client:** Add API call
```javascript
async function createMyResource(data) {
  const res = await fetch('/api/myresource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}
```

### Adding Productivity Methods

1. **Research:** Study the methodology
2. **Data Model:** Design JSON structure
3. **UI:** Create interface components
4. **Logic:** Implement core algorithm
5. **Sync:** Connect to Knowledge Vault
6. **Test:** Validate workflow

## 📊 Analytics & Insights

### Energy Pattern Analysis
```javascript
function analyzeEnergyPatterns(tasks) {
  const byBucket = {
    high: tasks.high.filter(t => t.completed),
    low: tasks.low.filter(t => t.completed),
    creative: tasks.creative.filter(t => t.completed)
  }

  return {
    mostProductive: Object.keys(byBucket)
      .sort((a,b) => byBucket[b].length - byBucket[a].length)[0],
    recommendations: generateRecommendations(byBucket)
  }
}
```

### Completion Rate Calculation
```javascript
function calculateCompletionRate() {
  const total = AppState.tasks.high.length +
                AppState.tasks.low.length +
                AppState.tasks.creative.length
  const completed = [...AppState.tasks.high,
                     ...AppState.tasks.low,
                     ...AppState.tasks.creative]
                     .filter(t => t.completed).length
  return Math.round((completed / total) * 100)
}
```

## 🤝 Claude Code Integration

### Message Queue Pattern

**Client sends:**
```javascript
POST /api/claude/message
{
  "message": "What should I focus on now?",
  "context": {
    "energy": 3,
    "stress": 8,
    "blockers": ["Low energy", "Multiple priorities"]
  }
}
```

**Server queues:**
```json
// .dashboard-data/claude-queue.json
[
  {
    "id": "1696261234567",
    "message": "What should I focus on now?",
    "context": { ... },
    "timestamp": "[ISO timestamp]",
    "status": "pending",
    "response": null
  }
]
```

**Claude Code monitors and responds:**
```javascript
// Claude Code integration (future)
const queue = JSON.parse(fs.readFileSync('claude-queue.json'))
const pending = queue.find(m => m.status === 'pending')

if (pending) {
  const response = await processWithClaude(pending.message, pending.context)
  pending.response = response
  pending.status = 'complete'
  fs.writeFileSync('claude-queue.json', JSON.stringify(queue))
}
```

**Client polls or receives via WebSocket:**
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'claude-message') {
    renderClaudeResponse(data.response)
  }
}
```

## 🎓 Key Learnings & Best Practices

1. **Dual-Write Pattern:** Maintain both JSON (structured) and Markdown (human-readable)
2. **Optimistic UI:** Update immediately, sync in background
3. **WebSocket for Real-Time:** Instant updates across all clients
4. **Energy-Based Design:** Adapt UI/suggestions to user's current state
5. **Offline-First:** localStorage fallback ensures always-available
6. **Debounced Auto-Save:** Balance UX and server load
7. **Conflict Resolution:** Server wins, simple and predictable
8. **Modular Architecture:** Easy to extend with new views/features
9. **Security First:** Path validation, XSS prevention, proper error handling
10. **Progressive Enhancement:** Works standalone, better with server

---

**This architecture supports a complete productivity ecosystem that adapts to you, not the other way around.** 🌊
