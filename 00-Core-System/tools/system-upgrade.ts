#!/usr/bin/env node
/**
 * System Upgrade Tool
 *
 * Monitors external sources and suggests/implements improvements to Cymatic OS
 * Uses local models for analysis, Claude Code for implementation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SYSTEM_ROOT = 'process.env.SYSTEM_ROOT ?? '.'';
const CORE_SYSTEM = path.join(SYSTEM_ROOT, '00-Core-System');
const VAULT = path.join(SYSTEM_ROOT, '01-Knowledge-Vault');
const HISTORY = path.join(VAULT, 'history');

interface UpgradeSource {
  name: string;
  url: string;
  type: 'github' | 'blog' | 'youtube' | 'docs';
  checkCommand?: string;
}

interface Improvement {
  title: string;
  source: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'complex';
  category: string;
  implementation: string;
}

// External sources to monitor
const SOURCES: UpgradeSource[] = [
  {
    name: 'Daniel Miessler PAI',
    url: 'https://github.com/danielmiessler/PAI',
    type: 'github',
    checkCommand: 'gh repo view danielmiessler/PAI --json updatedAt,latestRelease'
  },
  {
    name: 'Anthropic Claude Code',
    url: 'https://github.com/anthropics/claude-code',
    type: 'github',
    checkCommand: 'gh repo view anthropics/claude-code --json updatedAt,latestRelease'
  },
  {
    name: 'Daniel Miessler Blog',
    url: 'https://danielmiessler.com/blog',
    type: 'blog'
  }
];

/**
 * Read system documentation to understand current state
 */
function analyzeCurrentSystem(): string {
  console.log('📖 Analyzing current Cymatic OS configuration...\n');

  const files = [
    'command-reference.md',
    'command-architecture.md',
    'subagent-integration-strategy.md',
    'iaios-charter.md'
  ];

  let systemDocs = '# Current Cymatic OS State\n\n';

  for (const file of files) {
    const filePath = path.join(CORE_SYSTEM, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      systemDocs += `## ${file}\n\n${content.slice(0, 2000)}...\n\n`; // First 2000 chars
    }
  }

  // List current skills
  const skillsPath = path.join(CORE_SYSTEM, 'skills');
  if (fs.existsSync(skillsPath)) {
    const skills = fs.readdirSync(skillsPath).filter(f => {
      return fs.statSync(path.join(skillsPath, f)).isDirectory();
    });
    systemDocs += `## Current Skills\n\n${skills.map(s => `- ${s}`).join('\n')}\n\n`;
  }

  return systemDocs;
}

/**
 * Check external sources for updates
 */
function checkSources(): { source: string; hasUpdates: boolean; info: string }[] {
  console.log('🔍 Checking external sources for improvements...\n');

  const results: { source: string; hasUpdates: boolean; info: string }[] = [];

  for (const source of SOURCES) {
    try {
      if (source.checkCommand && source.type === 'github') {
        const output = execSync(source.checkCommand, { encoding: 'utf-8' });
        const data = JSON.parse(output);

        // Check if updated in last 7 days
        const lastUpdated = new Date(data.updatedAt);
        const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        results.push({
          source: source.name,
          hasUpdates: daysSince < 7,
          info: `Last updated: ${lastUpdated.toLocaleDateString()}`
        });

        console.log(`  ${source.name}: ${daysSince < 7 ? '✅ Recent updates' : '⏸️  No recent changes'}`);
      }
    } catch (error) {
      console.log(`  ${source.name}: ⚠️  Unable to check (${error instanceof Error ? error.message : 'unknown error'})`);
      results.push({
        source: source.name,
        hasUpdates: false,
        info: 'Check failed'
      });
    }
  }

  console.log('');
  return results;
}

/**
 * Generate improvement proposals (to be analyzed by AI)
 */
function generateProposalPrompt(systemDocs: string, sourceUpdates: any[]): string {
  return `# System Upgrade Analysis Request

## Current Cymatic OS State
${systemDocs}

## External Source Updates
${sourceUpdates.map(s => `- **${s.source}**: ${s.info}`).join('\n')}

## Task
Analyze the current Cymatic OS capabilities and propose 3-5 high-value improvements based on:

1. **Daniel Miessler's PAI/Kai System Principles**:
   - Skills-based architecture
   - Code-before-prompts philosophy
   - Self-improvement capabilities
   - History/learning systems
   - CLI-first approach

2. **Missing Capabilities**:
   - Compare current features vs. PAI best practices
   - Identify gaps in automation
   - Find opportunities for better determinism

3. **Quick Wins**:
   - Focus on high-impact, low-effort improvements
   - Prioritize features that compound over time
   - Consider existing infrastructure (Tauri app, local models)

## Output Format
For each improvement, provide:

\`\`\`json
{
  "title": "Improvement name",
  "source": "Where this idea came from",
  "description": "What it does and why it helps",
  "priority": "high|medium|low",
  "effort": "easy|medium|complex",
  "category": "skills|tools|architecture|ux",
  "implementation": "Concrete steps to implement"
}
\`\`\`

Focus on improvements that:
- Work with existing local models (Ollama/LMStudio)
- Enhance the Tauri app experience
- Add real value to daily workflows
- Enable compounding improvements over time
`;
}

