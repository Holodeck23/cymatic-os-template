#!/usr/bin/env node
/**
 * History Auto-Categorization System
 *
 * Automatically processes chat sessions and extracts:
 * - Learnings: New insights, patterns, realizations
 * - Decisions: Choices made, directions taken
 * - Sessions: Raw conversation logs
 *
 * Based on Daniel Miessler's PAI pattern for persistent memory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_PATH = path.join(__dirname, '../../01-Knowledge-Vault');
const HISTORY_PATH = path.join(VAULT_PATH, 'history');
const SESSIONS_PATH = path.join(HISTORY_PATH, 'sessions');
const LEARNINGS_PATH = path.join(HISTORY_PATH, 'learnings');
const DECISIONS_PATH = path.join(HISTORY_PATH, 'decisions');

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  timestamp: string;
  messages: ChatMessage[];
  metadata?: {
    model?: string;
    skill?: string;
    workflow?: string;
    duration?: number;
  };
}

export interface Learning {
  id: string;
  timestamp: string;
  content: string;
  source: string; // session ID
  category: 'technical' | 'behavioral' | 'strategic' | 'personal';
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface Decision {
  id: string;
  timestamp: string;
  decision: string;
  context: string;
  rationale: string;
  alternatives?: string[];
  outcome?: string;
  source: string; // session ID
  tags: string[];
}

export interface CategorizationResult {
  session_id: string;
  learnings: Learning[];
  decisions: Decision[];
  summary: string;
  key_topics: string[];
}

/**
 * Ensure directory structure exists
 */
