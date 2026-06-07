#!/usr/bin/env node
/**
 * Dashboard Data Synchronization Algorithm
 *
 * Syncs data from Knowledge Vault to dashboard JSON files
 * Triggered after journal entries, project updates, or manual refresh
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Paths configuration
const VAULT_BASE = '~/cymatic-os/01-Knowledge-Vault';
const DASHBOARD_DATA = process.env.DASHBOARD_DATA ?? './00-Core-System/dashboard-app/.dashboard-data';
const CONVERSATIONS = path.join(VAULT_BASE, '000-Conversations');

interface DashboardStatus {
  energy: number;
  stress: number;
  mood: string;
  priority: string;
  blockers: string[];
  lastUpdated: string;
}

interface ProgressItem {
  date: string;
  description: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
}

interface ProjectStatus {
  name: string;
  status: 'active' | 'paused' | 'completed';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  nextAction: string;
}

/**
 * Parse current-state.md for energy, stress, priority
 */
function parseCurrentState(): Partial<DashboardStatus> {
  const filePath = path.join(VAULT_BASE, 'current-state.md');

  if (!fs.existsSync(filePath)) {
    console.warn('current-state.md not found, using defaults');
    return { energy: 5, stress: 5, priority: 'Not set' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  // Parse markdown content for values
  const energyMatch = body.match(/energy[:\s]+(\d+)/i);
  const stressMatch = body.match(/stress[:\s]+(\d+)/i);
  const priorityMatch = body.match(/priority[:\s]*\*\*([^*]+)\*\*/i) ||
                        body.match(/priority[:\s]+(.+?)(?:\n|$)/i);
  const blockersMatch = body.match(/blockers?[:\s]+([\s\S]+?)(?:\n\n|$)/i);

  return {
    energy: energyMatch ? parseInt(energyMatch[1]) : 5,
    stress: stressMatch ? parseInt(stressMatch[1]) : 5,
    priority: priorityMatch ? priorityMatch[1].trim() : 'Not set',
    blockers: blockersMatch
      ? blockersMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
      : []
  };
}

/**
 * Analyze recent journal entries for mood
 */
function detectMood(): string {
  const conversationsPath = CONVERSATIONS;

  if (!fs.existsSync(conversationsPath)) {
    return 'neutral';
  }

  // Get most recent conversation file
  const files = fs.readdirSync(conversationsPath)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return 'neutral';

  const latestFile = path.join(conversationsPath, files[0]);
  const conversation = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

  // Simple sentiment analysis on last user message
  const lastMessage = conversation.messages?.slice().reverse().find((m: any) => m.role === 'user');

  if (!lastMessage) return 'neutral';

  const text = lastMessage.content.toLowerCase();

  // Mood keywords
  const moods = {
    'excited': ['excited', 'amazing', 'awesome', 'great', 'fantastic', 'pumped'],
    'focused': ['focused', 'productive', 'clear', 'determined', 'ready'],
    'stressed': ['stressed', 'overwhelmed', 'anxious', 'worried', 'behind'],
    'tired': ['tired', 'exhausted', 'drained', 'low energy', 'burnt out'],
    'grateful': ['grateful', 'thankful', 'blessed', 'appreciate'],
    'frustrated': ['frustrated', 'stuck', 'annoyed', 'struggling'],
    'content': ['content', 'satisfied', 'peaceful', 'calm', 'good']
  };

  for (const [mood, keywords] of Object.entries(moods)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return mood;
    }
  }

  return 'neutral';
}

/**
 * Parse project-contexts.md for active projects
 */
function parseProjects(): ProjectStatus[] {
  const filePath = path.join(VAULT_BASE, 'project-contexts.md');

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const projects: ProjectStatus[] = [];

  // Parse each project section (## Project Name)
  const projectSections = content.split(/^## /m).slice(1);

  for (const section of projectSections) {
    const lines = section.split('\n');
    const name = lines[0].trim();

    const statusMatch = section.match(/status[:\s]+(active|paused|completed)/i);
    const priorityMatch = section.match(/priority[:\s]+(high|medium|low)/i);
    const progressMatch = section.match(/progress[:\s]+(\d+)%/i);
    const nextActionMatch = section.match(/next action[:\s]+(.+?)(?:\n|$)/i);

    projects.push({
      name,
      status: (statusMatch?.[1] as any) || 'active',
      priority: (priorityMatch?.[1] as any) || 'medium',
      progress: progressMatch ? parseInt(progressMatch[1]) : 0,
      nextAction: nextActionMatch?.[1]?.trim() || 'Not defined'
    });
  }

  return projects.filter(p => p.status === 'active').slice(0, 5); // Top 5 active
}

/**
 * Parse progress-tracker.md for recent wins
 */
function parseRecentProgress(): ProgressItem[] {
  const filePath = path.join(VAULT_BASE, 'progress-tracker.md');

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const items: ProgressItem[] = [];

  // Parse entries (format: - **[Date]** - Description)
  const entries = content.match(/^- \*\*(.+?)\*\* - (.+?)$/gm) || [];

  for (const entry of entries.slice(0, 10)) { // Last 10 items
    const match = entry.match(/^- \*\*(.+?)\*\* - (.+?)$/);
    if (match) {
      items.push({
        date: match[1],
        description: match[2],
        category: 'general', // Could be enhanced with categorization
        impact: 'medium' // Could be enhanced with impact detection
      });
    }
  }

  return items;
}

/**
 * Main update function
 */
function updateDashboard(): void {
  console.log('🔄 Updating dashboard data from Knowledge Vault...');

  try {
    // Ensure dashboard data directory exists
    if (!fs.existsSync(DASHBOARD_DATA)) {
      fs.mkdirSync(DASHBOARD_DATA, { recursive: true });
    }

    // 1. Update current status
    const currentState = parseCurrentState();
    const mood = detectMood();

    const status: DashboardStatus = {
      energy: currentState.energy || 5,
      stress: currentState.stress || 5,
      mood,
      priority: currentState.priority || 'Not set',
      blockers: currentState.blockers || [],
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(DASHBOARD_DATA, 'current-status.json'),
      JSON.stringify(status, null, 2)
    );
    console.log('✅ Updated current-status.json');

    // 2. Update projects
    const projects = parseProjects();
    fs.writeFileSync(
      path.join(DASHBOARD_DATA, 'active-projects.json'),
      JSON.stringify(projects, null, 2)
    );
    console.log('✅ Updated active-projects.json');

    // 3. Update recent progress
    const progress = parseRecentProgress();
    fs.writeFileSync(
      path.join(DASHBOARD_DATA, 'recent-progress.json'),
      JSON.stringify(progress, null, 2)
    );
    console.log('✅ Updated recent-progress.json');

    // 4. Create summary for Tauri app
    const summary = {
      status,
      projects,
      progress: progress.slice(0, 3), // Top 3 recent items
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(DASHBOARD_DATA, 'dashboard-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    console.log('✅ Updated dashboard-summary.json');

    console.log('\n✨ Dashboard data sync complete!');
    console.log(`   Energy: ${status.energy}/10`);
    console.log(`   Stress: ${status.stress}/10`);
    console.log(`   Mood: ${status.mood}`);
    console.log(`   Priority: ${status.priority}`);
    console.log(`   Active Projects: ${projects.length}`);

  } catch (error) {
    console.error('❌ Error updating dashboard:', error);
    process.exit(1);
  }
}

/**
 * Watch mode - continuously monitor for changes
 */
function watchMode(): void {
  console.log('👀 Watching Knowledge Vault for changes...\n');

  const filesToWatch = [
    path.join(VAULT_BASE, 'current-state.md'),
    path.join(VAULT_BASE, 'project-contexts.md'),
    path.join(VAULT_BASE, 'progress-tracker.md'),
    CONVERSATIONS
  ];

  // Initial update
  updateDashboard();

  // Watch for changes
  filesToWatch.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.watch(filePath, { recursive: true }, (eventType, filename) => {
        console.log(`\n📝 Change detected: ${filename || filePath}`);
        setTimeout(updateDashboard, 500); // Debounce
      });
    }
  });

  console.log('\n✨ Watch mode active. Press Ctrl+C to stop.\n');
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--watch')) {
  watchMode();
} else {
  updateDashboard();
}

export { updateDashboard, parseCurrentState, parseProjects, detectMood };
