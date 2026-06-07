// Life Dashboard - Simple & Universal

// State
let items = [];
let currentFilter = 'all';
let ws = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    connectWebSocket();
    updateClock();
    setInterval(updateClock, 1000);
});

// Load items from server or localStorage
async function loadItems() {
    try {
        const response = await fetch('/api/items');
        const data = await response.json();
        if (data.success) {
            items = data.items;
        }
    } catch (error) {
        // Fallback to localStorage
        const stored = localStorage.getItem('lifeItems');
        if (stored) items = JSON.parse(stored);
    }
    renderItems();
}

// Save items
async function saveItems() {
    // Save to localStorage immediately
    localStorage.setItem('lifeItems', JSON.stringify(items));

    // Save to server
    try {
        await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
    } catch (error) {
        console.log('Offline - saved locally');
    }
}

// Capture new item
function captureItem() {
    const input = document.getElementById('captureInput');
    const content = input.value.trim();

    if (!content) return;

    // Auto-detect category
    const category = detectCategory(content);

    const item = {
        id: Date.now().toString(),
        content: content,
        category: category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    items.unshift(item); // Add to beginning
    saveItems();
    renderItems();

    input.value = '';

    // Show notification
    showNotification(`Added to ${category}!`);
}

// Detect category from content
function detectCategory(content) {
    const lower = content.toLowerCase();

    // Recipes
    if (lower.includes('recipe') || lower.includes('cook') ||
        lower.includes('ingredients') || lower.includes('bake')) {
        return 'recipe';
    }

    // Client work
    if (lower.includes('client') || lower.includes('customer') ||
        lower.includes('meeting') || lower.includes('follow-up')) {
        return 'client';
    }

    // Links
    if (lower.includes('http') || lower.includes('www.') ||
        lower.includes('.com')) {
        return 'link';
    }

    // Ideas
    if (lower.startsWith('idea:') || lower.startsWith('what if') ||
        lower.includes('maybe') || lower.includes('could')) {
        return 'idea';
    }

    // Tasks (action verbs)
    if (lower.startsWith('todo') || lower.startsWith('do ') ||
        lower.startsWith('call ') || lower.startsWith('email ') ||
        lower.startsWith('buy ') || lower.startsWith('fix ')) {
        return 'task';
    }

    // Default to note
    return 'note';
}

// Render items
function renderItems() {
    const grid = document.getElementById('itemsGrid');
    const filtered = currentFilter === 'all'
        ? items
        : items.filter(item => item.category === currentFilter);

    // Update count
    document.getElementById('itemCount').textContent = items.length;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>${currentFilter === 'all' ? 'Nothing here yet' : `No ${currentFilter}s yet`}</h3>
                <p>Start capturing above!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="item-card" data-id="${item.id}">
            <div class="item-header">
                <span class="item-category">${getCategoryIcon(item.category)} ${item.category}</span>
                <div class="item-actions">
                    <button onclick="editItem('${item.id}')">Edit</button>
                    <button onclick="deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
            <div class="item-content" id="content-${item.id}">
                ${escapeHtml(item.content)}
            </div>
            <div class="item-meta">
                <span>${formatDate(item.createdAt)}</span>
                ${item.link ? `<a href="${item.link}" target="_blank">🔗 Open</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        task: '✅',
        client: '💼',
        recipe: '🍳',
        idea: '💡',
        note: '📝',
        link: '🔗'
    };
    return icons[category] || '📌';
}

// Edit item
function editItem(id) {
    const content = document.getElementById(`content-${id}`);
    const item = items.find(i => i.id === id);

    if (!item) return;

    content.contentEditable = 'true';
    content.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(content);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Save on blur
    content.onblur = () => {
        const newContent = content.textContent.trim();
        if (newContent && newContent !== item.content) {
            item.content = newContent;
            item.updatedAt = new Date().toISOString();
            saveItems();
            showNotification('Updated!');
        }
        content.contentEditable = 'false';
        renderItems();
    };

    // Save on Enter
    content.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            content.blur();
        }
    };
}

// Delete item
function deleteItem(id) {
    if (!confirm('Delete this item?')) return;

    items = items.filter(item => item.id !== id);
    saveItems();
    renderItems();
    showNotification('Deleted');
}

// Filter by category
function filterCategory(category) {
    currentFilter = category;

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    renderItems();
}

// Search items
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const grid = document.getElementById('itemsGrid');

    if (!query) {
        renderItems();
        return;
    }

    const results = items.filter(item =>
        item.content.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );

    if (results.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No results for "${query}"</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = results.map(item => `
        <div class="item-card" data-id="${item.id}">
            <div class="item-header">
                <span class="item-category">${getCategoryIcon(item.category)} ${item.category}</span>
                <div class="item-actions">
                    <button onclick="editItem('${item.id}')">Edit</button>
                    <button onclick="deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
            <div class="item-content" id="content-${item.id}">
                ${highlightSearch(escapeHtml(item.content), query)}
            </div>
            <div class="item-meta">
                <span>${formatDate(item.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// Highlight search term
function highlightSearch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: #667eea; color: white; padding: 2px 4px; border-radius: 3px;">$1</mark>');
}

// Update status (energy, stress, mood, focus)
function updateStatus() {
    const status = {
        energy: document.getElementById('energyInput').value,
        stress: document.getElementById('stressInput').value,
        mood: document.getElementById('moodInput').value,
        focus: document.getElementById('focusInput').value,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('currentStatus', JSON.stringify(status));

    // Save to server
    fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status)
    }).catch(() => console.log('Status saved locally'));
}

// Load status on init
function loadStatus() {
    const stored = localStorage.getItem('currentStatus');
    if (stored) {
        const status = JSON.parse(stored);
        document.getElementById('energyInput').value = status.energy || 5;
        document.getElementById('stressInput').value = status.stress || 5;
        document.getElementById('moodInput').value = status.mood || '';
        document.getElementById('focusInput').value = status.focus || '';
    }
}

// Handle Enter key in capture
function handleCapture(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        captureItem();
    }
}

// Chat functions
let chatOpen = false;

function toggleChat() {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chatPanel');
    panel.classList.toggle('open');
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        sendToClaude(message);
        input.value = '';
    }
}

