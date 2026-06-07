// Cymatic OS Dashboard Server
// Bridges the web dashboard with Claude Code and live markdown files

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Paths
const BASE_PATH = path.join(__dirname, '../..');
const KNOWLEDGE_VAULT = path.join(BASE_PATH, '01-Knowledge-Vault');
const DATA_DIR = path.join(__dirname, '.dashboard-data');

// Data cache
let dashboardCache = {
    currentState: null,
    projects: null,
    progress: null,
    patterns: null,
    lastUpdate: null
};

// Simple life items storage
let lifeItems = [];
let currentStatus = {};

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('Dashboard client connected');

    // Send current data immediately
    ws.send(JSON.stringify({
        type: 'initial',
        data: dashboardCache
    }));

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            await handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('Dashboard client disconnected');
    });
});

// Handle WebSocket messages
async function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        case 'refresh':
            await loadAllData();
            broadcast({ type: 'update', data: dashboardCache });
            break;

        case 'update-priority':
            await updateTodaysPriority(data.priority);
            ws.send(JSON.stringify({ type: 'success', message: 'Priority updated' }));
            break;

        case 'mark-complete':
            await markWeekOutcomeComplete(data.index);
            ws.send(JSON.stringify({ type: 'success', message: 'Outcome marked complete' }));
            break;

        case 'add-blocker':
            await addBlocker(data.blocker);
            ws.send(JSON.stringify({ type: 'success', message: 'Blocker added' }));
            break;

        case 'quick-note':
            await addQuickNote(data.note);
            ws.send(JSON.stringify({ type: 'success', message: 'Note saved' }));
            break;
    }
}

// Broadcast to all connected clients
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// API Routes

