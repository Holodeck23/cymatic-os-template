# System Upgrade Skill

**Purpose**: Enable Cymatic OS to analyze, learn from, and upgrade itself automatically.

## Core Capabilities

1. **Monitor Sources** - Track improvements from external sources
2. **Analyze Performance** - Review system effectiveness
3. **Generate Upgrades** - Create improvement proposals
4. **Implement Changes** - Execute approved upgrades
5. **Validate Results** - Measure improvement outcomes

## When to Use

- User runs `/update-os` or `/upgrade-system`
- Weekly automated system health check
- After discovering new AI capabilities or techniques
- When user reports friction or inefficiency

## Workflows

### 1. Monitor Sources
**File**: `workflows/monitor-sources.md`
- Check Daniel Miessler's PAI GitHub for updates
- Review Anthropic Claude Code release notes
- Scan AI research papers and YouTube channels
- Monitor personal usage patterns for pain points

### 2. Analyze Current System
**File**: `workflows/analyze-system.md`
- Read system documentation (`00-Core-System/`)
- Review Knowledge Vault structure and usage
- Analyze command effectiveness from history
- Identify bottlenecks and friction points

### 3. Generate Upgrade Proposals
**File**: `workflows/generate-proposals.md`
- Compare current capabilities with discovered improvements
- Prioritize by impact and implementation effort
- Create detailed upgrade specifications
- Estimate resource requirements

### 4. Implement Upgrades
**File**: `workflows/implement-upgrades.md`
- Create backup of current system state
- Execute approved changes to skills/workflows
- Update documentation and command references
- Test new capabilities

### 5. Validate Improvements
**File**: `workflows/validate-improvements.md`
- Measure performance before/after
- Capture user feedback on changes
- Document lessons learned
- Update history system with outcomes

## Tools Directory

Contains deterministic scripts for:
- `fetch-pai-updates.ts` - Pull latest from PAI repo
- `analyze-usage.ts` - Parse history for patterns
- `backup-system.ts` - Create system snapshot
- `apply-upgrade.ts` - Execute approved changes

## Output Format

```markdown
## System Upgrade Report - [Date]

### Discovered Improvements
1. [Improvement name] - [Source] - [Priority: High/Medium/Low]
   - Description: [What it does]
   - Impact: [How it helps]
   - Effort: [Easy/Medium/Complex]

### Recommended Actions
1. [Action] - [Rationale]

### Implementation Status
- [ ] Proposal reviewed
- [ ] User approval received
- [ ] Changes implemented
- [ ] Validation complete
```

## Integration Points

- **History System**: Logs all upgrades and outcomes
- **Knowledge Vault**: Updates `system-evolution.md`
- **Command System**: Can modify command definitions
- **Skills**: Can create/modify other skills

## Usage Examples

```bash
# Manual upgrade check
/update-os --analyze

# Auto-implement low-risk improvements
/update-os --implement --auto-approve=low-risk

# Check specific source
/update-os --source=pai-github

# Review upgrade history
/update-os --history
```

## Success Metrics

- Number of improvements discovered per month
- System performance improvements (speed, accuracy)
- User friction points reduced
- New capabilities added without manual coding
