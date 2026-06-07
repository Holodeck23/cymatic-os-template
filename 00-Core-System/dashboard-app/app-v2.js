/**
 * Cymatic OS Dashboard Application v2.0
 * Production-ready JavaScript application for comprehensive productivity management
 *
 * @author Cymatic OS Team
 * @version 2.0.0
 * @license MIT
 */

/* ============================================================================
   GLOBAL STATE MANAGEMENT
   ============================================================================ */

/**
 * @typedef {Object} AppState
 * @property {number} energy - Energy level (1-10)
 * @property {number} stress - Stress level (1-10)
 * @property {Object} tasks - Task buckets (high, low, creative)
 * @property {Array} gtdInbox - GTD inbox items
 * @property {Array} timeblocks - Time blocks for the day
 * @property {Array} projects - Active projects
 * @property {Object|null} frogTask - Eat the Frog task
 * @property {Array} weekGoals - Week outcomes
 * @property {Array} blockers - Current blockers
 * @property {Object|null} focusSession - Active focus session
 * @property {Array} claudeMessages - Claude chat history
 */
const AppState = {
    energy: 5,
    stress: 5,
    tasks: {
        high: [],
        low: [],
        creative: []
    },
    gtdInbox: [],
    timeblocks: [],
    projects: [],
    frogTask: null,
    weekGoals: [],
    blockers: [],
    focusSession: null,
    claudeMessages: [],
    serverData: null,
    isOnline: false,
    isSyncing: false,
    currentView: 'dashboard'
};

/**
 * WebSocket connection instance
 * @type {WebSocket|null}
 */
let ws = null;

/**
 * Reconnection attempt counter
 * @type {number}
 */
let reconnectAttempts = 0;

/**
 * Maximum reconnection attempts
 * @type {number}
 */
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Auto-save debounce timer
 * @type {number|null}
 */
let autoSaveTimer = null;

/**
 * Current time update interval
 * @type {number|null}
 */
let clockInterval = null;

/**
 * Current block update interval
 * @type {number|null}
 */
let blockUpdateInterval = null;

/**
 * Focus timer interval
 * @type {number|null}
 */
let focusTimerInterval = null;

/**
 * Focus timer state
 * @type {Object}
 */
const FocusTimer = {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    totalSeconds: 1500
};

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

/**
 * Initialize the application
 * @async
 */
async function initApp() {
    console.log('🌊 Initializing Cymatic OS Dashboard v2.0...');

    try {
        // Set up event listeners
        setupEventListeners();

        // Initialize UI components
        initializeUI();

        // Load data from localStorage first (instant)
        loadFromLocal();

        // Connect to WebSocket for real-time updates
        connectWebSocket();

        // Load dashboard data from server
        await loadDashboardData();

        // Start background processes
        startClockUpdates();
        startBlockUpdates();

        // Load initial view data
        await loadViewData('dashboard');

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Failed to initialize app. Using offline mode.', 'error');
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // Energy slider
    const energySlider = document.getElementById('energySlider');
    if (energySlider) {
        energySlider.addEventListener('input', handleEnergyChange);
        energySlider.addEventListener('change', () => {
            debouncedSave();
        });
    }

    // Bucket tabs
    document.querySelectorAll('.bucket-tab').forEach(tab => {
        tab.addEventListener('click', handleBucketTabClick);
    });

    // Frog task input
    const frogInput = document.getElementById('frogInput');
    if (frogInput) {
        frogInput.addEventListener('blur', saveFrogTask);
        frogInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                frogInput.blur();
            }
        });
    }

    // Focus notes auto-save
    const focusNotes = document.getElementById('focusNotes');
    if (focusNotes) {
        focusNotes.addEventListener('blur', saveFocusNotes);
    }

    // Vault editor auto-save
    const vaultEditor = document.getElementById('vaultEditor');
    if (vaultEditor) {
        vaultEditor.addEventListener('blur', saveFile);
    }

    // Claude input
    const claudeInput = document.getElementById('claudeInput');
    if (claudeInput) {
        claudeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendClaudeMessage();
            }
        });
    }

    // Sync button
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', syncData);
    }

    // Modal close on outside click
    const modal = document.getElementById('quickCaptureModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeQuickCapture();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeyboard);

    // Prevent memory leaks on page unload
    window.addEventListener('beforeunload', cleanup);
}

/**
 * Initialize UI components
 */
function initializeUI() {
    // Update current time immediately
    updateCurrentTime();

    // Update energy display
    updateEnergyDisplay();

    // Render empty states
    renderTasks();
    renderGTDInbox();
    renderTimeBlocks();
    renderWeekGoals();
    renderBlockers();
}

/**
 * Handle global keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleGlobalKeyboard(e) {
    // Ctrl/Cmd + K: Quick capture
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openQuickCapture();
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
        closeQuickCapture();
    }

    // Ctrl/Cmd + 1-6: Switch views
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const views = ['dashboard', 'focus', 'projects', 'vault', 'claude', 'insights'];
        switchView(views[parseInt(e.key) - 1]);
    }
}

/**
 * Cleanup function to prevent memory leaks
 */
function cleanup() {
    // Clear all intervals
    if (clockInterval) clearInterval(clockInterval);
    if (blockUpdateInterval) clearInterval(blockUpdateInterval);
    if (focusTimerInterval) clearInterval(focusTimerInterval);

    // Close WebSocket
    if (ws) {
        ws.close();
    }

    // Save state before exit
    saveToLocal(AppState);
}