// Get dashboard data
app.get('/api/dashboard', async (req, res) => {
    try {
        await loadAllData();
        res.json({
            success: true,
            data: dashboardCache
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update today's priority
app.post('/api/priority', async (req, res) => {
    try {
        const { priority, deadline, why } = req.body;
        await updateTodaysPriority({ priority, deadline, why });

        await loadAllData();
        broadcast({ type: 'update', data: dashboardCache });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add quick note
app.post('/api/note', async (req, res) => {
    try {
        const { note } = req.body;
        await addQuickNote(note);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TASKS API
// ============================================

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { bucket, content, energy } = req.body;

        if (!bucket || !content) {
            return res.status(400).json({ success: false, error: 'Bucket and content required' });
        }

        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };

        const newTask = {
            id: Date.now().toString(),
            content,
            energy: energy || 'medium',
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks[bucket].push(newTask);
        await writeJSON('tasks.json', tasks);

        // Update markdown file
        await updateTasksMarkdown(tasks);

        broadcast({ type: 'tasks-update', data: tasks });
        res.json({ success: true, data: newTask });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        let updated = false;

        for (const bucket in tasks) {
            const taskIndex = tasks[bucket].findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                tasks[bucket][taskIndex] = { ...tasks[bucket][taskIndex], ...updates };
                updated = true;
                break;
            }
        }

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        await writeJSON('tasks.json', tasks);
        await updateTasksMarkdown(tasks);

        broadcast({ type: 'tasks-update', data: tasks });
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        let deleted = false;

        for (const bucket in tasks) {
            const taskIndex = tasks[bucket].findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                tasks[bucket].splice(taskIndex, 1);
                deleted = true;
                break;
            }
        }

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        await writeJSON('tasks.json', tasks);
        await updateTasksMarkdown(tasks);

        broadcast({ type: 'tasks-update', data: tasks });
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark task complete
app.post('/api/tasks/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        let task = null;

        for (const bucket in tasks) {
            const taskObj = tasks[bucket].find(t => t.id === id);
            if (taskObj) {
                taskObj.completed = true;
                taskObj.completedAt = new Date().toISOString();
                task = taskObj;
                break;
            }
        }

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        await writeJSON('tasks.json', tasks);
        await updateTasksMarkdown(tasks);

        broadcast({ type: 'tasks-update', data: tasks });
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Move task to different bucket
app.post('/api/tasks/:id/move', async (req, res) => {
    try {
        const { id } = req.params;
        const { newBucket } = req.body;

        if (!newBucket || !['high', 'low', 'creative'].includes(newBucket)) {
            return res.status(400).json({ success: false, error: 'Valid newBucket required' });
        }

        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        let task = null;
        let oldBucket = null;

        for (const bucket in tasks) {
            const taskIndex = tasks[bucket].findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                task = tasks[bucket].splice(taskIndex, 1)[0];
                oldBucket = bucket;
                break;
            }
        }

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        tasks[newBucket].push(task);
        await writeJSON('tasks.json', tasks);
        await updateTasksMarkdown(tasks);

        broadcast({ type: 'tasks-update', data: tasks });
        res.json({ success: true, data: { task, oldBucket, newBucket } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GTD INBOX API
// ============================================

// Get inbox items
app.get('/api/gtd/inbox', async (req, res) => {
    try {
        const inbox = await readJSON('gtd.json') || { inbox: [], processed: [] };
        res.json({ success: true, data: inbox.inbox });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add inbox item
app.post('/api/gtd/inbox', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, error: 'Content required' });
        }

        const gtd = await readJSON('gtd.json') || { inbox: [], processed: [] };

        const newItem = {
            id: Date.now().toString(),
            content,
            createdAt: new Date().toISOString(),
            status: 'inbox'
        };

        gtd.inbox.push(newItem);
        await writeJSON('gtd.json', gtd);

        broadcast({ type: 'gtd-update', data: gtd });
        res.json({ success: true, data: newItem });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Process inbox item
app.post('/api/gtd/inbox/:id/process', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, data } = req.body;

        if (!action || !['project', 'action', 'waiting', 'someday'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Valid action required' });
        }

        const gtd = await readJSON('gtd.json') || { inbox: [], processed: [] };
        const itemIndex = gtd.inbox.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const item = gtd.inbox.splice(itemIndex, 1)[0];
        item.action = action;
        item.actionData = data;
        item.processedAt = new Date().toISOString();

        gtd.processed.push(item);
        await writeJSON('gtd.json', gtd);

        broadcast({ type: 'gtd-update', data: gtd });
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete inbox item
app.delete('/api/gtd/inbox/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const gtd = await readJSON('gtd.json') || { inbox: [], processed: [] };

        const itemIndex = gtd.inbox.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        gtd.inbox.splice(itemIndex, 1);
        await writeJSON('gtd.json', gtd);

        broadcast({ type: 'gtd-update', data: gtd });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TIME BLOCKS API
// ============================================

// Get today's time blocks
app.get('/api/timeblocks', async (req, res) => {
    try {
        const blocks = await readJSON('timeblocks.json') || [];
        const today = new Date().toISOString().split('T')[0];
        const todayBlocks = blocks.filter(b => b.date === today);

        res.json({ success: true, data: todayBlocks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create time block
app.post('/api/timeblocks', async (req, res) => {
    try {
        const { time, task, duration } = req.body;

        if (!time || !task) {
            return res.status(400).json({ success: false, error: 'Time and task required' });
        }

        const blocks = await readJSON('timeblocks.json') || [];

        const newBlock = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            time,
            task,
            duration: duration || 60,
            completed: false,
            createdAt: new Date().toISOString()
        };

        blocks.push(newBlock);
        await writeJSON('timeblocks.json', blocks);

        broadcast({ type: 'timeblocks-update', data: blocks });
        res.json({ success: true, data: newBlock });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update time block
app.put('/api/timeblocks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const blocks = await readJSON('timeblocks.json') || [];
        const blockIndex = blocks.findIndex(b => b.id === id);

        if (blockIndex === -1) {
            return res.status(404).json({ success: false, error: 'Time block not found' });
        }

        blocks[blockIndex] = { ...blocks[blockIndex], ...updates };
        await writeJSON('timeblocks.json', blocks);

        broadcast({ type: 'timeblocks-update', data: blocks });
        res.json({ success: true, data: blocks[blockIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete time block
app.delete('/api/timeblocks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const blocks = await readJSON('timeblocks.json') || [];

        const blockIndex = blocks.findIndex(b => b.id === id);
        if (blockIndex === -1) {
            return res.status(404).json({ success: false, error: 'Time block not found' });
        }

        blocks.splice(blockIndex, 1);
        await writeJSON('timeblocks.json', blocks);

        broadcast({ type: 'timeblocks-update', data: blocks });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROJECTS API
// ============================================

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await readJSON('projects.json') || [];
        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create project
app.post('/api/projects', async (req, res) => {
    try {
        const { name, status, deadline, impact } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name required' });
        }

        const projects = await readJSON('projects.json') || [];

        const newProject = {
            id: Date.now().toString(),
            name,
            status: status || 'planning',
            deadline: deadline || null,
            impact: impact || 'medium',
            tasks: [],
            createdAt: new Date().toISOString()
        };

        projects.push(newProject);
        await writeJSON('projects.json', projects);
        await updateProjectsMarkdown(projects);

        broadcast({ type: 'projects-update', data: projects });
        res.json({ success: true, data: newProject });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const projects = await readJSON('projects.json') || [];
        const projectIndex = projects.findIndex(p => p.id === id);

        if (projectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        projects[projectIndex] = { ...projects[projectIndex], ...updates };
        await writeJSON('projects.json', projects);
        await updateProjectsMarkdown(projects);

        broadcast({ type: 'projects-update', data: projects });
        res.json({ success: true, data: projects[projectIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const projects = await readJSON('projects.json') || [];

        const projectIndex = projects.findIndex(p => p.id === id);
        if (projectIndex === -1) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        projects.splice(projectIndex, 1);
        await writeJSON('projects.json', projects);
        await updateProjectsMarkdown(projects);

        broadcast({ type: 'projects-update', data: projects });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FROG TASK API
// ============================================

// Get today's frog task
app.get('/api/frog', async (req, res) => {
    try {
        const frog = await readJSON('frog.json') || null;
        const today = new Date().toISOString().split('T')[0];

        // Return frog only if it's for today
        if (frog && frog.date === today) {
            res.json({ success: true, data: frog });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Set frog task
app.post('/api/frog', async (req, res) => {
    try {
        const { task, deadline, why } = req.body;

        if (!task) {
            return res.status(400).json({ success: false, error: 'Task required' });
        }

        const frog = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            task,
            deadline: deadline || 'Today',
            why: why || 'Most important task',
            completed: false,
            createdAt: new Date().toISOString()
        };

        await writeJSON('frog.json', frog);

        broadcast({ type: 'frog-update', data: frog });
        res.json({ success: true, data: frog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Complete frog task
app.post('/api/frog/complete', async (req, res) => {
    try {
        const frog = await readJSON('frog.json');

        if (!frog) {
            return res.status(404).json({ success: false, error: 'No frog task set' });
        }

        frog.completed = true;
        frog.completedAt = new Date().toISOString();

        await writeJSON('frog.json', frog);

        broadcast({
            type: 'frog-complete',
            data: {
                frog,
                celebration: 'You ate the frog! Great work!'
            }
        });

        res.json({ success: true, data: frog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// WEEK GOALS & BLOCKERS API
// ============================================

// Get this week's goals
app.get('/api/week-goals', async (req, res) => {
    try {
        const goals = await readJSON('week-goals.json') || [];
        res.json({ success: true, data: goals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add goal
app.post('/api/week-goals', async (req, res) => {
    try {
        const { goal } = req.body;

        if (!goal) {
            return res.status(400).json({ success: false, error: 'Goal required' });
        }

        const goals = await readJSON('week-goals.json') || [];

        const newGoal = {
            id: Date.now().toString(),
            goal,
            completed: false,
            createdAt: new Date().toISOString()
        };

        goals.push(newGoal);
        await writeJSON('week-goals.json', goals);

        broadcast({ type: 'week-goals-update', data: goals });
        res.json({ success: true, data: newGoal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle goal complete
app.put('/api/week-goals/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const goals = await readJSON('week-goals.json') || [];

        const goalIndex = goals.findIndex(g => g.id === id);
        if (goalIndex === -1) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }

        goals[goalIndex].completed = !goals[goalIndex].completed;
        if (goals[goalIndex].completed) {
            goals[goalIndex].completedAt = new Date().toISOString();
        } else {
            delete goals[goalIndex].completedAt;
        }

        await writeJSON('week-goals.json', goals);

        broadcast({ type: 'week-goals-update', data: goals });
        res.json({ success: true, data: goals[goalIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete goal
app.delete('/api/week-goals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const goals = await readJSON('week-goals.json') || [];

        const goalIndex = goals.findIndex(g => g.id === id);
        if (goalIndex === -1) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }

        goals.splice(goalIndex, 1);
        await writeJSON('week-goals.json', goals);

        broadcast({ type: 'week-goals-update', data: goals });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get current blockers
app.get('/api/blockers', async (req, res) => {
    try {
        const blockers = await readJSON('blockers.json') || [];
        res.json({ success: true, data: blockers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add blocker
app.post('/api/blockers', async (req, res) => {
    try {
        const { blocker } = req.body;

        if (!blocker) {
            return res.status(400).json({ success: false, error: 'Blocker required' });
        }

        const blockers = await readJSON('blockers.json') || [];

        const newBlocker = {
            id: Date.now().toString(),
            blocker,
            createdAt: new Date().toISOString()
        };

        blockers.push(newBlocker);
        await writeJSON('blockers.json', blockers);

        broadcast({ type: 'blockers-update', data: blockers });
        res.json({ success: true, data: newBlocker });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete blocker
app.delete('/api/blockers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const blockers = await readJSON('blockers.json') || [];

        const blockerIndex = blockers.findIndex(b => b.id === id);
        if (blockerIndex === -1) {
            return res.status(404).json({ success: false, error: 'Blocker not found' });
        }

        blockers.splice(blockerIndex, 1);
        await writeJSON('blockers.json', blockers);

        broadcast({ type: 'blockers-update', data: blockers });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// VAULT API
// ============================================

// Get file tree structure
app.get('/api/vault/list', async (req, res) => {
    try {
        const tree = await buildFileTree(KNOWLEDGE_VAULT);
        res.json({ success: true, data: tree });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Read file content
app.get('/api/vault/read', async (req, res) => {
    try {
        const { path: filePath } = req.query;

        if (!filePath) {
            return res.status(400).json({ success: false, error: 'Path required' });
        }

        const fullPath = path.join(KNOWLEDGE_VAULT, filePath);

        // Security check: ensure path is within vault
        if (!fullPath.startsWith(KNOWLEDGE_VAULT)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        res.json({ success: true, data: { path: filePath, content } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Write file content
app.post('/api/vault/write', async (req, res) => {
    try {
        const { path: filePath, content } = req.body;

        if (!filePath || content === undefined) {
            return res.status(400).json({ success: false, error: 'Path and content required' });
        }

        const fullPath = path.join(KNOWLEDGE_VAULT, filePath);

        // Security check: ensure path is within vault
        if (!fullPath.startsWith(KNOWLEDGE_VAULT)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Create backup
        try {
            const existing = await fs.readFile(fullPath, 'utf-8');
            const backupPath = fullPath + '.backup';
            await fs.writeFile(backupPath, existing, 'utf-8');
        } catch (err) {
            // File might not exist, that's okay
        }

        await fs.writeFile(fullPath, content, 'utf-8');

        broadcast({ type: 'vault-change', file: filePath });
        res.json({ success: true, data: { path: filePath } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search vault
app.get('/api/vault/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ success: false, error: 'Query required' });
        }

        const results = await searchVault(query);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CLAUDE API
// ============================================

// Send message to Claude
app.post('/api/claude/message', async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message required' });
        }

        const queue = await readJSON('claude-queue.json') || { messages: [], responses: [] };

        const newMessage = {
            id: Date.now().toString(),
            message,
            context: context || null,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        queue.messages.push(newMessage);
        await writeJSON('claude-queue.json', queue);

        broadcast({ type: 'claude-message', data: newMessage });
        res.json({ success: true, data: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available slash commands
app.get('/api/claude/commands', async (req, res) => {
    try {
        const commandsPath = path.join(BASE_PATH, '../.claude/commands');
        const files = await fs.readdir(commandsPath);
        const commands = files
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace('.md', ''));

        res.json({ success: true, commands });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get chat history
app.get('/api/claude/history', async (req, res) => {
    try {
        const queue = await readJSON('claude-queue.json') || { messages: [], responses: [] };
        res.json({ success: true, data: queue });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Execute Claude Code command
app.post('/api/claude/execute', async (req, res) => {
    try {
        const { command, args } = req.body;

        // Create a command execution file that Claude can pick up
        const requestPath = path.join(BASE_PATH, '.dashboard-requests');
        await fs.mkdir(requestPath, { recursive: true });

        const requestFile = path.join(requestPath, `${Date.now()}.json`);
        await fs.writeFile(requestFile, JSON.stringify({
            command,
            args: args || {},
            timestamp: new Date().toISOString(),
            status: 'pending'
        }, null, 2));

        res.json({
            success: true,
            message: `Command request created: /${command}`,
            requestId: path.basename(requestFile, '.json')
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// INSIGHTS API
// ============================================

// Get energy pattern data
app.get('/api/insights/energy', async (req, res) => {
    try {
        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        const blocks = await readJSON('timeblocks.json') || [];

        // Analyze energy patterns
        const energyData = analyzeEnergyPatterns(tasks, blocks);

        res.json({ success: true, data: energyData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get completion rate stats
app.get('/api/insights/completion', async (req, res) => {
    try {
        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        const projects = await readJSON('projects.json') || [];
        const goals = await readJSON('week-goals.json') || [];

        const completionStats = calculateCompletionRates(tasks, projects, goals);

        res.json({ success: true, data: completionStats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get focus time analytics
app.get('/api/insights/focus', async (req, res) => {
    try {
        const blocks = await readJSON('timeblocks.json') || [];

        const focusData = analyzeFocusTime(blocks);

        res.json({ success: true, data: focusData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get AI recommendations
app.get('/api/insights/recommendations', async (req, res) => {
    try {
        const tasks = await readJSON('tasks.json') || { high: [], low: [], creative: [] };
        const blocks = await readJSON('timeblocks.json') || [];
        const blockers = await readJSON('blockers.json') || [];
        const state = await parseCurrentState();

        const recommendations = generateRecommendations(tasks, blocks, blockers, state);

        res.json({ success: true, data: recommendations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Data Loading Functions

async function loadAllData() {
    try {
        const [currentState, projects, progress, patterns] = await Promise.all([
            parseCurrentState(),
            parseProjects(),
            parseProgress(),
            parsePatterns()
        ]);

        dashboardCache = {
            currentState,
            projects,
            progress,
            patterns,
            lastUpdate: new Date().toISOString()
        };

        return dashboardCache;
    } catch (error) {
        console.error('Error loading data:', error);
        return dashboardCache;
    }
}

async function parseCurrentState() {
    try {
        const filePath = path.join(KNOWLEDGE_VAULT, 'current-state.md');
        const content = await fs.readFile(filePath, 'utf-8');

        return {
            energy: parseInt(extractValue(content, /Energy.*?(\d+)\/10/i)) || 5,
            stress: parseInt(extractValue(content, /Stress.*?(\d+)\/10/i)) || 5,
            emotionalStatus: extractValue(content, /Emotional Status.*?:\s*(.+)/i) || 'Stable',
            peakHours: extractValue(content, /Peak Energy Time.*?:\s*(.+)/i) || 'Morning',
            todayPriority: extractValue(content, /\*\*Priority\*\*:\s*(.+)/) || 'Set your priority',
            todayDeadline: extractValue(content, /\*\*Deadline\*\*:\s*(.+)/) || 'Today',
            todayWhy: extractValue(content, /\*\*Why Important\*\*:\s*(.+)/) || 'Update your current state'
        };
    } catch (error) {
        console.error('Error parsing current state:', error);
        return getDefaultCurrentState();
    }
}

async function parseProjects() {
    try {
        const filePath = path.join(KNOWLEDGE_VAULT, 'current-state.md');
        const content = await fs.readFile(filePath, 'utf-8');

        const projects = [];
        const projectSection = content.match(/##\s+Active Projects.*?\n([\s\S]+?)(?=##|$)/i);

        if (projectSection) {
            const projectMatches = projectSection[1].matchAll(/###\s+\d+\.\s+(.+?)\n([\s\S]+?)(?=###|##|$)/g);

            for (const match of projectMatches) {
                const name = match[1].trim();
                const projectContent = match[2];

                projects.push({
                    name,
                    status: extractValue(projectContent, /Status.*?:\s*(.+)/i) || 'Active',
                    deadline: extractValue(projectContent, /Deadline.*?:\s*(.+)/i) || 'Ongoing',
                    nextAction: extractValue(projectContent, /Next Action.*?:\s*(.+)/i) || 'Define next action',
                    revenueImpact: (extractValue(projectContent, /Revenue Impact.*?:\s*(\w+)/i) || 'medium').toLowerCase()
                });
            }
        }

        return projects.slice(0, 3);
    } catch (error) {
        console.error('Error parsing projects:', error);
        return [];
    }
}

async function parseProgress() {
    try {
        const filePath = path.join(KNOWLEDGE_VAULT, 'current-state.md');
        const content = await fs.readFile(filePath, 'utf-8');

        const weekSection = content.match(/##\s+This Week's Top 3.*?\n([\s\S]+?)(?=##|$)/i);
        const weekOutcomes = weekSection ? extractList(weekSection[1]) : [];

        return {
            weekOutcomes: weekOutcomes.slice(0, 3),
            recentActions: ['Check progress-tracker.md for detailed actions'],
            keyWins: ['Dashboard integration active!']
        };
    } catch (error) {
        console.error('Error parsing progress:', error);
        return { weekOutcomes: [], recentActions: [], keyWins: [] };
    }
}

async function parsePatterns() {
    try {
        const filePath = path.join(KNOWLEDGE_VAULT, 'current-state.md');
        const content = await fs.readFile(filePath, 'utf-8');

        const blockerSection = content.match(/##\s+Biggest Blockers.*?\n([\s\S]+?)(?=##|$)/i);
        const blockers = blockerSection ? extractList(blockerSection[1]) : [];

        const state = await parseCurrentState();
        const insights = generateInsights(state);

        return {
            blockers: blockers.slice(0, 3),
            insights,
            quickActions: ['Update current-state.md', 'Review project next actions', 'Check weekly outcomes']
        };
    } catch (error) {
        console.error('Error parsing patterns:', error);
        return { blockers: [], insights: [], quickActions: [] };
    }
}

// Helper Functions

function extractValue(content, regex) {
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}

function extractList(content) {
    const items = [];

    // Try numbered lists
    const numberedMatches = content.matchAll(/^\d+\.\s+(.+?)$/gm);
    for (const match of numberedMatches) {
        items.push(match[1].trim());
    }

    // Try bullet points
    if (items.length === 0) {
        const bulletMatches = content.matchAll(/^[-*]\s+(.+?)$/gm);
        for (const match of bulletMatches) {
            items.push(match[1].trim());
        }
    }

    return items;
}

function generateInsights(state) {
    const insights = [];

    if (state.energy <= 3) {
        insights.push(`Low energy (${state.energy}/10) - Break tasks into 15-20 min chunks`);
    }

    if (state.stress >= 7) {
        insights.push(`High stress (${state.stress}/10) - Consider delegation or support`);
    }

    if (insights.length === 0) {
        insights.push('Energy and stress levels within manageable range');
    }

    return insights;
}

function getDefaultCurrentState() {
    return {
        energy: 5,
        stress: 5,
        emotionalStatus: 'Stable',
        peakHours: 'Morning',
        todayPriority: 'Update current-state.md',
        todayDeadline: 'Today',
        todayWhy: 'Keep your dashboard current'
    };
}

// Update Functions

async function updateTodaysPriority({ priority, deadline, why }) {
    const filePath = path.join(KNOWLEDGE_VAULT, 'current-state.md');
    let content = await fs.readFile(filePath, 'utf-8');

    // Update the priority section
    content = content.replace(
        /\*\*Priority\*\*:.*$/m,
        `**Priority**: ${priority}`
    );

    await fs.writeFile(filePath, content, 'utf-8');
}

async function addQuickNote(note) {
    const filePath = path.join(KNOWLEDGE_VAULT, 'progress-tracker.md');
    let content = await fs.readFile(filePath, 'utf-8');

    const timestamp = new Date().toISOString();
    const noteEntry = `\n- [${timestamp}] ${note}`;

    content += noteEntry;
    await fs.writeFile(filePath, content, 'utf-8');
}

async function addBlocker(blocker) {
    const filePath = path.join(KNOWLEDGE_VAULT, 'current-state.md');
    let content = await fs.readFile(filePath, 'utf-8');

    // Add to blockers section
    const blockerSection = content.match(/##\s+Biggest Blockers([\s\S]+?)(?=##|$)/i);
    if (blockerSection) {
        const count = (blockerSection[1].match(/^\d+\./gm) || []).length;
        const newBlocker = `${count + 1}. ${blocker}`;
        content = content.replace(
            /(##\s+Biggest Blockers[\s\S]+?)(\n##)/,
            `$1\n${newBlocker}$2`
        );
    }

    await fs.writeFile(filePath, content, 'utf-8');
}

// ============================================
// HELPER FUNCTIONS FOR DATA MANAGEMENT
// ============================================

// Read JSON file with error handling
async function readJSON(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        // File doesn't exist or is invalid, return null
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error(`Error reading ${filename}:`, error);
        return null;
    }
}

// Write JSON file with backup
async function writeJSON(filename, data) {
    try {
        // Ensure data directory exists
        await fs.mkdir(DATA_DIR, { recursive: true });

        const filePath = path.join(DATA_DIR, filename);

        // Create backup if file exists
        try {
            const existing = await fs.readFile(filePath, 'utf-8');
            const backupPath = path.join(DATA_DIR, `${filename}.backup`);
            await fs.writeFile(backupPath, existing, 'utf-8');
        } catch (err) {
            // File might not exist, that's okay
        }

        // Write new data
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        throw error;
    }
}

// Update tasks in markdown file
async function updateTasksMarkdown(tasks) {
    try {
        const filePath = path.join(KNOWLEDGE_VAULT, 'tasks.md');

        let content = '# Tasks\n\n';
        content += `*Last updated: ${new Date().toISOString()}*\n\n`;

        // High Energy Tasks
        content += '## High Energy Tasks\n\n';
        if (tasks.high && tasks.high.length > 0) {
            tasks.high.forEach(task => {
                const checkbox = task.completed ? '[x]' : '[ ]';
                content += `- ${checkbox} ${task.content} (Energy: ${task.energy})\n`;
            });
        } else {
            content += '*No high energy tasks*\n';
        }

        content += '\n';

        // Low Energy Tasks
        content += '## Low Energy Tasks\n\n';
        if (tasks.low && tasks.low.length > 0) {
            tasks.low.forEach(task => {
                const checkbox = task.completed ? '[x]' : '[ ]';
                content += `- ${checkbox} ${task.content} (Energy: ${task.energy})\n`;
            });
        } else {
            content += '*No low energy tasks*\n';
        }

        content += '\n';

        // Creative Tasks
        content += '## Creative Tasks\n\n';
        if (tasks.creative && tasks.creative.length > 0) {
            tasks.creative.forEach(task => {
                const checkbox = task.completed ? '[x]' : '[ ]';
                content += `- ${checkbox} ${task.content} (Energy: ${task.energy})\n`;
            });
        } else {
            content += '*No creative tasks*\n';
        }

        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        console.error('Error updating tasks markdown:', error);
    }
}

// Update projects in markdown file
async function updateProjectsMarkdown(projects) {
    try {
        const filePath = path.join(KNOWLEDGE_VAULT, 'projects.md');

        let content = '# Projects\n\n';
        content += `*Last updated: ${new Date().toISOString()}*\n\n`;

        if (projects && projects.length > 0) {
            projects.forEach((project, index) => {
                content += `## ${index + 1}. ${project.name}\n\n`;
                content += `- **Status**: ${project.status}\n`;
                content += `- **Deadline**: ${project.deadline || 'Not set'}\n`;
                content += `- **Impact**: ${project.impact}\n`;
                content += `- **Created**: ${new Date(project.createdAt).toLocaleDateString()}\n`;
                content += '\n';
            });
        } else {
            content += '*No active projects*\n';
        }

        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        console.error('Error updating projects markdown:', error);
    }
}

// Build file tree structure
async function buildFileTree(dir, basePath = '') {
    const tree = [];

    try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            // Skip hidden files and backup files
            if (item.name.startsWith('.') || item.name.endsWith('.backup')) {
                continue;
            }

            const itemPath = path.join(basePath, item.name);

            if (item.isDirectory()) {
                const children = await buildFileTree(path.join(dir, item.name), itemPath);
                tree.push({
                    name: item.name,
                    path: itemPath,
                    type: 'directory',
                    children
                });
            } else {
                tree.push({
                    name: item.name,
                    path: itemPath,
                    type: 'file'
                });
            }
        }
    } catch (error) {
        console.error('Error building file tree:', error);
    }

    return tree;
}

// Search vault for query
async function searchVault(query) {
    const results = [];

    async function searchDir(dir, basePath = '') {
        try {
            const items = await fs.readdir(dir, { withFileTypes: true });

            for (const item of items) {
                if (item.name.startsWith('.') || item.name.endsWith('.backup')) {
                    continue;
                }

                const fullPath = path.join(dir, item.name);
                const relativePath = path.join(basePath, item.name);

                if (item.isDirectory()) {
                    await searchDir(fullPath, relativePath);
                } else if (item.name.endsWith('.md')) {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');

                    lines.forEach((line, lineNum) => {
                        if (line.toLowerCase().includes(query.toLowerCase())) {
                            results.push({
                                file: relativePath,
                                line: lineNum + 1,
                                content: line.trim(),
                                context: lines.slice(Math.max(0, lineNum - 1), lineNum + 2).join('\n')
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error searching directory:', error);
        }
    }

    await searchDir(KNOWLEDGE_VAULT);
    return results;
}

// ============================================
// INSIGHTS ANALYSIS FUNCTIONS
// ============================================

// Analyze energy patterns
function analyzeEnergyPatterns(tasks, blocks) {
    const patterns = {
        highEnergyTasks: tasks.high?.length || 0,
        lowEnergyTasks: tasks.low?.length || 0,
        creativeTasks: tasks.creative?.length || 0,
        completedByEnergy: {
            high: tasks.high?.filter(t => t.completed).length || 0,
            low: tasks.low?.filter(t => t.completed).length || 0,
            creative: tasks.creative?.filter(t => t.completed).length || 0
        },
        recommendations: []
    };

    // Generate recommendations based on patterns
    if (patterns.highEnergyTasks > 5) {
        patterns.recommendations.push('You have many high-energy tasks. Consider breaking them into smaller chunks.');
    }

    if (patterns.lowEnergyTasks < 3) {
        patterns.recommendations.push('Add some low-energy tasks for when your energy dips.');
    }

    return patterns;
}

// Calculate completion rates
function calculateCompletionRates(tasks, projects, goals) {
    const stats = {
        tasks: {
            total: 0,
            completed: 0,
            rate: 0
        },
        projects: {
            total: projects.length,
            active: projects.filter(p => p.status === 'active').length,
            completed: projects.filter(p => p.status === 'completed').length
        },
        goals: {
            total: goals.length,
            completed: goals.filter(g => g.completed).length,
            rate: 0
        }
    };

    // Count all tasks
    ['high', 'low', 'creative'].forEach(bucket => {
        if (tasks[bucket]) {
            stats.tasks.total += tasks[bucket].length;
            stats.tasks.completed += tasks[bucket].filter(t => t.completed).length;
        }
    });

    // Calculate rates
    stats.tasks.rate = stats.tasks.total > 0
        ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
        : 0;

    stats.goals.rate = stats.goals.total > 0
        ? Math.round((stats.goals.completed / stats.goals.total) * 100)
        : 0;

    return stats;
}

// Analyze focus time
function analyzeFocusTime(blocks) {
    const today = new Date().toISOString().split('T')[0];
    const todayBlocks = blocks.filter(b => b.date === today);

    const totalPlanned = todayBlocks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const completed = todayBlocks.filter(b => b.completed).length;
    const completedTime = todayBlocks
        .filter(b => b.completed)
        .reduce((sum, b) => sum + (b.duration || 0), 0);

    return {
        totalBlocks: todayBlocks.length,
        completedBlocks: completed,
        totalPlannedMinutes: totalPlanned,
        completedMinutes: completedTime,
        focusRate: todayBlocks.length > 0
            ? Math.round((completed / todayBlocks.length) * 100)
            : 0
    };
}

// Generate AI recommendations
function generateRecommendations(tasks, blocks, blockers, state) {
    const recommendations = [];

    // Energy-based recommendations
    if (state.energy <= 3) {
        recommendations.push({
            type: 'energy',
            priority: 'high',
            message: `Your energy is low (${state.energy}/10). Focus on low-energy tasks and take breaks.`,
            actions: ['Review low-energy task bucket', 'Schedule 15-min break', 'Consider quick win tasks']
        });
    } else if (state.energy >= 7) {
        recommendations.push({
            type: 'energy',
            priority: 'medium',
            message: `High energy detected (${state.energy}/10). Perfect time for challenging tasks!`,
            actions: ['Tackle high-energy tasks', 'Focus on creative work', 'Make progress on complex projects']
        });
    }

    // Stress-based recommendations
    if (state.stress >= 7) {
        recommendations.push({
            type: 'stress',
            priority: 'high',
            message: `Stress level is high (${state.stress}/10). Consider stress management techniques.`,
            actions: ['Take a 10-minute walk', 'Practice deep breathing', 'Delegate or defer non-critical tasks']
        });
    }

    // Blocker recommendations
    if (blockers.length > 0) {
        recommendations.push({
            type: 'blockers',
            priority: 'high',
            message: `You have ${blockers.length} active blocker(s). Address these to improve flow.`,
            actions: ['Review each blocker', 'Identify who can help', 'Schedule blocker resolution time']
        });
    }

    // Task balance recommendations
    const highCount = tasks.high?.length || 0;
    const lowCount = tasks.low?.length || 0;
    const creativeCount = tasks.creative?.length || 0;

    if (highCount > 10) {
        recommendations.push({
            type: 'task-balance',
            priority: 'medium',
            message: `${highCount} high-energy tasks queued. Consider prioritizing or breaking them down.`,
            actions: ['Pick top 3 high-energy tasks', 'Move non-urgent tasks to later', 'Break large tasks into subtasks']
        });
    }

    // Time blocking recommendations
    const todayBlocks = blocks.filter(b => b.date === new Date().toISOString().split('T')[0]);
    if (todayBlocks.length === 0) {
        recommendations.push({
            type: 'time-blocking',
            priority: 'medium',
            message: 'No time blocks scheduled for today. Consider time-blocking your priorities.',
            actions: ['Block time for your frog task', 'Schedule focus sessions', 'Add buffer time between tasks']
        });
    }

    return recommendations;
}

// File Watching for Auto-Refresh

const watcher = chokidar.watch(KNOWLEDGE_VAULT, {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

watcher.on('change', async (path) => {
    console.log(`File changed: ${path}`);
    await loadAllData();
    broadcast({ type: 'update', data: dashboardCache });
});

// Start Server

const server = app.listen(PORT, async () => {
    console.log(`\n🌊 Cymatic OS Dashboard Server Running`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📁 Watching: ${KNOWLEDGE_VAULT}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Load initial data
    await loadAllData();
    console.log('✅ Initial data loaded');
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// ============= SIMPLE LIFE DASHBOARD API =============

// Get all life items
app.get('/api/items', async (req, res) => {
    try {
        const itemsFile = path.join(DATA_DIR, 'life-items.json');
        if (await exists(itemsFile)) {
            const data = await fs.readFile(itemsFile, 'utf-8');
            lifeItems = JSON.parse(data);
        }
        res.json({ success: true, items: lifeItems });
    } catch (error) {
        res.json({ success: true, items: [] });
    }
});

// Save all life items  
app.post('/api/items', async (req, res) => {
    try {
        lifeItems = req.body.items || [];
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(
            path.join(DATA_DIR, 'life-items.json'),
            JSON.stringify(lifeItems, null, 2)
        );
        broadcast({ type: 'items-update', items: lifeItems });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save current status
app.post('/api/status', async (req, res) => {
    try {
        currentStatus = req.body;
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(
            path.join(DATA_DIR, 'current-status.json'),
            JSON.stringify(currentStatus, null, 2)
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper: check if file exists
async function exists(filepath) {
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

