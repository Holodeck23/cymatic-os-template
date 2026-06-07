# 📚 Command Reference Guide

> **Complete slash command documentation with agent responsibilities**

## Command Syntax & Usage

**Format**: `/command [parameters] [options]`  
**Processing**: Each command routes to specialized subagent with full knowledge base access  
**Output**: Actionable results + automatic knowledge base updates

---

## 📥 Data Processing Commands

### `/harvest [source] [--type=TYPE]`
**Agent**: Harvest Agent  
**Purpose**: Extract insights from any data source and file appropriately

**Usage Examples**:
```
/harvest ./examples/client-meeting.txt
/harvest --type=email ./examples/inbox-export.mbox
/harvest "Today I realized the client portal needs better onboarding flow"
```

**Parameters**:
- `source` - File path, text input, or data source to analyze
- `--type` - Data type hint (conversation, email, journal, document)

**Agent Actions**:
- Parse content for insights, decisions, action items, patterns
- Cross-reference with existing knowledge for context
- File insights in appropriate knowledge base locations
- Update project contexts if relevant
- Flag new patterns or significant changes

**Output**: Summary of extracted insights + knowledge base updates

---

### `/ingest [source] --project=PROJECT`
**Agent**: Harvest Agent  
**Purpose**: Process external information and integrate into specific project context

**Usage Examples**:
```
/ingest competitor_analysis.pdf --project=client-portal
/ingest "Market research shows customers pay for workflow automation" --project=revenue-analysis
```

**Agent Actions**:
- Analyze external information for strategic value
- Integrate insights with specified project context  
- Update competitive intelligence and market analysis
- Identify opportunities or threats

---

### `/sync [--project=PROJECT]`
**Agent**: Execution Agent + System Agent coordination  
**Purpose**: Synchronize all project statuses and cross-references

**Usage Examples**:
```
/sync
/sync --project=client-portal
```

**Agent Actions**:
- Update all project statuses from latest available information
- Check for deadline conflicts or resource constraints
- Update cross-project dependencies and synergies
- Flag projects needing attention or decisions

---

## 📝 Reflection & Analysis Commands

### `/journal [--mood] [--energy] [--focus=TOPIC]`
**Agent**: Journal Agent  
**Purpose**: Guided reflection with pattern recognition and insight extraction

**Usage Examples**:
```
/journal
/journal --mood --energy
/journal --focus="Client portal development challenges"
```

**Agent Actions**:
- Guide structured reflection based on your communication preferences
- Analyze responses for emotional and energy patterns
- Update mood tracking and energy optimization insights
- Check recent decisions against core values
- Generate personal insights and growth observations

**Output**: Reflection summary + personal pattern insights

---

### `/review [timeframe] [--project=PROJECT]`
**Agent**: Journal Agent + Intelligence Agent  
**Purpose**: Analyze recent decisions, outcomes, and lessons learned

**Usage Examples**:
```
/review last-week
/review last-month --project=client-portal
```

**Agent Actions**:
- Review recent actions and decisions within timeframe
- Analyze outcomes against expectations
- Extract lessons learned and success patterns
- Update decision-making framework with new insights
- Identify patterns of effective vs. ineffective actions

---

## 📊 Strategic Analysis Commands

### `/revenue-scan [--detailed] [--forecast=MONTHS]`
**Agent**: Intelligence Agent  
**Purpose**: Comprehensive revenue analysis and optimization opportunities

**Usage Examples**:
```
/revenue-scan
/revenue-scan --detailed --forecast=6
```

**Agent Actions**:
- Analyze current revenue from all active streams and initiatives
- Calculate projections toward the user's target
- Identify highest-impact optimization opportunities
- Assess resource allocation efficiency
- Generate revenue acceleration recommendations

**Output**: Revenue dashboard + prioritized optimization strategies

---

### `/market-intel [project] [--competitive] [--opportunity]`
**Agent**: Intelligence Agent with Research capabilities  
**Purpose**: Market research and competitive intelligence

**Usage Examples**:
```
/market-intel client-portal --competitive
/market-intel template-product --opportunity
```

**Agent Actions**:
- Research competitive landscape for specified project
- Identify market opportunities and threats
- Analyze positioning and differentiation strategies
- Update market intelligence database
- Generate strategic recommendations

---