/* ============================================================================
   WEBSOCKET & API INTEGRATION
   ============================================================================ */

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
    try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            AppState.isOnline = true;
            reconnectAttempts = 0;
            updateConnectionStatus(true);
            showNotification('Connected to server', 'success');
        };

        ws.onmessage = (event) => {
            handleWebSocketMessage(event);
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            AppState.isOnline = false;
            updateConnectionStatus(false);
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            AppState.isOnline = false;
            updateConnectionStatus(false);

            // Attempt to reconnect
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                console.log(`⏳ Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(connectWebSocket, delay);
            } else {
                showNotification('Cannot connect to server. Working offline.', 'warning');
            }
        };
    } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        AppState.isOnline = false;
        updateConnectionStatus(false);
    }
}

/**
 * Handle incoming WebSocket messages
 * @param {MessageEvent} event - WebSocket message event
 */
function handleWebSocketMessage(event) {
    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'initial':
                console.log('📦 Received initial data from server');
                AppState.serverData = message.data;
                mergeServerData(message.data);
                renderDashboard();
                break;

            case 'update':
                console.log('🔄 Received data update from server');
                AppState.serverData = message.data;
                mergeServerData(message.data);
                renderDashboard();
                break;

            case 'success':
                showNotification(message.message, 'success');
                break;

            case 'error':
                showNotification(message.message, 'error');
                break;

            default:
                console.warn('⚠️ Unknown message type:', message.type);
        }
    } catch (error) {
        console.error('❌ Error handling WebSocket message:', error);
    }
}

/**
 * Merge server data into app state
 * @param {Object} serverData - Data from server
 */
function mergeServerData(serverData) {
    if (!serverData) return;

    // Update energy and stress from current state
    if (serverData.currentState) {
        AppState.energy = serverData.currentState.energy || 5;
        AppState.stress = serverData.currentState.stress || 5;

        // Update frog task
        if (serverData.currentState.todayPriority) {
            AppState.frogTask = {
                task: serverData.currentState.todayPriority,
                deadline: serverData.currentState.todayDeadline || '18:00',
                why: serverData.currentState.todayWhy || ''
            };
        }
    }

    // Update projects
    if (serverData.projects) {
        AppState.projects = serverData.projects;
    }

    // Update week goals
    if (serverData.progress && serverData.progress.weekOutcomes) {
        AppState.weekGoals = serverData.progress.weekOutcomes.map((goal, index) => ({
            id: `week-${index}`,
            text: goal,
            completed: false
        }));
    }

    // Update blockers
    if (serverData.patterns && serverData.patterns.blockers) {
        AppState.blockers = serverData.patterns.blockers.map((blocker, index) => ({
            id: `blocker-${index}`,
            text: blocker,
            addedAt: new Date().toISOString()
        }));
    }

    // Save merged state to localStorage
    saveToLocal(AppState);
}

/**
 * Load dashboard data from server
 * @async
 */
async function loadDashboardData() {
    try {
        const response = await fetch('http://localhost:8080/api/dashboard');
        const result = await response.json();

        if (result.success) {
            console.log('📊 Dashboard data loaded from server');
            AppState.serverData = result.data;
            mergeServerData(result.data);
            renderDashboard();
        } else {
            throw new Error(result.error || 'Failed to load dashboard data');
        }
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Using offline data', 'warning');
    }
}

/**
 * Update connection status indicator
 * @param {boolean} online - Connection status
 */
function updateConnectionStatus(online) {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        if (online) {
            syncBtn.classList.remove('offline');
            syncBtn.innerHTML = '<span>🔄</span> Sync Now';
        } else {
            syncBtn.classList.add('offline');
            syncBtn.innerHTML = '<span>⚠️</span> Offline';
        }
    }
}

/* ============================================================================
   VIEW MANAGEMENT
   ============================================================================ */

/**
 * Switch to a different view
 * @param {string} viewName - Name of the view to switch to
 */
function switchView(viewName) {
    console.log(`🔀 Switching to view: ${viewName}`);

    // Update app state
    AppState.currentView = viewName;

    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }

    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });

    // Load view-specific data
    loadViewData(viewName);
}

/**
 * Load data specific to a view
 * @async
 * @param {string} viewName - Name of the view
 */
async function loadViewData(viewName) {
    switch (viewName) {
        case 'dashboard':
            renderDashboard();
            break;

        case 'focus':
            renderFocusMode();
            break;

        case 'projects':
            await loadProjects();
            break;

        case 'vault':
            await loadVaultTree();
            break;

        case 'claude':
            loadClaudeCommands();
            renderClaudeMessages();
            break;

        case 'insights':
            await generateInsights();
            break;
    }
}

/* ============================================================================
   DASHBOARD RENDERING
   ============================================================================ */

/**
 * Render the complete dashboard
 */
function renderDashboard() {
    updateEnergyDisplay();
    updateQuickStats();
    renderFrogTask();
    renderTasks();
    renderGTDInbox();
    renderTimeBlocks();
    renderProjectsMini();
    renderWeekGoals();
    renderBlockers();
}

/**
 * Update energy level display
 */
function updateEnergyDisplay() {
    const energySlider = document.getElementById('energySlider');
    const energyValue = document.getElementById('energyValue');
    const quickEnergy = document.getElementById('quickEnergy');

    if (energySlider) energySlider.value = AppState.energy;
    if (energyValue) energyValue.textContent = AppState.energy;
    if (quickEnergy) quickEnergy.textContent = AppState.energy;
}

/**
 * Update quick stats in command bar
 */
function updateQuickStats() {
    const quickProgress = document.getElementById('quickProgress');
    const quickStress = document.getElementById('quickStress');

    // Calculate total completed tasks
    const completedCount = Object.values(AppState.tasks)
        .flat()
        .filter(task => task.completed).length;
    const totalCount = Object.values(AppState.tasks)
        .flat().length;

    if (quickProgress) {
        quickProgress.textContent = `${completedCount}/${totalCount}`;
    }

    if (quickStress) {
        quickStress.textContent = AppState.stress;
    }
}

/**
 * Handle energy slider change
 * @param {Event} e - Input event
 */
function handleEnergyChange(e) {
    const value = parseInt(e.target.value);
    AppState.energy = value;
    updateEnergyDisplay();

    // Show suggested bucket based on energy
    const suggestion = getSuggestedBucket(value);
    showNotification(`Energy at ${value}/10. Suggested: ${suggestion} energy tasks`, 'info');
}

/**
 * Get suggested task bucket based on energy level
 * @param {number} energyLevel - Current energy level (1-10)
 * @returns {string} Suggested bucket
 */
function getSuggestedBucket(energyLevel) {
    if (energyLevel >= 7) return 'high';
    if (energyLevel >= 4) return 'creative';
    return 'low';
}

/* ============================================================================
   ENERGY-BASED TASK MANAGEMENT
   ============================================================================ */

/**
 * Handle bucket tab click
 * @param {Event} e - Click event
 */
function handleBucketTabClick(e) {
    const bucket = e.target.dataset.bucket;

    // Update tabs
    document.querySelectorAll('.bucket-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');

    // Update buckets
    document.querySelectorAll('.bucket').forEach(b => {
        b.classList.remove('active');
    });
    document.getElementById(`${bucket}EnergyBucket`).classList.add('active');
}

/**
 * Add a new task to a bucket
 * @param {string} bucket - Bucket name (high, low, creative)
 */
function addTask(bucket) {
    const taskText = prompt(`Add ${bucket} energy task:`);
    if (!taskText || taskText.trim() === '') return;

    const task = {
        id: `task-${Date.now()}`,
        text: taskText.trim(),
        bucket,
        completed: false,
        createdAt: new Date().toISOString()
    };

    AppState.tasks[bucket].push(task);
    renderTasks();
    debouncedSave();

    showNotification('Task added', 'success');
}

/**
 * Move task to a different bucket
 * @param {string} taskId - Task ID
 * @param {string} newBucket - New bucket name
 */
function moveTask(taskId, newBucket) {
    // Find and remove task from current bucket
    let task = null;
    for (const bucket in AppState.tasks) {
        const index = AppState.tasks[bucket].findIndex(t => t.id === taskId);
        if (index !== -1) {
            task = AppState.tasks[bucket].splice(index, 1)[0];
            break;
        }
    }

    if (task) {
        task.bucket = newBucket;
        AppState.tasks[newBucket].push(task);
        renderTasks();
        debouncedSave();
        showNotification(`Task moved to ${newBucket} energy`, 'success');
    }
}

/**
 * Complete a task
 * @param {string} taskId - Task ID
 */
function completeTask(taskId) {
    for (const bucket in AppState.tasks) {
        const task = AppState.tasks[bucket].find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            renderTasks();
            updateQuickStats();
            debouncedSave();

            if (task.completed) {
                showNotification('Task completed!', 'success');
            }
            break;
        }
    }
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 */
function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;

    for (const bucket in AppState.tasks) {
        const index = AppState.tasks[bucket].findIndex(t => t.id === taskId);
        if (index !== -1) {
            AppState.tasks[bucket].splice(index, 1);
            renderTasks();
            debouncedSave();
            showNotification('Task deleted', 'success');
            break;
        }
    }
}

/**
 * Render all task buckets
 */
function renderTasks() {
    ['high', 'low', 'creative'].forEach(bucket => {
        const taskList = document.getElementById(`${bucket}EnergyTasks`);
        if (!taskList) return;

        const tasks = AppState.tasks[bucket] || [];

        if (tasks.length === 0) {
            taskList.innerHTML = '<li class="empty-state">No tasks yet</li>';
            return;
        }

        taskList.innerHTML = tasks.map(task => `
            <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <input type="checkbox"
                       ${task.completed ? 'checked' : ''}
                       onchange="completeTask('${task.id}')">
                <span class="task-text">${escapeHtml(task.text)}</span>
                <div class="task-actions">
                    ${bucket !== 'high' ? `<button onclick="moveTask('${task.id}', 'high')" title="Move to high">⬆️</button>` : ''}
                    ${bucket !== 'low' ? `<button onclick="moveTask('${task.id}', 'low')" title="Move to low">⬇️</button>` : ''}
                    ${bucket !== 'creative' ? `<button onclick="moveTask('${task.id}', 'creative')" title="Move to creative">🎨</button>` : ''}
                    <button onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
                </div>
            </li>
        `).join('');
    });
}

/* ============================================================================
   EAT THE FROG
   ============================================================================ */

/**
 * Render the frog task
 */
function renderFrogTask() {
    const frogInput = document.getElementById('frogInput');
    const frogDeadline = document.getElementById('frogDeadline');

    if (AppState.frogTask && AppState.frogTask.task) {
        if (frogInput) frogInput.textContent = AppState.frogTask.task;
        if (frogDeadline) frogDeadline.value = AppState.frogTask.deadline || '18:00';
    }
}

/**
 * Save the frog task
 */
function saveFrogTask() {
    const frogInput = document.getElementById('frogInput');
    const frogDeadline = document.getElementById('frogDeadline');

    if (!frogInput) return;

    const task = frogInput.textContent.trim();
    const deadline = frogDeadline ? frogDeadline.value : '18:00';

    if (task && task !== 'Click to set your #1 priority for today') {
        AppState.frogTask = {
            task,
            deadline,
            completed: false,
            createdAt: new Date().toISOString()
        };

        debouncedSave();

        // Update server
        updateFrogOnServer(task, deadline);
    }
}

/**
 * Complete the frog task with celebration
 */
function completeFrog() {
    if (!AppState.frogTask || !AppState.frogTask.task) {
        showNotification('Set a frog task first!', 'warning');
        return;
    }

    AppState.frogTask.completed = true;
    AppState.frogTask.completedAt = new Date().toISOString();

    // Show celebration
    showNotification('🎉 Frog eaten! Great job!', 'success');

    // Update UI
    const frogInput = document.getElementById('frogInput');
    if (frogInput) {
        frogInput.style.textDecoration = 'line-through';
        setTimeout(() => {
            frogInput.textContent = 'Click to set your #1 priority for today';
            frogInput.style.textDecoration = 'none';
            AppState.frogTask = null;
        }, 3000);
    }

    debouncedSave();
}

/**
 * Update frog task on server
 * @async
 * @param {string} task - Task text
 * @param {string} deadline - Deadline time
 */
async function updateFrogOnServer(task, deadline) {
    try {
        const response = await fetch('http://localhost:8080/api/priority', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: task, deadline })
        });

        const result = await response.json();
        if (!result.success) {
            console.error('Failed to update frog on server:', result.error);
        }
    } catch (error) {
        console.error('Error updating frog on server:', error);
    }
}

/* ============================================================================
   GTD INBOX
   ============================================================================ */

/**
 * Handle Enter key in GTD input
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleGTDEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        captureGTD();
    }
}

/**
 * Capture a new GTD inbox item
 */
function captureGTD() {
    const input = document.getElementById('gtdInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const item = {
        id: `gtd-${Date.now()}`,
        text,
        status: 'inbox',
        capturedAt: new Date().toISOString(),
        processed: false
    };

    AppState.gtdInbox.push(item);
    input.value = '';

    renderGTDInbox();
    debouncedSave();

    showNotification('Item captured', 'success');
}

/**
 * Process an inbox item
 * @param {string} id - Item ID
 * @param {string} action - Action to take (project, action, waiting, someday, delete)
 */
function processInboxItem(id, action) {
    const item = AppState.gtdInbox.find(i => i.id === id);
    if (!item) return;

    switch (action) {
        case 'project':
            // Add to projects
            AppState.projects.push({
                id: `project-${Date.now()}`,
                name: item.text,
                status: 'planning',
                deadline: 'TBD',
                nextAction: 'Define first action',
                revenueImpact: 'medium',
                createdAt: new Date().toISOString()
            });
            showNotification('Added to projects', 'success');
            break;

        case 'action':
            // Add to high energy tasks
            AppState.tasks.high.push({
                id: `task-${Date.now()}`,
                text: item.text,
                bucket: 'high',
                completed: false,
                createdAt: new Date().toISOString()
            });
            showNotification('Added to tasks', 'success');
            break;

        case 'waiting':
            item.status = 'waiting';
            item.processed = true;
            showNotification('Marked as waiting', 'success');
            break;

        case 'someday':
            item.status = 'someday';
            item.processed = true;
            showNotification('Moved to someday/maybe', 'success');
            break;

        case 'delete':
            const index = AppState.gtdInbox.findIndex(i => i.id === id);
            if (index !== -1) {
                AppState.gtdInbox.splice(index, 1);
                showNotification('Item deleted', 'success');
            }
            break;
    }

    // Remove from inbox if processed
    if (action !== 'waiting' && action !== 'someday') {
        const index = AppState.gtdInbox.findIndex(i => i.id === id);
        if (index !== -1) {
            AppState.gtdInbox.splice(index, 1);
        }
    }

    renderGTDInbox();
    renderTasks();
    debouncedSave();
}

/**
 * Render GTD inbox
 */
function renderGTDInbox() {
    const inboxList = document.getElementById('inboxList');
    const inboxCount = document.getElementById('inboxCount');
    const todayCount = document.getElementById('todayCount');
    const waitingCount = document.getElementById('waitingCount');

    if (!inboxList) return;

    const inbox = AppState.gtdInbox.filter(i => i.status === 'inbox');
    const today = AppState.gtdInbox.filter(i => {
        const capturedDate = new Date(i.capturedAt);
        const todayDate = new Date();
        return capturedDate.toDateString() === todayDate.toDateString();
    });
    const waiting = AppState.gtdInbox.filter(i => i.status === 'waiting');

    if (inboxCount) inboxCount.textContent = inbox.length;
    if (todayCount) todayCount.textContent = today.length;
    if (waitingCount) waitingCount.textContent = waiting.length;

    if (inbox.length === 0) {
        inboxList.innerHTML = '<li class="empty-state">Inbox zero! 🎉</li>';
        return;
    }

    inboxList.innerHTML = inbox.map(item => `
        <li class="inbox-item" data-item-id="${item.id}">
            <div class="inbox-text">${escapeHtml(item.text)}</div>
            <div class="inbox-actions">
                <button onclick="processInboxItem('${item.id}', 'project')" title="Make Project">📁</button>
                <button onclick="processInboxItem('${item.id}', 'action')" title="Next Action">✓</button>
                <button onclick="processInboxItem('${item.id}', 'waiting')" title="Waiting For">⏳</button>
                <button onclick="processInboxItem('${item.id}', 'someday')" title="Someday/Maybe">💭</button>
                <button onclick="processInboxItem('${item.id}', 'delete')" title="Delete">🗑️</button>
            </div>
        </li>
    `).join('');
}

/* ============================================================================
   TIME BLOCKING
   ============================================================================ */

/**
 * Add a new time block
 * @param {string} time - Start time (HH:MM format)
 * @param {string} task - Task description
 * @param {number} duration - Duration in minutes
 */
function addTimeBlock(time, task, duration) {
    const block = {
        id: `block-${Date.now()}`,
        time: time || '09:00',
        task: task || 'New block',
        duration: duration || 60,
        completed: false,
        createdAt: new Date().toISOString()
    };

    AppState.timeblocks.push(block);
    AppState.timeblocks.sort((a, b) => a.time.localeCompare(b.time));

    renderTimeBlocks();
    debouncedSave();
}

/**
 * Get the current time block
 * @returns {Object|null} Current time block
 */
function getCurrentBlock() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const block of AppState.timeblocks) {
        const blockEnd = addMinutesToTime(block.time, block.duration);
        if (currentTime >= block.time && currentTime < blockEnd) {
            return block;
        }
    }

    return null;
}

/**
 * Update the current block display
 */
function updateCurrentBlock() {
    const currentBlockEl = document.getElementById('currentBlock');
    if (!currentBlockEl) return;

    const block = getCurrentBlock();

    if (block) {
        const blockTimeEl = currentBlockEl.querySelector('.block-time');
        const blockTaskEl = currentBlockEl.querySelector('.block-task');

        if (blockTimeEl) blockTimeEl.textContent = block.time;
        if (blockTaskEl) blockTaskEl.textContent = block.task;

        currentBlockEl.classList.add('active');
    } else {
        const blockTimeEl = currentBlockEl.querySelector('.block-time');
        const blockTaskEl = currentBlockEl.querySelector('.block-task');

        if (blockTimeEl) blockTimeEl.textContent = '--:--';
        if (blockTaskEl) blockTaskEl.textContent = 'No active block';

        currentBlockEl.classList.remove('active');
    }
}

/**
 * Render time blocks
 */
function renderTimeBlocks() {
    const timeblockList = document.getElementById('timeblockList');
    if (!timeblockList) return;

    if (AppState.timeblocks.length === 0) {
        timeblockList.innerHTML = '<div class="empty-state">No time blocks scheduled</div>';
        return;
    }

    timeblockList.innerHTML = AppState.timeblocks.map(block => `
        <div class="timeblock-item ${block.completed ? 'completed' : ''}" data-block-id="${block.id}">
            <div class="block-time">${block.time}</div>
            <div class="block-task">${escapeHtml(block.task)}</div>
            <div class="block-duration">${block.duration}m</div>
            <button onclick="completeTimeBlock('${block.id}')">
                ${block.completed ? '✓' : '○'}
            </button>
        </div>
    `).join('');

    updateCurrentBlock();
}

/**
 * Complete a time block
 * @param {string} blockId - Block ID
 */
function completeTimeBlock(blockId) {
    const block = AppState.timeblocks.find(b => b.id === blockId);
    if (block) {
        block.completed = !block.completed;
        block.completedAt = block.completed ? new Date().toISOString() : null;
        renderTimeBlocks();
        debouncedSave();
    }
}

/**
 * Open time blocker modal
 */
function openTimeBlocker() {
    const time = prompt('Start time (HH:MM):');
    if (!time) return;

    const task = prompt('Task:');
    if (!task) return;

    const duration = parseInt(prompt('Duration (minutes):', '60'));
    if (!duration) return;

    addTimeBlock(time, task, duration);
}

/**
 * Start block updates interval
 */
function startBlockUpdates() {
    // Update every minute
    blockUpdateInterval = setInterval(() => {
        updateCurrentBlock();
    }, 60000);
}

/* ============================================================================
   FOCUS MODE (POMODORO)
   ============================================================================ */

/**
 * Render focus mode
 */
function renderFocusMode() {
    const focusTask = document.getElementById('focusTask');
    const timerDisplay = document.getElementById('timerDisplay');

    if (focusTask && AppState.frogTask) {
        focusTask.textContent = AppState.frogTask.task || 'No task selected';
    }

    if (timerDisplay) {
        updateTimerDisplay();
    }
}

/**
 * Set timer duration
 * @param {number} minutes - Duration in minutes
 */
function setTimer(minutes) {
    FocusTimer.minutes = minutes;
    FocusTimer.seconds = 0;
    FocusTimer.totalSeconds = minutes * 60;
    FocusTimer.isRunning = false;
    FocusTimer.isPaused = false;

    if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
    }

    updateTimerDisplay();
}

/**
 * Start the timer
 */
function startTimer() {
    if (FocusTimer.isRunning && !FocusTimer.isPaused) return;

    FocusTimer.isRunning = true;
    FocusTimer.isPaused = false;

    // Initialize focus session
    if (!AppState.focusSession) {
        AppState.focusSession = {
            id: `focus-${Date.now()}`,
            startedAt: new Date().toISOString(),
            duration: FocusTimer.totalSeconds / 60,
            task: AppState.frogTask ? AppState.frogTask.task : 'Focus session',
            notes: ''
        };
    }

    focusTimerInterval = setInterval(() => {
        if (FocusTimer.seconds === 0) {
            if (FocusTimer.minutes === 0) {
                // Timer complete
                timerComplete();
                return;
            }
            FocusTimer.minutes--;
            FocusTimer.seconds = 59;
        } else {
            FocusTimer.seconds--;
        }

        updateTimerDisplay();
    }, 1000);
}

/**
 * Pause the timer
 */
function pauseTimer() {
    FocusTimer.isPaused = true;
    if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
    }
}

/**
 * Reset the timer
 */
function resetTimer() {
    pauseTimer();
    FocusTimer.minutes = 25;
    FocusTimer.seconds = 0;
    FocusTimer.isRunning = false;
    FocusTimer.isPaused = false;
    updateTimerDisplay();
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;

    const mins = String(FocusTimer.minutes).padStart(2, '0');
    const secs = String(FocusTimer.seconds).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
}

/**
 * Handle timer completion
 */
function timerComplete() {
    pauseTimer();

    // Complete the focus session
    if (AppState.focusSession) {
        AppState.focusSession.completedAt = new Date().toISOString();
    }

    // Show notification
    showNotification('🎉 Focus session complete! Great work!', 'success');

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cymatic OS', {
            body: 'Focus session complete!',
            icon: '🎯'
        });
    }

    debouncedSave();
}

/**
 * Save focus notes
 */
function saveFocusNotes() {
    const focusNotes = document.getElementById('focusNotes');
    if (!focusNotes) return;

    if (AppState.focusSession) {
        AppState.focusSession.notes = focusNotes.value;
        debouncedSave();
    }
}

/* ============================================================================
   PROJECTS MANAGEMENT
   ============================================================================ */

/**
 * Load projects
 * @async
 */
async function loadProjects() {
    renderProjects();
}

/**
 * Add a new project
 */
function addProject() {
    const name = prompt('Project name:');
    if (!name) return;

    const project = {
        id: `project-${Date.now()}`,
        name: name.trim(),
        status: 'planning',
        deadline: 'TBD',
        nextAction: 'Define first action',
        revenueImpact: 'medium',
        createdAt: new Date().toISOString()
    };

    AppState.projects.push(project);
    renderProjects();
    debouncedSave();

    showNotification('Project created', 'success');
}

/**
 * Update a project
 * @param {string} id - Project ID
 * @param {Object} data - Updated data
 */
function updateProject(id, data) {
    const project = AppState.projects.find(p => p.id === id);
    if (project) {
        Object.assign(project, data);
        renderProjects();
        debouncedSave();
    }
}

/**
 * Delete a project
 * @param {string} id - Project ID
 */
function deleteProject(id) {
    if (!confirm('Delete this project?')) return;

    const index = AppState.projects.findIndex(p => p.id === id);
    if (index !== -1) {
        AppState.projects.splice(index, 1);
        renderProjects();
        debouncedSave();
        showNotification('Project deleted', 'success');
    }
}

/**
 * Render projects
 */
function renderProjects() {
    const projectsGrid = document.getElementById('projectsGrid');
    if (!projectsGrid) return;

    if (AppState.projects.length === 0) {
        projectsGrid.innerHTML = '<div class="empty-state">No projects yet. Create your first project!</div>';
        return;
    }

    projectsGrid.innerHTML = AppState.projects.map(project => `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-header">
                <h3>${escapeHtml(project.name)}</h3>
                <span class="project-status ${project.status}">${project.status}</span>
            </div>
            <div class="project-meta">
                <div class="meta-item">
                    <span class="label">Deadline:</span>
                    <span class="value">${escapeHtml(project.deadline || 'TBD')}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Impact:</span>
                    <span class="value impact-${project.revenueImpact}">${project.revenueImpact}</span>
                </div>
            </div>
            <div class="project-next-action">
                <strong>Next:</strong> ${escapeHtml(project.nextAction || 'Define next action')}
            </div>
            <div class="project-actions">
                <button onclick="editProject('${project.id}')">Edit</button>
                <button onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render projects mini (for dashboard)
 */
function renderProjectsMini() {
    const projectsMini = document.getElementById('projectsMini');
    if (!projectsMini) return;

    const topProjects = AppState.projects.slice(0, 3);

    if (topProjects.length === 0) {
        projectsMini.innerHTML = '<div class="empty-state">No active projects</div>';
        return;
    }

    projectsMini.innerHTML = topProjects.map(project => `
        <div class="project-mini-item">
            <div class="project-name">${escapeHtml(project.name)}</div>
            <div class="project-next">${escapeHtml(project.nextAction || 'Define next action')}</div>
        </div>
    `).join('');
}

/**
 * Edit a project
 * @param {string} id - Project ID
 */
function editProject(id) {
    const project = AppState.projects.find(p => p.id === id);
    if (!project) return;

    const name = prompt('Project name:', project.name);
    if (name === null) return;

    const status = prompt('Status (planning/active/paused/completed):', project.status);
    const deadline = prompt('Deadline:', project.deadline);
    const nextAction = prompt('Next action:', project.nextAction);
    const revenueImpact = prompt('Revenue impact (high/medium/low):', project.revenueImpact);

    updateProject(id, {
        name: name || project.name,
        status: status || project.status,
        deadline: deadline || project.deadline,
        nextAction: nextAction || project.nextAction,
        revenueImpact: revenueImpact || project.revenueImpact
    });

    showNotification('Project updated', 'success');
}

/* ============================================================================
   WEEK GOALS & BLOCKERS
   ============================================================================ */

/**
 * Render week goals
 */
function renderWeekGoals() {
    const weekGoals = document.getElementById('weekGoals');
    const weekPercent = document.getElementById('weekPercent');

    if (!weekGoals) return;

    if (AppState.weekGoals.length === 0) {
        weekGoals.innerHTML = '<li class="empty-state">No weekly goals set</li>';
        if (weekPercent) weekPercent.textContent = '0%';
        return;
    }

    const completed = AppState.weekGoals.filter(g => g.completed).length;
    const total = AppState.weekGoals.length;
    const percent = Math.round((completed / total) * 100);

    if (weekPercent) weekPercent.textContent = `${percent}%`;

    weekGoals.innerHTML = AppState.weekGoals.map(goal => `
        <li class="week-goal-item ${goal.completed ? 'completed' : ''}">
            <input type="checkbox"
                   ${goal.completed ? 'checked' : ''}
                   onchange="toggleWeekGoal('${goal.id}')">
            <span>${escapeHtml(goal.text)}</span>
        </li>
    `).join('');
}

/**
 * Toggle week goal completion
 * @param {string} goalId - Goal ID
 */
function toggleWeekGoal(goalId) {
    const goal = AppState.weekGoals.find(g => g.id === goalId);
    if (goal) {
        goal.completed = !goal.completed;
        goal.completedAt = goal.completed ? new Date().toISOString() : null;
        renderWeekGoals();
        debouncedSave();
    }
}

/**
 * Render blockers
 */
function renderBlockers() {
    const blockersList = document.getElementById('blockersList');
    if (!blockersList) return;

    if (AppState.blockers.length === 0) {
        blockersList.innerHTML = '<div class="empty-state">No blockers - clear path ahead!</div>';
        return;
    }

    blockersList.innerHTML = AppState.blockers.map(blocker => `
        <div class="blocker-item" data-blocker-id="${blocker.id}">
            <div class="blocker-text">${escapeHtml(blocker.text)}</div>
            <button onclick="resolveBlocker('${blocker.id}')">Resolve</button>
        </div>
    `).join('');
}

/**
 * Add a blocker
 */
function addBlocker() {
    const text = prompt('What\'s blocking you?');
    if (!text) return;

    const blocker = {
        id: `blocker-${Date.now()}`,
        text: text.trim(),
        addedAt: new Date().toISOString()
    };

    AppState.blockers.push(blocker);
    renderBlockers();
    debouncedSave();

    // Send to server
    sendBlockerToServer(text);
}

/**
 * Resolve a blocker
 * @param {string} blockerId - Blocker ID
 */
function resolveBlocker(blockerId) {
    const index = AppState.blockers.findIndex(b => b.id === blockerId);
    if (index !== -1) {
        AppState.blockers.splice(index, 1);
        renderBlockers();
        debouncedSave();
        showNotification('Blocker resolved!', 'success');
    }
}

/**
 * Send blocker to server
 * @async
 * @param {string} blocker - Blocker text
 */
async function sendBlockerToServer(blocker) {
    try {
        await fetch('http://localhost:8080/api/note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: `BLOCKER: ${blocker}` })
        });
    } catch (error) {
        console.error('Error sending blocker to server:', error);
    }
}

/* ============================================================================
   KNOWLEDGE VAULT
   ============================================================================ */

/**
 * Load vault file tree
 * @async
 */
async function loadVaultTree() {
    const vaultTree = document.getElementById('vaultTree');
    if (!vaultTree) return;

    // Placeholder implementation - would need vault API endpoint
    vaultTree.innerHTML = `
        <li class="vault-folder">
            <span class="folder-icon">📁</span>
            <span>Knowledge Vault</span>
            <ul>
                <li class="vault-file" onclick="openFile('current-state.md')">
                    <span class="file-icon">📄</span>
                    <span>current-state.md</span>
                </li>
                <li class="vault-file" onclick="openFile('progress-tracker.md')">
                    <span class="file-icon">📄</span>
                    <span>progress-tracker.md</span>
                </li>
                <li class="vault-file" onclick="openFile('project-tracker.md')">
                    <span class="file-icon">📄</span>
                    <span>project-tracker.md</span>
                </li>
            </ul>
        </li>
    `;
}

/**
 * Open a file in the vault editor
 * @async
 * @param {string} path - File path
 */
async function openFile(path) {
    const currentFile = document.getElementById('currentFile');
    const vaultEditor = document.getElementById('vaultEditor');

    if (!vaultEditor) return;

    if (currentFile) currentFile.textContent = path;

    // Placeholder - would need API endpoint to read files
    vaultEditor.value = `Loading ${path}...`;

    showNotification(`Opened ${path}`, 'info');
}

/**
 * Save the current file
 */
function saveFile() {
    const currentFile = document.getElementById('currentFile');
    const vaultEditor = document.getElementById('vaultEditor');

    if (!vaultEditor || !currentFile) return;

    const path = currentFile.textContent;
    const content = vaultEditor.value;

    // Placeholder - would need API endpoint to write files
    console.log(`Saving ${path}:`, content);

    showNotification('File saved', 'success');
}

/* ============================================================================
   CLAUDE CODE INTEGRATION
   ============================================================================ */

/**
 * Load Claude commands
 * @async
 */
async function loadClaudeCommands() {
    try {
        const response = await fetch('http://localhost:8080/api/claude/commands');
        const result = await response.json();

        if (result.success) {
            renderClaudeCommands(result.commands);
        }
    } catch (error) {
        console.error('Error loading Claude commands:', error);
    }
}

/**
 * Render Claude commands
 * @param {Array} commands - Array of command names
 */
function renderClaudeCommands(commands) {
    const commandChips = document.getElementById('commandChips');
    if (!commandChips) return;

    commandChips.innerHTML = commands.map(cmd => `
        <button class="command-chip" onclick="sendClaudeMessage('/${cmd}')">
            /${cmd}
        </button>
    `).join('');
}

/**
 * Send a message to Claude
 * @async
 * @param {string} message - Message text (optional, will read from input if not provided)
 */
async function sendClaudeMessage(message) {
    const claudeInput = document.getElementById('claudeInput');
    const text = message || (claudeInput ? claudeInput.value.trim() : '');

    if (!text) return;

    // Add user message to chat
    AppState.claudeMessages.push({
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
    });

    if (claudeInput) claudeInput.value = '';

    renderClaudeMessages();

    // Show typing indicator
    showClaudeTyping();

    // Send to server (placeholder)
    try {
        const response = await fetch('http://localhost:8080/api/claude/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: text,
                context: {
                    energy: AppState.energy,
                    stress: AppState.stress,
                    frogTask: AppState.frogTask,
                    taskCount: Object.values(AppState.tasks).flat().length
                }
            })
        });

        const result = await response.json();

        hideClaudeTyping();

        // Add Claude's response
        AppState.claudeMessages.push({
            role: 'assistant',
            content: result.message || 'Command request created. Claude will process it soon.',
            timestamp: new Date().toISOString()
        });

        renderClaudeMessages();
    } catch (error) {
        console.error('Error sending to Claude:', error);
        hideClaudeTyping();

        AppState.claudeMessages.push({
            role: 'assistant',
            content: 'Sorry, I\'m having trouble connecting right now. Please try again.',
            timestamp: new Date().toISOString()
        });

        renderClaudeMessages();
    }
}

