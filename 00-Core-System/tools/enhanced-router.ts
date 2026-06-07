#!/usr/bin/env node
/**
 * Enhanced Router v2.0 - Semantic matching with priority levels
 *
 * Improvements over v1.0:
 * - Semantic keyword matching (not just exact patterns)
 * - Priority-based routing (high-priority routes get boost)
 * - Configurable confidence thresholds
 * - Better scoring algorithm
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROUTING_TABLE_PATH = path.join(__dirname, '../routing-table.json');

export interface RouteV2 {
  patterns: string[];
  semantic_keywords?: string[];
  skill: string;
  workflow: string;
  priority: 'high' | 'medium' | 'low';
  priority_score?: number;
  description: string;
  example_inputs?: string[];
}

export interface RoutingTableV2 {
  version: string;
  description: string;
  routing_config?: {
    min_confidence_threshold: number;
    priority_boost: Record<string, number>;
    exact_match_confidence: number;
    semantic_match_weight: number;
    keyword_match_weight: number;
  };
  routes: RouteV2[];
  fallback: {
    skill: string;
    workflow: string;
    description: string;
  };
  interventions: Array<{
    trigger: string;
    description: string;
    action: string;
  }>;
  metadata: {
    created: string;
    last_updated: string;
    total_routes: number;
    total_interventions: number;
  };
}

export interface RoutingResultV2 {
  matched: boolean;
  skill: string;
  workflow: string;
  confidence: number;
  score: number;
  matchedPattern?: string;
  matchType?: 'exact' | 'pattern' | 'semantic' | 'keyword' | 'fallback';
  route?: RouteV2;
  debugInfo?: {
    patternScore: number;
    semanticScore: number;
    priorityBoost: number;
    finalScore: number;
  };
}

const DEFAULT_CONFIG = {
  min_confidence_threshold: 0.5,
  priority_boost: { high: 0.2, medium: 0.1, low: 0.0 },
  exact_match_confidence: 1.0,
  semantic_match_weight: 0.7,
  keyword_match_weight: 0.3
};

/**
 * Load routing table
 */
