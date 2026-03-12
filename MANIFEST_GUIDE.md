# CLAIR Manifest Guide — How to Organize Skills and Write Triggers

## The Key Insight: Routing Uses Zero LLM Tokens

CLAIR's routing is **pure keyword matching** — no LLM is involved at routing time. The router scans the user's query for trigger keywords defined in `manifest.json` and returns the matching skills in microseconds.

```
Token cost of routing: ~280 tokens (router overhead) + 0 LLM tokens
Token cost of NOT routing: 5,000–15,000 tokens (all skills loaded upfront)
```

The manifest is written **once by the developer** at setup time. It is not regenerated per request.

---

## Manifest Structure

```json
{
  "version": "1.0",
  "skills": [
    {
      "id": "unique-skill-id",
      "path": "skills/domains/my-skill.md",
      "token_cost": 420,
      "triggers": ["keyword1", "keyword2", "phrase with spaces"],
      "children": ["child-skill-id"],
      "parent": "parent-skill-id",
      "mcp_dependencies": ["tool-id"]
    }
  ],
  "ml_offload_registry": []
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique identifier for this skill |
| `path` | ✅ | Relative path to the skill markdown file |
| `token_cost` | ✅ | Estimated token cost of loading this skill (use file size ÷ 4) |
| `triggers` | ✅ | Keywords/phrases that activate this skill |
| `children` | Optional | IDs of child skills in the cascade |
| `parent` | Optional | ID of parent skill (for cascade children) |
| `mcp_dependencies` | Optional | MCP tool IDs required by this skill |

---

## How to Organize the Skill Tree

### Step 1: Identify Your Domains

Group your skills into broad domains. Each domain becomes a top-level skill.

```
Your app handles:
├── Travel planning → domain: "travel"
├── Code assistance → domain: "coding"
├── Document creation → domain: "documents"
└── Data analysis → domain: "data"
```

### Step 2: Identify Cascades Within Each Domain

Within each domain, identify sub-specializations that are only needed for specific queries.

```
"travel" domain
├── flights (only for flight queries)
├── accommodation (only for hotel queries)
├── dining (only for restaurant queries)
└── itinerary (only for schedule queries)
```

### Step 3: Write Trigger Keywords

For each skill, list the words a user would type that should activate it. Think like a search engine — what are the most discriminating keywords?

**Good triggers:**
- Specific nouns: `flight`, `hotel`, `restaurant`, `python`, `typescript`
- Action verbs: `book`, `find`, `debug`, `refactor`, `implement`
- Domain jargon: `itinerary`, `lodging`, `pytest`, `webpack`

**Avoid as triggers:**
- Generic words: `the`, `a`, `is`, `help` (too broad — will match everything)
- Single letters or numbers

**Rule of thumb**: 5–15 triggers per skill is usually sufficient.

---

## Three Ways to Write the Manifest (No LLM Tokens Required)

### Method 1: Manual (Best for ≤10 skills)

Write the manifest by hand. For each skill file, ask yourself:
> "What words would a user type that should load this skill?"

Takes 10–30 minutes. Zero tokens consumed.

```json
// For a "flights" skill:
"triggers": ["flight", "fly", "airline", "airport", "booking", "depart", "arrive", "layover", "nonstop"]
```

### Method 2: Keyword Extraction Script (Zero tokens, any size)

Run this script to extract the most frequent domain-specific words from each skill file:

```bash
#!/bin/bash
# extract-triggers.sh — extract top keywords from a skill file
SKILL_FILE=$1
echo "Top keywords in $SKILL_FILE:"
cat "$SKILL_FILE" \
  | tr '[:upper:]' '[:lower:]' \
  | tr -cs '[:alpha:]' '\n' \
  | grep -v -E '^(the|a|an|is|are|be|to|of|in|for|on|with|this|that|it|you|we|your|our|can|will|should|must|may|not|or|and|but|if|when|how|what|which|where|who|from|by|at|as|do|use|used|using|also|more|than|then|each|all|any|some|have|has|had|been|was|were|would|could|should|their|they|them|these|those|into|out|up|down|over|under|about|after|before|between|through|during|without|within|along|across|behind|beyond|plus|except|up|down|off|above|below|near|far|here|there|now|then|just|only|even|still|yet|already|always|never|often|sometimes|usually|generally|typically|commonly|normally|often|rarely|seldom|frequently|occasionally|regularly|daily|weekly|monthly|annually)$' \
  | sort | uniq -c | sort -rn | head -20