/**
 * Handle Enter key in Claude input
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleClaudeEnter(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        sendClaudeMessage();
    }
}

/**
 * Render Claude messages
 */
function renderClaudeMessages() {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;

    // Keep welcome message if no messages
    if (AppState.claudeMessages.length === 0) return;

    // Clear welcome message
    chatContainer.innerHTML = '';

    // Render messages
    AppState.claudeMessages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${msg.role}`;

        const avatar = msg.role === 'user' ? '👤' : '🤖';
        const content = parseMarkdown(msg.content);

        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">${content}</div>
        `;

        chatContainer.appendChild(messageEl);
    });

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Show Claude typing indicator
 */
function showClaudeTyping() {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;

    const typingEl = document.createElement('div');
    typingEl.className = 'chat-message assistant typing-indicator';
    typingEl.id = 'claudeTyping';
    typingEl.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;

    chatContainer.appendChild(typingEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Hide Claude typing indicator
 */
function hideClaudeTyping() {
    const typingEl = document.getElementById('claudeTyping');
    if (typingEl) {
        typingEl.remove();
    }
}

/* ============================================================================
   INSIGHTS & ANALYTICS
   ============================================================================ */

/**
 * Generate insights
 * @async
 */
async function generateInsights() {
    generateEnergyChart();
    calculateCompletionRate();
    analyzeFocusTime();
    getAIRecommendations();
}

/**
 * Generate energy chart
 */
function generateEnergyChart() {
    const canvas = document.getElementById('energyChart');
    if (!canvas) return;

    // Placeholder - would use Chart.js
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(10, 10, 100, 100);
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui';
    ctx.fillText('Energy Chart', 20, 60);
    ctx.fillText('(Chart.js needed)', 20, 80);
}

/**
 * Calculate completion rate
 */
function calculateCompletionRate() {
    const completionStats = document.getElementById('completionStats');
    if (!completionStats) return;

    const allTasks = Object.values(AppState.tasks).flat();
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    completionStats.innerHTML = `
        <div class="stat-large">${rate}%</div>
        <div class="stat-label">Completion Rate</div>
        <div class="stat-detail">${completed} of ${total} tasks completed</div>
    `;
}

/**
 * Analyze focus time
 */
function analyzeFocusTime() {
    const focusStats = document.getElementById('focusStats');
    if (!focusStats) return;

    // Placeholder analysis
    focusStats.innerHTML = `
        <div class="stat-large">0h 0m</div>
        <div class="stat-label">Total Focus Time</div>
        <div class="stat-detail">Start a focus session to track</div>
    `;
}

/**
 * Get AI recommendations
 */
function getAIRecommendations() {
    const aiRecommendations = document.getElementById('aiRecommendations');
    if (!aiRecommendations) return;

    const recommendations = [];

    // Energy-based recommendations
    if (AppState.energy <= 3) {
        recommendations.push('Low energy detected. Focus on low-energy tasks or take a break.');
    } else if (AppState.energy >= 8) {
        recommendations.push('High energy! Perfect time for high-energy or creative tasks.');
    }

    // Stress-based recommendations
    if (AppState.stress >= 7) {
        recommendations.push('High stress level. Consider delegation or breaking tasks into smaller chunks.');
    }

    // Task-based recommendations
    const allTasks = Object.values(AppState.tasks).flat();
    if (allTasks.length === 0) {
        recommendations.push('No tasks scheduled. Use the GTD inbox to capture what\'s on your mind.');
    }

    // Frog task
    if (!AppState.frogTask || !AppState.frogTask.task) {
        recommendations.push('Set your Frog Task - the one thing that must get done today.');
    }

    if (recommendations.length === 0) {
        recommendations.push('You\'re doing great! Keep up the momentum.');
    }

    aiRecommendations.innerHTML = `
        <ul class="recommendation-list">
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    `;
}

/* ============================================================================
   QUICK CAPTURE MODAL
   ============================================================================ */

/**
 * Open quick capture modal
 */
function openQuickCapture() {
    const modal = document.getElementById('quickCaptureModal');
    const input = document.getElementById('quickCaptureInput');

    if (modal) {
        modal.style.display = 'flex';
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

/**
 * Close quick capture modal
 */
function closeQuickCapture() {
    const modal = document.getElementById('quickCaptureModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Save quick capture
 */
function saveQuickCapture() {
    const input = document.getElementById('quickCaptureInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Add to GTD inbox
    const item = {
        id: `gtd-${Date.now()}`,
        text,
        status: 'inbox',
        capturedAt: new Date().toISOString(),
        processed: false
    };

    AppState.gtdInbox.push(item);
    renderGTDInbox();
    debouncedSave();

    closeQuickCapture();
    showNotification('Captured to GTD inbox', 'success');
}

/* ============================================================================
   DATA PERSISTENCE
   ============================================================================ */

/**
 * Save data to server
 * @async
 * @param {Object} data - Data to save
 */
async function saveToServer(data) {
    try {
        const response = await fetch('http://localhost:8080/api/dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            console.log('✅ Data saved to server');
        } else {
            console.error('❌ Failed to save to server:', result.error);
        }
    } catch (error) {
        console.error('❌ Error saving to server:', error);
    }
}

/**
 * Save data to localStorage
 * @param {Object} data - Data to save
 */
function saveToLocal(data) {
    try {
        localStorage.setItem('cymatic-os-state', JSON.stringify(data));
        console.log('💾 Data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving to localStorage:', error);
    }
}

/**
 * Load data from server
 * @async
 */
async function loadFromServer() {
    try {
        const response = await fetch('http://localhost:8080/api/dashboard');
        const result = await response.json();

        if (result.success) {
            console.log('📥 Data loaded from server');
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error loading from server:', error);
        return null;
    }
}

/**
 * Load data from localStorage
 */
function loadFromLocal() {
    try {
        const saved = localStorage.getItem('cymatic-os-state');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(AppState, data);
            console.log('💾 Data loaded from localStorage');
            renderDashboard();
        }
    } catch (error) {
        console.error('❌ Error loading from localStorage:', error);
    }
}

/**
 * Sync data (bi-directional)
 * @async
 */
async function syncData() {
    AppState.isSyncing = true;
    updateConnectionStatus(AppState.isOnline);

    try {
        // Load from server
        await loadDashboardData();

        // Save current state to server
        await saveToServer(AppState);

        showNotification('Data synced successfully', 'success');
    } catch (error) {
        console.error('❌ Sync error:', error);
        showNotification('Sync failed. Working offline.', 'error');
    } finally {
        AppState.isSyncing = false;
        updateConnectionStatus(AppState.isOnline);
    }
}

/**
 * Debounced save function
 */
const debouncedSave = debounce(() => {
    saveToLocal(AppState);
    if (AppState.isOnline) {
        saveToServer(AppState);
    }
}, 500);

/* ============================================================================
   UTILITY FUNCTIONS
   ============================================================================ */

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format time for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time
 */
function formatTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Add minutes to a time string
 * @param {string} time - Time in HH:MM format
 * @param {number} minutes - Minutes to add
 * @returns {string} New time in HH:MM format
 */
function addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * Calculate progress percentage
 * @param {number} completed - Completed count
 * @param {number} total - Total count
 * @returns {number} Progress percentage
 */
function calculateProgress(completed, total) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
}

/**
 * Parse basic markdown to HTML
 * @param {string} text - Markdown text
 * @returns {string} HTML
 */
function parseMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show a notification toast
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Update current time display
 */
function updateCurrentTime() {
    const currentTime = document.getElementById('currentTime');
    if (!currentTime) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    currentTime.innerHTML = `
        <div class="time">${timeString}</div>
        <div class="date">${dateString}</div>
    `;
}

/**
 * Start clock updates
 */
function startClockUpdates() {
    updateCurrentTime();
    clockInterval = setInterval(updateCurrentTime, 1000);
}

/* ============================================================================
   APP INITIALIZATION
   ============================================================================ */

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌊 Cymatic OS Dashboard v2.0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    // Initialize application
    await initApp();
});

// Export for debugging in console
if (typeof window !== 'undefined') {
    window.CymaticOS = {
        AppState,
        switchView,
        addTask,
        completeTask,
        deleteTask,
        captureGTD,
        addProject,
        syncData,
        sendClaudeMessage,
        version: '2.0.0'
    };

    console.log('✅ CymaticOS global object available for debugging');
}
