// Cymatic OS Dashboard - Main JavaScript

// Configuration
const API_BASE = window.location.origin;
const USE_SERVER = true; // Set to false for standalone mode

// Dashboard State
let dashboardData = {
    currentState: {},
    projects: [],
    progress: {},
    patterns: {}
};

// WebSocket connection
let ws = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Cymatic OS Dashboard Initializing...');

    if (USE_SERVER) {
        connectWebSocket();
        loadDashboardFromServer();
    } else {
        loadDashboardDataStandalone();
    }

    updateLastUpdateTime();
});

// Connect to WebSocket for real-time updates
function connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ Connected to Cymatic OS Server');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'initial' || message.type === 'update') {
            dashboardData = message.data;
            renderDashboard();
            updateLastUpdateTime();
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.log('Falling back to standalone mode');
        loadDashboardDataStandalone();
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect in 5s...');
        setTimeout(connectWebSocket, 5000);
    };
}

// Load from server via API
async function loadDashboardFromServer() {
    try {
        const response = await fetch(`${API_BASE}/api/dashboard`);
        const result = await response.json();

        if (result.success) {
            dashboardData = result.data;
            renderDashboard();
        }
    } catch (error) {
        console.error('Error loading from server:', error);
        console.log('Using standalone mode');
        loadDashboardDataStandalone();
    }
}

// Standalone mode with sample data
async function loadDashboardDataStandalone() {
    try {
        await loadCurrentState();
        await loadProjects();
        await loadProgress();
        await loadPatterns();

        renderDashboard();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Load Current State (standalone)
async function loadCurrentState() {
    dashboardData.currentState = {
        energy: 5,
        stress: 5,
        emotionalStatus: 'Stable',
        peakHours: 'Morning',
        todayPriority: 'Update your current-state.md to see live data',
        todayDeadline: 'Today',
        todayWhy: 'Connect to server for real-time updates'
    };
}

// Load Projects (standalone)
async function loadProjects() {
    dashboardData.projects = [
        {
            name: 'Set up your Knowledge Vault',
            status: 'Pending',
            deadline: 'Today',
            nextAction: 'Update current-state.md with your active projects',
            revenueImpact: 'high'
        }
    ];
}

// Load Progress (standalone)
async function loadProgress() {
    dashboardData.progress = {
        weekOutcomes: [
            'Install dependencies: npm install',
            'Start server: npm start',
            'Update Knowledge Vault files'
        ],
        recentActions: [
            'Dashboard initialized successfully!'
        ],
        keyWins: [
            'Cymatic OS Dashboard is live!'
        ]
    };
}

// Load Patterns (standalone)
async function loadPatterns() {
    dashboardData.patterns = {
        blockers: [
            'Server not running - start with: npm start',
            'Knowledge Vault needs updating',
            'Dependencies may need installation'
        ],
        insights: [
            'Dashboard running in standalone mode',
            'Start the server to see live data from your markdown files',
            'WebSocket will provide real-time updates when server is running'
        ],
        quickActions: [
            'Install dependencies (npm install)',
            'Start server (npm start)',
            'Update current-state.md with your data'
        ]
    };
}

// Render Dashboard
function renderDashboard() {
    renderCurrentStatus();
    renderTodaysPriority();
    renderProjects();
    renderWeekOutcomes();
    renderBlockers();
    renderQuickActions();
    renderProgress();
    renderInsights();
}

// Render Current Status
function renderCurrentStatus() {
    const { energy, stress, emotionalStatus, peakHours } = dashboardData.currentState;

    // Energy bar
    const energyBar = document.getElementById('energyBar');
    const energyValue = document.getElementById('energyValue');
    energyBar.style.width = `${energy * 10}%`;
    energyValue.textContent = `${energy}/10`;

    // Stress bar
    const stressBar = document.getElementById('stressBar');
    const stressValue = document.getElementById('stressValue');
    stressBar.style.width = `${stress * 10}%`;
    stressValue.textContent = `${stress}/10`;

    // Emotional status
    document.getElementById('emotionalStatus').textContent = emotionalStatus;

    // Peak hours
    document.getElementById('peakHours').textContent = peakHours;
}

// Render Today's Priority
function renderTodaysPriority() {
    const { todayPriority, todayDeadline, todayWhy } = dashboardData.currentState;

    document.getElementById('todayPriority').textContent = todayPriority;
    document.getElementById('todayDeadline').textContent = todayDeadline;
    document.getElementById('todayWhy').textContent = todayWhy;
}

// Render Projects
function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';

    dashboardData.projects.forEach((project, index) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';

        projectItem.innerHTML = `
            <h3>${index + 1}. ${project.name}</h3>
            <div class="project-meta">
                <div class="project-meta-item">
                    <strong>Status:</strong> ${project.status}
                </div>
                <div class="project-meta-item">
                    <strong>Deadline:</strong> ${project.deadline}
                </div>
                <div class="project-meta-item impact-${project.revenueImpact}">
                    <strong>Impact:</strong> ${project.revenueImpact.charAt(0).toUpperCase() + project.revenueImpact.slice(1)}
                </div>
            </div>
            <div style="margin-top: 0.5rem; color: var(--text-secondary);">
                <strong>Next:</strong> ${project.nextAction}
            </div>
        `;

        projectsList.appendChild(projectItem);
    });
}

// Render Week Outcomes
function renderWeekOutcomes() {
    const weekOutcomes = document.getElementById('weekOutcomes');
    weekOutcomes.innerHTML = '';

    dashboardData.progress.weekOutcomes.forEach(outcome => {
        const li = document.createElement('li');
        li.textContent = outcome;
        weekOutcomes.appendChild(li);
    });
}

// Render Blockers
function renderBlockers() {
    const blockersList = document.getElementById('blockersList');
    blockersList.innerHTML = '';

    dashboardData.patterns.blockers.forEach((blocker, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${blocker}`;
        blockersList.appendChild(li);
    });
}

// Render Quick Actions
function renderQuickActions() {
    const quickActions = document.getElementById('quickActions');
    quickActions.innerHTML = '';

    dashboardData.patterns.quickActions.forEach(action => {
        const li = document.createElement('li');
        li.textContent = action;
        quickActions.appendChild(li);
    });
}

// Render Progress
function renderProgress() {
    const recentActions = document.getElementById('recentActions');
    recentActions.innerHTML = '';

    dashboardData.progress.recentActions.forEach(action => {
        const p = document.createElement('p');
        p.textContent = `• ${action}`;
        recentActions.appendChild(p);
    });

    const keyWins = document.getElementById('keyWins');
    keyWins.innerHTML = '';

    dashboardData.progress.keyWins.forEach(win => {
        const p = document.createElement('p');
        p.textContent = `🎉 ${win}`;
        keyWins.appendChild(p);
    });
}

// Render Insights
function renderInsights() {
    const insights = document.getElementById('insights');
    insights.innerHTML = '';

    dashboardData.patterns.insights.forEach(insight => {
        const p = document.createElement('p');
        p.textContent = `💡 ${insight}`;
        p.style.marginBottom = '0.75rem';
        insights.appendChild(p);
    });
}

// Refresh Dashboard
function refreshDashboard() {
    console.log('Refreshing dashboard...');
    loadDashboardData();
    updateLastUpdateTime();
}

// Update Last Update Time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = timeString;
}

// Show Error
function showError(message) {
    console.error(message);
    // You could add a toast notification here
}

// Auto-refresh every 5 minutes
setInterval(() => {
    refreshDashboard();
}, 5 * 60 * 1000);