function ensureDirectories(): void {
  [HISTORY_PATH, SESSIONS_PATH, LEARNINGS_PATH, DECISIONS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Generate unique ID based on timestamp
 */
function generateId(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}`;
}

/**
 * Save chat session
 */
export function saveSession(session: ChatSession): string {
  ensureDirectories();

  const sessionId = session.id || generateId('session');
  const sessionPath = path.join(SESSIONS_PATH, `${sessionId}.json`);

  const sessionData = {
    ...session,
    id: sessionId,
    saved_at: new Date().toISOString()
  };

  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
  console.log(`✅ Session saved: ${sessionId}`);

  return sessionId;
}

/**
 * Extract learnings from session (simple heuristic-based)
 *
 * In production, you'd use AI to analyze the conversation.
 * For now, we use keyword detection for speed.
 */
export function extractLearnings(session: ChatSession): Learning[] {
  const learnings: Learning[] = [];

  // Keywords that indicate learnings
  const learningIndicators = [
    'i learned',
    'realized',
    'discovered',
    'insight',
    'pattern',
    'understanding',
    'noticed',
    'found that',
    'turns out'
  ];

  const technicalKeywords = ['code', 'api', 'database', 'architecture', 'implementation'];
  const behavioralKeywords = ['habit', 'behavior', 'tendency', 'pattern', 'usually'];
  const strategicKeywords = ['strategy', 'approach', 'direction', 'plan', 'goal'];
  const personalKeywords = ['feeling', 'energy', 'value', 'authentic', 'identity'];

  session.messages.forEach((msg, index) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      const lowerContent = msg.content.toLowerCase();

      // Check if message contains learning indicators
      const hasLearning = learningIndicators.some(indicator =>
        lowerContent.includes(indicator)
      );

      if (hasLearning) {
        // Determine category
        let category: Learning['category'] = 'personal';
        if (technicalKeywords.some(kw => lowerContent.includes(kw))) category = 'technical';
        else if (behavioralKeywords.some(kw => lowerContent.includes(kw))) category = 'behavioral';
        else if (strategicKeywords.some(kw => lowerContent.includes(kw))) category = 'strategic';

        // Extract tags (simple word extraction)
        const tags = msg.content
          .toLowerCase()
          .match(/\b[a-z]{4,}\b/g)
          ?.filter(word => !['that', 'this', 'with', 'from', 'have'].includes(word))
          .slice(0, 5) || [];

        learnings.push({
          id: generateId('learning'),
          timestamp: session.timestamp,
          content: msg.content.substring(0, 500), // First 500 chars
          source: session.id,
          category,
          tags,
          confidence: 'medium'
        });
      }
    }
  });

  return learnings;
}

/**
 * Extract decisions from session
 */
export function extractDecisions(session: ChatSession): Decision[] {
  const decisions: Decision[] = [];

  // Keywords that indicate decisions
  const decisionIndicators = [
    'decided',
    'going to',
    "i'll",
    'will use',
    'choosing',
    'decided on',
    'going with',
    'final decision',
    'settled on'
  ];

  session.messages.forEach((msg, index) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      const lowerContent = msg.content.toLowerCase();

      const hasDecision = decisionIndicators.some(indicator =>
        lowerContent.includes(indicator)
      );

      if (hasDecision) {
        // Try to extract context from previous message
        const context = index > 0
          ? session.messages[index - 1].content.substring(0, 200)
          : 'Context not available';

        // Extract tags
        const tags = msg.content
          .toLowerCase()
          .match(/\b[a-z]{4,}\b/g)
          ?.filter(word => !['that', 'this', 'with', 'from', 'have', 'will'].includes(word))
          .slice(0, 5) || [];

        decisions.push({
          id: generateId('decision'),
          timestamp: session.timestamp,
          decision: msg.content.substring(0, 300),
          context,
          rationale: 'Extracted from conversation',
          source: session.id,
          tags
        });
      }
    }
  });

  return decisions;
}

/**
 * Categorize a session (main function)
 */
export function categorizeSession(session: ChatSession): CategorizationResult {
  ensureDirectories();

  // Save session first
  const sessionId = saveSession(session);

  // Extract learnings and decisions
  const learnings = extractLearnings(session);
  const decisions = extractDecisions(session);

  // Save learnings
  learnings.forEach(learning => {
    const learningPath = path.join(LEARNINGS_PATH, `${learning.id}.json`);
    fs.writeFileSync(learningPath, JSON.stringify(learning, null, 2));
  });

  // Save decisions
  decisions.forEach(decision => {
    const decisionPath = path.join(DECISIONS_PATH, `${decision.id}.json`);
    fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2));
  });

  // Generate summary
  const summary = `Session ${sessionId}: ${learnings.length} learnings, ${decisions.length} decisions extracted`;

  // Extract key topics (most common tags)
  const allTags = [...learnings.flatMap(l => l.tags), ...decisions.flatMap(d => d.tags)];
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const key_topics = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  console.log(`\n✅ Categorization complete:`);
  console.log(`   Learnings: ${learnings.length}`);
  console.log(`   Decisions: ${decisions.length}`);
  console.log(`   Topics: ${key_topics.join(', ')}`);

  return {
    session_id: sessionId,
    learnings,
    decisions,
    summary,
    key_topics
  };
}

/**
 * Load all learnings
 */
export function loadAllLearnings(): Learning[] {
  ensureDirectories();

  const files = fs.readdirSync(LEARNINGS_PATH).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(LEARNINGS_PATH, file), 'utf-8');
    return JSON.parse(content) as Learning;
  });
}

/**
 * Load all decisions
 */
export function loadAllDecisions(): Decision[] {
  ensureDirectories();

  const files = fs.readdirSync(DECISIONS_PATH).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(DECISIONS_PATH, file), 'utf-8');
    return JSON.parse(content) as Decision;
  });
}

/**
 * Search learnings by category or tag
 */
export function searchLearnings(query: {
  category?: Learning['category'];
  tag?: string;
  after?: string;
}): Learning[] {
  const allLearnings = loadAllLearnings();

  return allLearnings.filter(learning => {
    if (query.category && learning.category !== query.category) return false;
    if (query.tag && !learning.tags.includes(query.tag)) return false;
    if (query.after && learning.timestamp < query.after) return false;
    return true;
  });
}

/**
 * Generate markdown report of recent activity
 */
export function generateHistoryReport(days = 7): string {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  const recentLearnings = searchLearnings({ after: cutoffISO });
  const recentDecisions = loadAllDecisions().filter(d => d.timestamp >= cutoffISO);

  let report = `# Activity Report (Last ${days} Days)\n\n`;
  report += `**Generated**: ${new Date().toISOString()}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Learnings**: ${recentLearnings.length}\n`;
  report += `- **Decisions**: ${recentDecisions.length}\n\n`;

  report += `## Recent Learnings\n\n`;
  recentLearnings.forEach(learning => {
    report += `### ${learning.category.toUpperCase()} - ${learning.timestamp.split('T')[0]}\n`;
    report += `${learning.content}\n\n`;
    report += `*Tags*: ${learning.tags.join(', ')}\n\n`;
  });

  report += `## Recent Decisions\n\n`;
  recentDecisions.forEach(decision => {
    report += `### ${decision.timestamp.split('T')[0]}\n`;
    report += `**Decision**: ${decision.decision}\n\n`;
    report += `**Context**: ${decision.context}\n\n`;
    report += `*Tags*: ${decision.tags.join(', ')}\n\n`;
  });

  return report;
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log('History Categorizer - Usage:');
    console.log('  history-categorizer --test           - Run test categorization');
    console.log('  history-categorizer --report [days]  - Generate activity report');
    console.log('  history-categorizer --learnings [category]  - List learnings');
    console.log('  history-categorizer --decisions      - List decisions');
    process.exit(0);
  }

  if (args[0] === '--test') {
    const testSession: ChatSession = {
      id: 'test-session',
      timestamp: new Date().toISOString(),
      messages: [
        { role: 'user', content: 'I realized that I need to focus on revenue-generating activities first' },
        { role: 'assistant', content: 'That\'s a great insight. What specific activities will you prioritize?' },
        { role: 'user', content: 'I decided to focus on the client portal instead of the template product' },
        { role: 'assistant', content: 'Good decision. That aligns with your revenue goals.' }
      ]
    };

    categorizeSession(testSession);
    process.exit(0);
  }

  if (args[0] === '--report') {
    const days = parseInt(args[1]) || 7;
    const report = generateHistoryReport(days);
    console.log(report);

    const reportPath = path.join(HISTORY_PATH, `report-${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved: ${reportPath}`);
    process.exit(0);
  }

  if (args[0] === '--learnings') {
    const category = args[1] as Learning['category'] | undefined;
    const learnings = category
      ? searchLearnings({ category })
      : loadAllLearnings();

    console.log(`\n📚 Learnings ${category ? `(${category})` : '(all)'}: ${learnings.length}\n`);
    learnings.forEach(l => {
      console.log(`[${l.category}] ${l.timestamp.split('T')[0]}`);
      console.log(`  ${l.content.substring(0, 100)}...`);
      console.log(`  Tags: ${l.tags.join(', ')}\n`);
    });
    process.exit(0);
  }

  if (args[0] === '--decisions') {
    const decisions = loadAllDecisions();
    console.log(`\n⚖️ Decisions: ${decisions.length}\n`);
    decisions.forEach(d => {
      console.log(`${d.timestamp.split('T')[0]}`);
      console.log(`  ${d.decision.substring(0, 100)}...`);
      console.log(`  Tags: ${d.tags.join(', ')}\n`);
    });
    process.exit(0);
  }
}

export default {
  saveSession,
  categorizeSession,
  extractLearnings,
  extractDecisions,
  loadAllLearnings,
  loadAllDecisions,
  searchLearnings,
  generateHistoryReport
};
