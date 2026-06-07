// Cymatic OS Dashboard - Data Loader
// This script reads and parses your markdown files to populate the dashboard

const fs = require('fs').promises;
const path = require('path');

class DashboardDataLoader {
    constructor(basePath) {
        this.basePath = basePath;
        this.knowledgeVaultPath = path.join(basePath, '01-Knowledge-Vault');
    }

    // Parse Current State
    async parseCurrentState() {
        try {
            const filePath = path.join(this.knowledgeVaultPath, 'current-state.md');
            const content = await fs.readFile(filePath, 'utf-8');

            return {
                energy: this.extractValue(content, /Energy.*?(\d+)\/10/i),
                stress: this.extractValue(content, /Stress.*?(\d+)\/10/i),
                emotionalStatus: this.extractValue(content, /Emotional Status.*?:\s*(.+)/i),
                peakHours: this.extractValue(content, /Peak Energy Time.*?:\s*(.+)/i),
                todayPriority: this.extractValue(content, /\*\*Priority\*\*:\s*(.+)/),
                todayDeadline: this.extractValue(content, /\*\*Deadline\*\*:\s*(.+)/),
                todayWhy: this.extractValue(content, /\*\*Why Important\*\*:\s*(.+)/)
            };
        } catch (error) {
            console.error('Error parsing current-state.md:', error);
            return this.getDefaultCurrentState();
        }
    }

    // Parse Projects
    async parseProjects() {
        try {
            const filePath = path.join(this.knowledgeVaultPath, 'current-state.md');
            const content = await fs.readFile(filePath, 'utf-8');

            const projects = [];
            const projectRegex = /###\s+(\d+)\.\s+(.+?)\n([\s\S]+?)(?=###|##\s+Biggest Blockers|$)/g;
            let match;

            while ((match = projectRegex.exec(content)) !== null) {
                const projectContent = match[3];

                projects.push({
                    name: match[2].trim(),
                    status: this.extractValue(projectContent, /Status.*?:\s*(.+)/i),
                    deadline: this.extractValue(projectContent, /Deadline.*?:\s*(.+)/i),
                    nextAction: this.extractValue(projectContent, /Next Action.*?:\s*(.+)/i),
                    revenueImpact: this.extractValue(projectContent, /Revenue Impact.*?:\s*(\w+)/i).toLowerCase()
                });
            }

            return projects.slice(0, 3); // Top 3 projects
        } catch (error) {
            console.error('Error parsing projects:', error);
            return this.getDefaultProjects();
        }
    }

