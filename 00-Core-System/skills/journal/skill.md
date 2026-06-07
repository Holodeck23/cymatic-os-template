# Journal Skill

**Purpose**: Facilitate guided reflection, pattern recognition, and personal insight extraction through intelligent journaling.

## Core Capabilities

1. **Guided Reflection** - Structured prompts based on your preferences
2. **Pattern Detection** - Identify recurring themes and behaviors
3. **Mood & Energy Tracking** - Monitor emotional and physical states
4. **Insight Extraction** - Surface non-obvious learnings
5. **Progress Celebration** - Acknowledge wins and growth

## When to Use

- User runs `/journal` command
- Daily morning/evening reflection routine
- After significant events or decisions
- When processing complex emotions
- Weekly/monthly review sessions

## Workflows

### 1. Quick Check-In
**File**: `workflows/quick-checkin.md`
- Current energy level (1-10)
- Current stress level (1-10)
- Top priority for today
- Current blocker or challenge

### 2. Deep Reflection
**File**: `workflows/deep-reflection.md`
- What worked well today/this week?
- What didn't work? Why?
- What did I learn?
- What will I do differently?
- What am I grateful for?

### 3. Pattern Analysis
**File**: `workflows/pattern-analysis.md`
- Analyze recent journal entries for patterns
- Compare current state vs. historical trends
- Identify triggers for energy dips/peaks
- Detect behavioral loops (positive and negative)

### 4. Mood Tracking
**File**: `workflows/mood-tracking.md`
- Log current emotional state
- Identify contributing factors
- Cross-reference with behavioral patterns
- Suggest interventions if needed

### 5. Weekly Review
**File**: `workflows/weekly-review.md`
- Review week's progress on goals
- Assess alignment with values
- Celebrate wins (big and small)
- Extract lessons learned
- Set intentions for next week

## Tools Directory

Contains deterministic scripts for:
- `parse-entry.ts` - Extract structured data from free-form text
- `analyze-patterns.ts` - Statistical analysis of journal data
- `update-dashboard.ts` - Sync journal insights to dashboard
- `export-entries.ts` - Export journal in various formats

## Communication Style

Based on `~/cymatic-os/01-Knowledge-Vault/journaling-preference.md`:

- **Tone**: Conversational, supportive, non-judgmental
- **Questions**: Open-ended, thought-provoking
- **Prompts**: Adapted to current energy level
- **Depth**: Match user's engagement level
- **Follow-up**: Build on previous entries

## Output Format

### Quick Check-In
```markdown
## Journal Entry - [Date] [Time]

**Energy**: [1-10] | **Stress**: [1-10] | **Mood**: [emotion]

**Today's Priority**: [Top task/focus]

**Current Blocker**: [Challenge or none]

**Quick Reflection**: [User's free-form response]

---
*Captured and filed in 01-Knowledge-Vault/000-Conversations/*
```

### Deep Reflection
```markdown
## Deep Reflection - [Date]

### What Went Well
[User insights]

### Challenges & Learnings
[User insights]

### Patterns Noticed
[AI-detected patterns from history]

### Gratitude
[What user is grateful for]

### Tomorrow's Intention
[Forward-looking statement]

---
**AI Insights**:
- [Pattern observation]
- [Suggested intervention if applicable]
- [Connection to previous entries]

*Filed with cross-references to behavioral-patterns.md*
```

## Integration Points

- **Dashboard**: Updates energy, stress, priority in real-time
- **Knowledge Vault**: Stores entries in `000-Conversations/`
- **Behavioral Patterns**: Cross-references with pattern library
- **Progress Tracker**: Logs wins and learnings
- **Current State**: Updates `current-state.md` automatically

## Dashboard Data Updates

After each journal entry, automatically update:

```typescript
// .dashboard-data/current-status.json
{
  "energy": 7,           // From journal check-in
  "stress": 4,           // From journal check-in
  "mood": "focused",     // Detected from entry
  "priority": "Finish primary offer landing page", // Today's frog
  "lastUpdated": "2025-12-20T10:30:00Z"
}
```

## Usage Examples

```bash
# Quick morning check-in
/journal

# Deep evening reflection
/journal --deep

# Weekly review
/journal --weekly

# Focus on specific topic
/journal --focus="Client portal progress"

# Mood tracking only
/journal --mood --energy

# Export recent entries
/journal --export=last-30-days --format=markdown
```

## Smart Interventions

The journal skill can detect and respond to patterns:

### Energy Patterns
- **Detect**: Energy consistently low after lunch
- **Intervene**: Suggest schedule adjustment or break

### Stress Patterns
- **Detect**: Stress spikes when juggling multiple projects
- **Intervene**: Recommend focus session or priority clarification

### Behavioral Loops
- **Detect**: User reports same blocker multiple times
- **Intervene**: Activate `/unblock` skill automatically

### Wins Tracking
- **Detect**: User achieved milestone
- **Celebrate**: Update progress tracker, suggest share/reflect

## Success Metrics

- Consistency: Journal entries per week
- Depth: Average length and insight quality
- Pattern detection: Interventions triggered
- Dashboard accuracy: Real-time data freshness
- User satisfaction: Sentiment in entries improving over time

## Privacy & Storage

- All entries stored locally in Knowledge Vault
- No external sync unless user explicitly exports
- Searchable via grep/text search tools
- Exportable in markdown, JSON, or plain text