export function loadRoutingTableV2(): RoutingTableV2 {
  try {
    const content = fs.readFileSync(ROUTING_TABLE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load routing table:', error);
    throw error;
  }
}

/**
 * Calculate pattern similarity (original algorithm)
 */
function calculatePatternSimilarity(input: string, pattern: string): number {
  const inputWords = input.toLowerCase().split(/\s+/);
  const patternWords = pattern.toLowerCase().split(/\s+/);

  let matchCount = 0;
  for (const patternWord of patternWords) {
    if (inputWords.some(iw => iw.includes(patternWord) || patternWord.includes(iw))) {
      matchCount++;
    }
  }

  return matchCount / patternWords.length;
}

/**
 * Calculate semantic keyword match score
 */
function calculateSemanticScore(input: string, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return 0;

  const inputWords = input.toLowerCase().split(/\s+/);
  let matchCount = 0;

  for (const keyword of keywords) {
    if (inputWords.some(word => word.includes(keyword) || keyword.includes(word))) {
      matchCount++;
    }
  }

  return matchCount / keywords.length;
}

/**
 * Check for exact match
 */
function hasExactMatch(input: string, pattern: string): boolean {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedPattern = pattern.toLowerCase().trim();

  // Full substring match
  if (normalizedInput.includes(normalizedPattern)) return true;

  // All pattern words present
  const patternWords = normalizedPattern.split(/\s+/);
  return patternWords.every(word => normalizedInput.includes(word));
}

/**
 * Enhanced routing with semantic matching and priorities
 */
export function routeInputV2(userInput: string, debug = false): RoutingResultV2 {
  const table = loadRoutingTableV2();
  const config = table.routing_config || DEFAULT_CONFIG;
  const normalizedInput = userInput.toLowerCase().trim();

  let bestMatch: RoutingResultV2 = {
    matched: false,
    skill: table.fallback.skill,
    workflow: table.fallback.workflow,
    confidence: 0,
    score: 0,
    matchType: 'fallback'
  };

  // Sort routes by priority_score (if available) or priority level
  const sortedRoutes = [...table.routes].sort((a, b) => {
    const scoreA = a.priority_score || (a.priority === 'high' ? 10 : a.priority === 'medium' ? 5 : 1);
    const scoreB = b.priority_score || (b.priority === 'high' ? 10 : b.priority === 'medium' ? 5 : 1);
    return scoreB - scoreA;
  });

  for (const route of sortedRoutes) {
    // Check for exact match first
    for (const pattern of route.patterns) {
      if (hasExactMatch(normalizedInput, pattern)) {
        return {
          matched: true,
          skill: route.skill,
          workflow: route.workflow,
          confidence: config.exact_match_confidence,
          score: config.exact_match_confidence,
          matchedPattern: pattern,
          matchType: 'exact',
          route
        };
      }
    }

    // Calculate pattern similarity score
    let maxPatternScore = 0;
    let matchedPattern = '';

    for (const pattern of route.patterns) {
      const similarity = calculatePatternSimilarity(normalizedInput, pattern);
      if (similarity > maxPatternScore) {
        maxPatternScore = similarity;
        matchedPattern = pattern;
      }
    }

    // Calculate semantic keyword score
    const semanticScore = route.semantic_keywords
      ? calculateSemanticScore(normalizedInput, route.semantic_keywords)
      : 0;

    // Combine scores with weights
    const weightedPatternScore = maxPatternScore * config.semantic_match_weight;
    const weightedSemanticScore = semanticScore * config.keyword_match_weight;
    const combinedScore = weightedPatternScore + weightedSemanticScore;

    // Apply priority boost
    const priorityBoost = config.priority_boost[route.priority] || 0;
    const finalScore = Math.min(combinedScore + priorityBoost, 1.0);

    // Track best match
    if (finalScore > bestMatch.score) {
      const matchType = semanticScore > maxPatternScore ? 'semantic' : maxPatternScore > 0 ? 'pattern' : 'keyword';

      bestMatch = {
        matched: finalScore >= config.min_confidence_threshold,
        skill: route.skill,
        workflow: route.workflow,
        confidence: finalScore,
        score: finalScore,
        matchedPattern,
        matchType,
        route,
        debugInfo: debug ? {
          patternScore: maxPatternScore,
          semanticScore,
          priorityBoost,
          finalScore
        } : undefined
      };
    }
  }

  return bestMatch;
}

/**
 * Detect interventions
 */
export function detectInterventionsV2(userInput: string) {
  const table = loadRoutingTableV2();
  return table.interventions.filter(int => userInput.includes(int.trigger));
}

/**
 * Get available skills
 */
export function getAvailableSkillsV2(): string[] {
  const table = loadRoutingTableV2();
  const skills = new Set<string>();
  table.routes.forEach(route => skills.add(route.skill));
  return Array.from(skills).sort();
}

/**
 * Get workflows for skill
 */
export function getWorkflowsForSkillV2(skill: string): string[] {
  const table = loadRoutingTableV2();
  const workflows: string[] = [];
  table.routes.forEach(route => {
    if (route.skill === skill && !workflows.includes(route.workflow)) {
      workflows.push(route.workflow);
    }
  });
  return workflows;
}

/**
 * Test routing with multiple inputs
 */
export function testRouting(inputs: string[]): void {
  console.log('\n🧪 Routing Test Results\n');

  inputs.forEach(input => {
    const result = routeInputV2(input, true);
    console.log(`Input: "${input}"`);
    console.log(`  → ${result.matched ? '✅' : '❌'} ${result.skill}/${result.workflow}`);
    console.log(`  → Confidence: ${(result.confidence * 100).toFixed(0)}% (${result.matchType})`);
    if (result.debugInfo) {
      console.log(`  → Debug: pattern=${result.debugInfo.patternScore.toFixed(2)}, semantic=${result.debugInfo.semanticScore.toFixed(2)}, boost=${result.debugInfo.priorityBoost.toFixed(2)}`);
    }
    console.log('');
  });
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Enhanced Router v2.0 - Usage:');
    console.log('  enhanced-router <input>           - Route user input');
    console.log('  enhanced-router --test            - Run test suite');
    console.log('  enhanced-router --skills          - List all skills');
    console.log('  enhanced-router --workflows <skill> - List workflows for skill');
    console.log('  enhanced-router --debug <input>   - Route with debug info');
    process.exit(0);
  }

  if (args[0] === '--test') {
    testRouting([
      'how am i feeling today',
      'what should i focus on',
      'feeling stuck on this project',
      'need to make a decision',
      'revenue analysis please',
      'totally random input that matches nothing'
    ]);
    process.exit(0);
  }

  if (args[0] === '--skills') {
    const skills = getAvailableSkillsV2();
    console.log('Available Skills:');
    skills.forEach(skill => console.log(`  - ${skill}`));
    process.exit(0);
  }

  if (args[0] === '--workflows' && args[1]) {
    const workflows = getWorkflowsForSkillV2(args[1]);
    console.log(`Workflows for ${args[1]}:);
    workflows.forEach(workflow => console.log(`  - ${workflow}`));
    process.exit(0);
  }

  const debug = args[0] === '--debug';
  const input = debug ? args.slice(1).join(' ') : args.join(' ');
  const result = routeInputV2(input, debug);

  console.log('\n🎯 Enhanced Routing Result:');
  console.log(`Input: "${input}"`);
  console.log(`Matched: ${result.matched ? '✅' : '❌'}`);
  console.log(`Skill: ${result.skill}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`Match Type: ${result.matchType}`);

  if (result.matchedPattern) {
    console.log(`Pattern: "${result.matchedPattern}"`);
  }

  if (result.debugInfo) {
    console.log('\nDebug Info:');
    console.log(`  Pattern Score: ${result.debugInfo.patternScore.toFixed(2)}`);
    console.log(`  Semantic Score: ${result.debugInfo.semanticScore.toFixed(2)}`);
    console.log(`  Priority Boost: ${result.debugInfo.priorityBoost.toFixed(2)}`);
    console.log(`  Final Score: ${result.debugInfo.finalScore.toFixed(2)}`);
  }

  const interventions = detectInterventionsV2(input);
  if (interventions.length > 0) {
    console.log('\n⚡ Interventions:');
    interventions.forEach(int => console.log(`  ${int.trigger} - ${int.description}`));
  }
}

export default {
  routeInputV2,
  detectInterventionsV2,
  getAvailableSkillsV2,
  getWorkflowsForSkillV2,
  loadRoutingTableV2,
  testRouting
};
