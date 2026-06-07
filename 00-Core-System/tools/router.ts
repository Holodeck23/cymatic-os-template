#!/usr/bin/env node
/**
 * Router - Intelligent command routing using explicit routing table
 *
 * Provides deterministic routing before AI inference for better accuracy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROUTING_TABLE_PATH = path.join(__dirname, '../routing-table.json');

export interface Route {
  patterns: string[];
  skill: string;
  workflow: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export interface Intervention {
  trigger: string;
  description: string;
  action: string;
}

export interface RoutingTable {
  version: string;
  description: string;
  routes: Route[];
  fallback: {
    skill: string;
    workflow: string;
    description: string;
  };
  interventions: Intervention[];
  metadata: {
    created: string;
    last_updated: string;
    total_routes: number;
    total_interventions: number;
  };
}

export interface RoutingResult {
  matched: boolean;
  skill: string;
  workflow: string;
  confidence: number;
  matchedPattern?: string;
  route?: Route;
}

/**
 * Load routing table from file
 */
export function loadRoutingTable(): RoutingTable {
  try {
    const content = fs.readFileSync(ROUTING_TABLE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load routing table:', error);
    throw error;
  }
}

/**
 * Calculate similarity score between two strings
 * Simple word overlap algorithm
 */
function calculateSimilarity(input: string, pattern: string): number {
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
 * Route user input to appropriate skill and workflow
 */
export function routeInput(userInput: string): RoutingResult {
  const table = loadRoutingTable();
  const normalizedInput = userInput.toLowerCase().trim();

  let bestMatch: RoutingResult = {
    matched: false,
    skill: table.fallback.skill,
    workflow: table.fallback.workflow,
    confidence: 0
  };

  // Check each route
  for (const route of table.routes) {
    for (const pattern of route.patterns) {
      const similarity = calculateSimilarity(normalizedInput, pattern);

      // Exact match or high similarity
      if (normalizedInput.includes(pattern) || pattern.split(/\s+/).every(word => normalizedInput.includes(word))) {
        return {
          matched: true,
          skill: route.skill,
          workflow: route.workflow,
          confidence: 1.0,
          matchedPattern: pattern,
          route
        };
      }

      // Partial match
      if (similarity > bestMatch.confidence) {
        bestMatch = {
          matched: similarity > 0.5,
          skill: route.skill,
          workflow: route.workflow,
          confidence: similarity,
          matchedPattern: pattern,
          route
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Detect intervention triggers in user input
 */
export function detectInterventions(userInput: string): Intervention[] {
  const table = loadRoutingTable();
  const detected: Intervention[] = [];

  for (const intervention of table.interventions) {
    if (userInput.includes(intervention.trigger)) {
      detected.push(intervention);
    }
  }

  return detected;
}

/**
 * Get all available skills from routing table
 */
export function getAvailableSkills(): string[] {
  const table = loadRoutingTable();
  const skills = new Set<string>();

  for (const route of table.routes) {
    skills.add(route.skill);
  }

  return Array.from(skills).sort();
}

/**
 * Get all workflows for a specific skill
 */
export function getWorkflowsForSkill(skill: string): string[] {
  const table = loadRoutingTable();
  const workflows: string[] = [];

  for (const route of table.routes) {
    if (route.skill === skill && !workflows.includes(route.workflow)) {
      workflows.push(route.workflow);
    }
  }

  return workflows;
}

/**
 * CLI usage
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  router <input>           - Route user input');
    console.log('  router --skills          - List all skills');
    console.log('  router --workflows <skill> - List workflows for skill');
    console.log('\nExamples:');
    console.log('  router "what should i focus on today"');
    console.log('  router "journal quick check in"');
    console.log('  router --skills');
    process.exit(0);
  }

  if (args[0] === '--skills') {
    const skills = getAvailableSkills();
    console.log('Available Skills:');
    skills.forEach(skill => console.log(`  - ${skill}`));
    process.exit(0);
  }

  if (args[0] === '--workflows' && args[1]) {
    const workflows = getWorkflowsForSkill(args[1]);
    console.log(`Workflows for ${args[1]}:`);
    workflows.forEach(workflow => console.log(`  - ${workflow}`));
    process.exit(0);
  }

  // Route input
  const input = args.join(' ');
  const result = routeInput(input);

  console.log('\n🎯 Routing Result:');
  console.log(`Input: "${input}"`);
  console.log(`Matched: ${result.matched ? '✅' : '❌'}`);
  console.log(`Skill: ${result.skill}`);
  console.log(`Workflow: ${result.workflow}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

  if (result.matchedPattern) {
    console.log(`Pattern: "${result.matchedPattern}"`);
  }

  if (result.route) {
    console.log(`Description: ${result.route.description}`);
  }

  // Check for interventions
  const interventions = detectInterventions(input);
  if (interventions.length > 0) {
    console.log('\n⚡ Interventions Detected:');
    interventions.forEach(int => {
      console.log(`  ${int.trigger} - ${int.description}`);
    });
  }
}

export default {
  routeInput,
  detectInterventions,
  getAvailableSkills,
  getWorkflowsForSkill,
  loadRoutingTable
};