async function sendToClaude(message) {
    const messages = document.getElementById('chatMessages');

    // Add user message
    messages.innerHTML += `
        <div style="margin-bottom: 15px; text-align: right;">
            <div style="display: inline-block; background: #667eea; color: white;
                        padding: 10px 15px; border-radius: 15px 15px 0 15px;
                        max-width: 70%;">
                ${escapeHtml(message)}
            </div>
        </div>
    `;

    // Add thinking indicator
    messages.innerHTML += `
        <div id="thinking" style="margin-bottom: 15px;">
            <div style="display: inline-block; background: #2a2a2a; color: #888;
                        padding: 10px 15px; border-radius: 15px 15px 15px 0;">
                Thinking...
            </div>
        </div>
    `;

    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch('/api/claude/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                context: {
                    items: items.length,
                    categories: [...new Set(items.map(i => i.category))],
                    status: JSON.parse(localStorage.getItem('currentStatus') || '{}')
                }
            })
        });

        const data = await response.json();

        // Remove thinking
        document.getElementById('thinking').remove();

        // Add Claude response
        messages.innerHTML += `
            <div style="margin-bottom: 15px;">
                <div style="display: inline-block; background: #2a2a2a; color: #e0e0e0;
                            padding: 10px 15px; border-radius: 15px 15px 15px 0;
                            max-width: 70%;">
                    ${escapeHtml(data.response || 'I can help you manage your life dashboard! What would you like to know?')}
                </div>
            </div>
        `;

    } catch (error) {
        document.getElementById('thinking').remove();
        messages.innerHTML += `
            <div style="margin-bottom: 15px;">
                <div style="display: inline-block; background: #2a2a2a; color: #999;
                            padding: 10px 15px; border-radius: 15px 15px 15px 0;">
                    I'm here to help! (Server connection needed for AI responses)
                </div>
            </div>
        `;
    }

    messages.scrollTop = messages.scrollHeight;
}

// WebSocket connection
function connectWebSocket() {
    try {
        const wsUrl = `ws://${window.location.host}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ Connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'items-update') {
                items = data.items;
                renderItems();
            }
        };

        ws.onerror = () => {
            console.log('Offline mode - using local storage');
        };
    } catch (error) {
        console.log('WebSocket not available - offline mode');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('currentTime').textContent = time;
}

function showNotification(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #667eea;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Load status on start
loadStatus();