    // Parse Progress Tracker
    async parseProgress() {
        try {
            const filePath = path.join(this.knowledgeVaultPath, 'progress-tracker.md');
            const content = await fs.readFile(filePath, 'utf-8');

            // Extract this week's outcomes
            const weekOutcomes = this.extractList(content, /##\s+This Week's Top 3([\s\S]+?)(?=##|$)/i);

            // Extract recent actions
            const recentActions = this.extractList(content, /##\s+Recent Actions([\s\S]+?)(?=##|$)/i);

            // Extract key wins
            const keyWins = this.extractList(content, /##\s+Key Wins([\s\S]+?)(?=##|$)/i);

            return {
                weekOutcomes: weekOutcomes.slice(0, 3),
                recentActions: recentActions.slice(0, 5),
                keyWins: keyWins.slice(0, 3)
            };
        } catch (error) {
            console.error('Error parsing progress-tracker.md:', error);
            return this.getDefaultProgress();
        }
    }

    // Parse Behavioral Patterns
    async parsePatterns() {
        try {
            const currentStatePath = path.join(this.knowledgeVaultPath, 'current-state.md');
            const content = await fs.readFile(currentStatePath, 'utf-8');

            // Extract blockers
            const blockers = this.extractList(content, /##\s+Biggest Blockers([\s\S]+?)(?=##|$)/i);

            // Generate insights based on energy and stress
            const state = await this.parseCurrentState();
            const insights = this.generateInsights(state);

            // Generate quick actions based on current priorities
            const quickActions = this.generateQuickActions(content);

            return {
                blockers: blockers.slice(0, 3),
                insights,
                quickActions
            };
        } catch (error) {
            console.error('Error parsing patterns:', error);
            return this.getDefaultPatterns();
        }
    }

    // Helper: Extract value using regex
    extractValue(content, regex) {
        const match = content.match(regex);
        return match ? match[1].trim() : '--';
    }

    // Helper: Extract list items
    extractList(content, sectionRegex) {
        const match = content.match(sectionRegex);
        if (!match) return [];

        const section = match[1];
        const items = [];

        // Match numbered lists
        const numberedRegex = /^\d+\.\s+(.+?)(?:\n|$)/gm;
        let itemMatch;
        while ((itemMatch = numberedRegex.exec(section)) !== null) {
            items.push(itemMatch[1].trim());
        }

        // Match bullet points if no numbered items found
        if (items.length === 0) {
            const bulletRegex = /^[-*]\s+(.+?)(?:\n|$)/gm;
            while ((itemMatch = bulletRegex.exec(section)) !== null) {
                items.push(itemMatch[1].trim());
            }
        }

        // Match checkboxes
        if (items.length === 0) {
            const checkboxRegex = /^-\s+\[[ x]\]\s+(.+?)(?:\n|$)/gm;
            while ((itemMatch = checkboxRegex.exec(section)) !== null) {
                items.push(itemMatch[1].trim());
            }
        }

        return items;
    }

    // Generate insights based on current state
    generateInsights(state) {
        const insights = [];

        if (state.energy <= 3) {
            insights.push(`Low energy (${state.energy}/10) - Consider breaking tasks into 15-20 min chunks`);
        }

        if (state.stress >= 7) {
            insights.push(`High stress (${state.stress}/10) - May benefit from delegation or support`);
        }

        if (state.peakHours.includes('Unclear')) {
            insights.push('Peak hours unclear - Prioritize sleep and energy recovery');
        }

        if (insights.length === 0) {
            insights.push('Energy and stress levels within manageable range');
        }

        return insights;
    }

    // Generate quick actions from today's priority and week's outcomes
    generateQuickActions(content) {
        const actions = [];

        // Extract from this week's outcomes
        const weekMatch = content.match(/##\s+This Week's Top 3([\s\S]+?)(?=##|$)/i);
        if (weekMatch) {
            const items = this.extractList(content, /##\s+This Week's Top 3([\s\S]+?)(?=##|$)/i);
            actions.push(...items.slice(0, 3));
        }

        return actions.length > 0 ? actions : ['Review today\'s priority', 'Update current state', 'Check project next actions'];
    }

    // Default fallbacks
    getDefaultCurrentState() {
        return {
            energy: 5,
            stress: 5,
            emotionalStatus: 'Stable',
            peakHours: 'Morning',
            todayPriority: 'Update your current-state.md',
            todayDeadline: 'Today',
            todayWhy: 'Keep your dashboard current'
        };
    }

    getDefaultProjects() {
        return [
            {
                name: 'Update Knowledge Vault',
                status: 'Pending',
                deadline: 'Today',
                nextAction: 'Fill in your active projects',
                revenueImpact: 'low'
            }
        ];
    }

    getDefaultProgress() {
        return {
            weekOutcomes: ['Set up dashboard', 'Update knowledge vault', 'Define weekly outcomes'],
            recentActions: ['Initialized Cymatic OS Dashboard'],
            keyWins: ['Dashboard is live!']
        };
    }

    getDefaultPatterns() {
        return {
            blockers: ['Knowledge vault needs updating'],
            insights: ['Dashboard ready - now populate your data!'],
            quickActions: ['Update current-state.md', 'Add active projects', 'Set this week\'s outcomes']
        };
    }

    // Main load function
    async loadAllData() {
        const [currentState, projects, progress, patterns] = await Promise.all([
            this.parseCurrentState(),
            this.parseProjects(),
            this.parseProgress(),
            this.parsePatterns()
        ]);

        return {
            currentState,
            projects,
            progress,
            patterns,
            timestamp: new Date().toISOString()
        };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardDataLoader;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.DashboardDataLoader = DashboardDataLoader;
}
