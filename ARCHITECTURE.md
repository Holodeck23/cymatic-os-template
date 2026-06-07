# Cymatic OS Architecture

## Overview

Cymatic OS is a **personalized AI operating system** that runs as a set of Claude Code agents. It eliminates AI conversation fragmentation by maintaining persistent context about who you are, how you work, and what you're building.

## Core Components

### 1. Agent System (`.claude/agents/`)

Two primary agents power the system:

#### `/onboarding` Agent
- **File**: `.claude/agents/onboarding.md`
- **Purpose**: Conducts the initial 90-120 minute interview to build your personalized vault
- **Invocation**: `/onboarding start` (run once during setup)
- **Tools**: Read, Write, Grep, Glob
- **Output**: Populates all vault files in `01-Knowledge-Vault/`

**6-Stage Interview Process:**
1. Identity & Operational Context → `identity-profile.md`
2. Behavioral Pattern Recognition → `behavioral-patterns.md`
3. Communication Calibration → `communication-calibration.md`
4. Project Ecosystem Mapping → `project-ecosystem.md`
5. Goals & Success Metrics → `goals-metrics.md`
6. Intervention & Command Design → `interventions-commands.md`

#### `/cymatic` Agent (Auto-loads)
- **File**: `.claude/agents/cymatic.md`
- **Purpose**: Your personalized AI that auto-loads context from vault files
- **Invocation**: Automatic on every conversation
- **Tools**: Read, Grep, Glob, Write
- **Behavior**:
  - Loads all vault files on first message
  - Recognizes your behavioral patterns
  - Communicates in your calibrated style
  - Keeps you aligned with goals
  - Executes custom commands

### 2. Knowledge Vault (`01-Knowledge-Vault/`)

Your personal data repository - populated by the onboarding agent:

```
01-Knowledge-Vault/
├── README.md                    # Privacy and usage notes
├── templates/                   # Template-safe scaffold files
├── identity-profile.md          # Generated; ignored by git
├── behavioral-patterns.md       # Generated; ignored by git
├── communication-calibration.md # Generated; ignored by git
├── project-ecosystem.md         # Generated; ignored by git
├── goals-metrics.md             # Generated; ignored by git
└── interventions-commands.md    # Generated; ignored by git
```

**Git Behavior**: User-populated vault files are `.gitignore`d by default because they contain personal data. Committed examples live in `01-Knowledge-Vault/templates/`.

### 3. Core System (`00-Core-System/`)

System-level prompts and routing:

```
00-Core-System/
├── cymatic-master-prompt.md  # Auto-generated integration of all vault files
├── routing.md                # Command routing logic
└── commands/                 # Command definitions
```

### 4. Supporting Directories

```
02-Active-Projects/   # Project-specific notes and tracking
03-Resources/         # Reference materials, templates
05-Navigation/        # Quick access and index
```

## How It Works

### Initial Setup Flow

1. **User clones repo** → No personal vault files; template scaffolds are in `01-Knowledge-Vault/templates/`
2. **User runs `/onboarding start`** → Onboarding agent launches
3. **90-120 minute interview** → Agent asks calibrated questions
4. **Vault files populated** → Agent writes personalized data to vault
5. **System ready** → Cymatic agent auto-loads context from vault

### Normal Usage Flow

1. **User opens Claude Code** in the Cymatic OS directory
2. **Cymatic agent auto-loads** → Reads all vault files
3. **Greets user with context** → "Welcome back, [Name]. Active projects: [list]..."
4. **Conversation begins** with full context already loaded
5. **Pattern recognition** → Agent watches for and interrupts known patterns
6. **Custom commands** → User can trigger personalized interventions

### Example Pattern Recognition

User: "I'm researching project management tools for my newsletter workflow"

Cymatic Agent (reads behavioral-patterns.md, sees "analysis paralysis" pattern):
```
I'm noticing your analysis paralysis pattern - you're researching tools
instead of managing the project.

Based on your decision-making protocol: What's the 5-minute choice here?
- Use what you have now?
- Pick the first one that meets your must-haves?

Remember your 90-day goal: Launch your main product. This research isn't
on the revenue path.
```

## Agent Communication

### Agent-to-Agent Integration

- **Onboarding agent** writes vault files
- **Cymatic agent** reads vault files
- Both can update vault files when user's situation changes

### Commands

Users can invoke custom commands defined in their vault:

```
::pattern_interrupt    # Calls out current behavioral pattern
::revenue_focus        # Shifts to money-making activities
::execution_mode       # Cuts analysis, starts shipping
::decision             # Applies their decision protocol
```

## Data Flow

```
User Interview (Onboarding Agent)
        ↓
Vault Files Written (01-Knowledge-Vault/)
        ↓
Master Prompt Generated (00-Core-System/)
        ↓
Cymatic Agent Auto-loads Context
        ↓
Personalized AI Experience
```

## Updating Context

### Full Re-onboarding
```
/onboarding start
```

### Update Specific Stage
```
/onboarding resume stage-2
```

### Manual Vault Edit
Edit vault files directly, then:
```
User: "refresh context"
Cymatic: [Re-reads all vault files]
```

## Privacy & Security

- **Personal data stays local** - Vault files are gitignored
- **Template repo is generic** - No personal info committed
- **You control what's shared** - Vault files are markdown, easily editable
- **No external services** - Everything runs in Claude Code locally

## Extensibility

### Adding Custom Agents

Create new agents in `.claude/agents/`:

```markdown
---
name: your-agent-name
description: What this agent does
tools: Read, Write, Grep, Glob
color: blue
---

Agent instructions here...
```

### Adding Custom Commands

Edit `01-Knowledge-Vault/interventions-commands.md`:

```markdown
### `::your_command`
**Purpose**: What it does
**When to use**: Trigger conditions
**Response**: What AI should do/say
```

Cymatic agent will automatically recognize and execute it.

## Comparison to Other Systems

### vs Obsidian + AI Plugins
- **Cymatic**: Agent-native, auto-loading context
- **Obsidian**: Manual vault navigation, requires plugin setup

### vs ChatGPT Custom Instructions
- **Cymatic**: 6-stage deep calibration, behavioral pattern recognition
- **ChatGPT**: Limited to ~1500 chars, no pattern interruption

### vs Claude Projects
- **Cymatic**: IDE-integrated, command system, auto-loading agents
- **Claude Projects**: Web-only, static knowledge base

## Technical Requirements

- **Claude Code** (VS Code extension) or compatible IDE
- **Git** (for cloning repo)
- **Markdown editor** (for manual vault edits)

## File Sizes

- **Onboarding agent**: ~30KB markdown
- **Cymatic agent**: ~8KB markdown
- **Vault files total**: ~15-25KB when populated
- **Total system**: <100KB

## Performance

- **Onboarding**: 90-120 minutes (one-time)
- **Vault loading**: <2 seconds on agent init
- **Context refresh**: <1 second
- **Pattern recognition**: Real-time during conversation

---

**Philosophy**: Cymatic OS is built on the idea that AI should understand your *frequency* - the unique patterns, constraints, and context that make you who you are. By calibrating AI to your frequency, every conversation becomes coherent, contextual, and aligned with your goals.