```

Review the output and select the most discriminating keywords.

### Method 3: One-Time LLM-Assisted Generation (Amortized cost)

Use an LLM **once** to generate the initial manifest. This is a setup cost, not a per-request cost.

**Prompt template:**
```
I have the following skill files for a CLAIR manifest. For each file, generate:
1. A short unique ID (snake_case)
2. 8-12 trigger keywords that would indicate a user needs this skill
3. Estimated token cost (file character count ÷ 4)

Skill files:
---
[SKILL_ID: coding]
[paste coding.md content]
---
[SKILL_ID: python]
[paste python.md content]
---

Output as JSON array matching this schema:
{ "id": string, "triggers": string[], "token_cost": number }
```

**Cost**: ~2,000–5,000 tokens (one-time).  
**Recovery**: If CLAIR saves 7,000 tokens/request, the setup cost is recovered after 1 request.

---

## Estimating Token Costs

Use this formula: `token_cost = Math.ceil(file_size_in_bytes / 4)`

Or run this script:
```bash
# estimate-tokens.sh
for f in skills/**/*.md; do
  chars=$(wc -c < "$f")
  tokens=$((chars / 4))
  echo "$tokens tokens: $f"
done
```

---

## Cascade Design Patterns

### Pattern 1: Domain → Specialization
```
travel (420 tokens) — triggers: travel, trip, vacation
  └── flights (350 tokens) — triggers: flight, fly, airline
  └── accommodation (340 tokens) — triggers: hotel, stay, lodging
```
Load `travel` for any travel query. Load `flights` only when the query mentions flights.

### Pattern 2: Language → Framework
```
coding (420 tokens) — triggers: code, implement, function, bug
  └── python (320 tokens) — triggers: python, .py, django, flask
  └── typescript (310 tokens) — triggers: typescript, .ts, react, node
```

### Pattern 3: Task → Subtask
```
development (460 tokens) — triggers: implement, build, fix, debug, UI
  └── ui_debugging (440 tokens) — triggers: debug, error, broken, TypeError
  └── button_interaction (380 tokens) — triggers: click, submit, handler
```

### Pattern 4: Flat (No Cascade)
For simple use cases, a flat manifest with no parent/child relationships works fine:
```json
[
  { "id": "travel", "triggers": ["travel", "trip", "flight", "hotel"] },
  { "id": "coding", "triggers": ["code", "function", "bug", "debug"] },
  { "id": "data", "triggers": ["data", "csv", "analysis", "chart"] }
]
```

---

## Handling Edge Cases

### No triggers match → Load a default skill
```json
{
  "id": "general",
  "path": "skills/domains/general.md",
  "token_cost": 200,
  "triggers": [],
  "is_default": true
}
```

### Query matches too many skills → Use parent-only loading
If a query matches both a parent and multiple children, load only the parent first. The parent skill can instruct the LLM to request specific children if needed.

### Ambiguous queries → Use the most specific match
If "book a flight to Paris" matches both `travel` and `flights`, load both — they are related and the combined cost (770 tokens) is still far less than loading all skills (9,930 tokens).

---

## Validating Your Manifest

Run this quick validation before deploying:

```bash
node -e "
const manifest = require('./manifest.json');
const queries = [
  'Plan a trip to Tokyo',
  'Write a Python function',
  'Debug a TypeError',
  'Create a PDF report',
  'Analyze sales data'
];
for (const q of queries) {
  const matched = manifest.skills.filter(s =>
    s.triggers.some(t => q.toLowerCase().includes(t.toLowerCase()))
  );
  console.log(q + ' → ' + (matched.map(s => s.id).join(', ') || 'NO MATCH'));
}
"
```

Expected output: each query should match 1–3 relevant skills, not 0 and not all 15.

---

## Summary

| Concern | Answer |
|---------|--------|
| Who writes the manifest? | Developer, once at setup time |
| Does routing use LLM tokens? | **No** — pure keyword matching, 0 LLM tokens |
| How long does routing take? | Microseconds (string matching) |
| What if no keywords match? | Load a default/fallback skill |
| Can I use LLM to write the manifest? | Yes, once at setup — cost is amortized over all future requests |
| What about semantic routing? | Optional upgrade — embedding-based or small classifier |