### `/risk-assess [--financial] [--operational] [--project=PROJECT]`
**Agent**: Intelligence Agent  
**Purpose**: Risk evaluation and mitigation planning

**Usage Examples**:
```
/risk-assess --financial
/risk-assess --operational --project=client-portal
```

**Agent Actions**:
- Identify current risks across all projects and contexts
- Assess probability and impact of identified risks
- Generate mitigation strategies aligned with risk tolerance
- Update risk monitoring systems
- Recommend preventive measures

---

## 🎯 Execution Commands

### `/focus [--energy=LEVEL] [--timeframe=DURATION]`
**Agent**: Execution Agent  
**Purpose**: Determine single highest-impact action for specified timeframe

**Usage Examples**:
```
/focus
/focus --energy=7 --timeframe=today
/focus --timeframe=this-week
```

**Agent Actions**:
- Analyze current project priorities and deadlines
- Consider your energy level and capacity constraints
- Apply decision-making framework for priority ranking
- Factor in revenue impact and strategic alignment
- Account for values, commitments, and personal constraints

**Output**: Single highest-impact action with clear execution plan

---

### `/plan [goal] [--timeframe=DURATION] [--resources]`
**Agent**: Execution Agent + Intelligence Agent  
**Purpose**: Create detailed implementation plan for specific goal

**Usage Examples**:
```
/plan "Launch client portal beta" --timeframe=3-months
/plan "Optimize template product conversion rate" --resources
```

**Agent Actions**:
- Break down goal into specific, actionable steps
- Create realistic timeline accounting for constraints
- Identify required resources and potential blockers  
- Generate risk mitigation strategies
- Create progress tracking milestones

**Output**: Detailed implementation plan with timelines and milestones

---

### `/unblock [--project=PROJECT] [--type=TYPE]`
**Agent**: Execution Agent  
**Purpose**: Identify and resolve current obstacles or bottlenecks

**Usage Examples**:
```
/unblock
/unblock --project=client-portal --type=technical
```

**Agent Actions**:
- Identify current blockers across all projects or specific project
- Categorize blockers by type (technical, resource, decision, external)
- Generate resolution strategies based on your problem-solving patterns
- Prioritize blocker resolution by impact on progress
- Create action plan for systematic unblocking

---

## 🔧 System Evolution Commands

### `/update-os [--analyze] [--implement]`
**Agent**: System Agent  
**Purpose**: Analyze system performance and implement improvements

**Usage Examples**:
```
/update-os --analyze
/update-os --implement
```

**Agent Actions**:
- Analyze effectiveness of current commands and agents
- Review knowledge base organization and accessibility
- Assess AI interaction patterns and calibration needs
- Identify system improvements and new capabilities needed
- Generate system evolution recommendations or implement changes

---

### `/calibrate [--communication] [--preferences] [--patterns]`
**Agent**: System Agent + Journal Agent  
**Purpose**: Adjust AI responses based on recent interaction effectiveness

**Usage Examples**:
```
/calibrate --communication
/calibrate --preferences --patterns
```

**Agent Actions**:
- Analyze recent AI interaction effectiveness
- Update communication preferences based on user responses
- Refine behavioral pattern recognition accuracy
- Adjust agent response styles and approaches
- Optimize system responsiveness to your authentic needs

---

## Advanced Command Features

### **Command Chaining**
```
/harvest client_feedback.txt && /sync --project=client-portal && /focus
```

### **Conditional Execution** 
```
/revenue-scan && if gap exists then /plan "revenue acceleration strategy"
```

### **Background Processing**
```
/market-intel client-portal --background
# Continue other work while agent processes
```

### **Custom Parameters**
```
/journal --template=weekly-review --export=markdown
/plan --risk-tolerance=conservative --values-priority=high
```

---

## Output Formats

### **Standard Output**: 
- Action summary
- Key insights extracted  
- Next recommended steps
- Knowledge base updates made

### **Detailed Output** (`--verbose`):
- Complete analysis process
- All insights considered
- Alternative approaches evaluated
- Full knowledge base change log

### **Export Options**:
- `--export=markdown` - Save results to markdown file
- `--export=project` - Update specific project file
- `--export=dashboard` - Add to strategic dashboard

---

**Command System Status**: Framework complete, ready for agent implementation  
**Agent Coordination**: All agents access shared knowledge base with cross-referencing  
**Evolution**: System learns and improves based on usage patterns and effectiveness