/**
 * Save upgrade proposal for review
 */
function saveProposal(prompt: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const proposalPath = path.join(HISTORY, 'upgrade-proposals');

  if (!fs.existsSync(proposalPath)) {
    fs.mkdirSync(proposalPath, { recursive: true });
  }

  const filename = path.join(proposalPath, `proposal-${timestamp}.md`);

  const content = `# System Upgrade Proposal - ${timestamp}

${prompt}

---

## Next Steps

1. Review this proposal
2. Run with AI to generate specific improvements:
   \`\`\`bash
   # Using local model for analysis
   cat "${filename}" | ollama run llama3.1:70b

   # Or using Claude Code
   claude code --prompt "$(cat ${filename})"
   \`\`\`
3. Approve improvements you want
4. Implement approved changes
5. Validate results

## Implementation Checklist
- [ ] Proposal reviewed
- [ ] AI analysis complete
- [ ] Improvements selected
- [ ] Changes implemented
- [ ] Documentation updated
- [ ] Validation complete
`;

  fs.writeFileSync(filename, content);
  console.log(`💾 Proposal saved to: ${filename}\n`);

  return filename;
}

/**
 * Analyze system usage patterns from history
 */
function analyzeUsagePatterns(): string {
  const conversationsPath = path.join(VAULT, '000-Conversations');

  if (!fs.existsSync(conversationsPath)) {
    return 'No usage history available yet.';
  }

  const files = fs.readdirSync(conversationsPath).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    return 'No conversations logged yet.';
  }

  // Count command usage
  const commandCounts: Record<string, number> = {};
  const topics: string[] = [];

  files.slice(-20).forEach(file => { // Last 20 conversations
    try {
      const data = JSON.parse(fs.readFileSync(path.join(conversationsPath, file), 'utf-8'));

      data.messages?.forEach((msg: any) => {
        if (msg.role === 'user') {
          const text = msg.content.toLowerCase();

          // Detect commands
          const commandMatch = text.match(/\/([\w-]+)/g);
          if (commandMatch) {
            commandMatch.forEach(cmd => {
              commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
            });
          }

          // Extract topics (simple keyword extraction)
          if (text.length < 200) {
            topics.push(text.slice(0, 50));
          }
        }
      });
    } catch (e) {
      // Skip invalid files
    }
  });

  let analysis = '## Usage Patterns\n\n';

  if (Object.keys(commandCounts).length > 0) {
    analysis += '### Most Used Commands\n';
    const sorted = Object.entries(commandCounts).sort((a, b) => b[1] - a[1]);
    analysis += sorted.slice(0, 10).map(([cmd, count]) => `- ${cmd}: ${count} times`).join('\n');
    analysis += '\n\n';
  }

  if (topics.length > 0) {
    analysis += '### Common Topics\n';
    analysis += topics.slice(-5).map(t => `- ${t}`).join('\n');
    analysis += '\n';
  }

  return analysis;
}

/**
 * Main upgrade command
 */
function runUpgrade(options: { analyze?: boolean; implement?: boolean; history?: boolean }): void {
  console.log('🚀 Cymatic OS System Upgrade Tool\n');

  if (options.history) {
    // Show previous upgrade history
    const proposalPath = path.join(HISTORY, 'upgrade-proposals');
    if (fs.existsSync(proposalPath)) {
      const files = fs.readdirSync(proposalPath).sort().reverse();
      console.log('📜 Previous Upgrade Proposals:\n');
      files.slice(0, 10).forEach(file => {
        console.log(`   ${file}`);
      });
    } else {
      console.log('No upgrade history yet.\n');
    }
    return;
  }

  // Analyze mode (default)
  const systemDocs = analyzeCurrentSystem();
  const sourceUpdates = checkSources();
  const usagePatterns = analyzeUsagePatterns();

  const fullContext = systemDocs + '\n\n' + usagePatterns;
  const prompt = generateProposalPrompt(fullContext, sourceUpdates);

  const proposalFile = saveProposal(prompt);

  console.log('✨ Analysis complete!\n');
  console.log('🎯 Next steps:\n');
  console.log('   1. Review the proposal:');
  console.log(`      cat "${proposalFile}"\n`);
  console.log('   2. Generate improvements with AI:');
  console.log(`      # Local model`);
  console.log(`      cat "${proposalFile}" | ollama run llama3.1:70b\n`);
  console.log(`      # Or with Claude Code`);
  console.log(`      # Open Claude Code and reference the proposal file\n`);
  console.log('   3. Implement approved changes');
  console.log('   4. Run: npm run dashboard:watch (to see changes live)\n');
}

// CLI interface
const args = process.argv.slice(2);
const options = {
  analyze: args.includes('--analyze'),
  implement: args.includes('--implement'),
  history: args.includes('--history')
};

runUpgrade(options);

export { analyzeCurrentSystem, checkSources, generateProposalPrompt };
