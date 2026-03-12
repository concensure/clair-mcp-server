# RFC: CLAIR — Cascaded Lazy AI Routing

**RFC Number**: CLAIR-001
**Status**: Draft
**Author(s)**: Casper Wu
**Created**: 2026-03-06
**Last Updated**: 2026-03-12
**Target Audience**: MCP implementors, AI agent framework developers, Anthropic platform team, Kilo Code users, OpenRouter users
**Repository**: https://github.com/modelcontextprotocol/specification (proposed discussion target)

---

## Abstract

This RFC proposes **CLAIR (Cascaded Lazy AI Routing)**, a composable architecture for reducing token consumption and improving capability discovery in LLM-based agent systems. CLAIR introduces a lightweight always-on router that lazily loads domain-specific skill documents and MCP tools only when they are relevant to the active task, and provides an ML-offload routing layer that directs subtasks to the most efficient execution backend — whether an LLM, a small trained model, a rule-based system, or a cached result.

---

## 1. Motivation

### 1.1 The Token Bloat Problem

Current MCP deployments load all tool definitions into context at session initialization. A moderately equipped agent with 20 MCP tools may burn 3,000–8,000 tokens before the user's first message is even processed. At scale — multi-turn conversations, large system prompts, many tools — this pushes against context window limits and increases latency and cost non-linearly.

Similarly, the emerging practice of "skills" (structured markdown instruction documents read into context via file tools) compounds this problem. A system with 10 skills and 15 MCP tools can exhaust 15,000+ tokens on scaffolding alone.

### 1.2 The Discovery Problem

When tools are loaded upfront, models must reason over all of them for every request, increasing the chance of incorrect tool selection and hallucinated tool calls. Discovery should be demand-driven, not speculative.

### 1.3 The Execution Efficiency Problem

LLMs are used for tasks they are dramatically overqualified (and overpriced) for: sentiment classification, entity extraction, tabular prediction, spell checking, structured data parsing. These tasks have excellent sub-100MB ML solutions. There is currently no standard routing layer to dispatch these subtasks away from the LLM.

---

## 2. Terminology

| Term | Definition |
|---|---|
| **Router** | A minimal always-loaded component that classifies incoming tasks and dispatches capability loading |
| **Domain Skill** | A markdown instruction document scoped to a specific task domain (e.g. document creation, code review) |
| **Skill Cascade** | A chain of skill documents where a parent skill conditionally loads child skills |
| **MCP Tool** | A callable function exposed via the Model Context Protocol |
| **ML Backend** | A non-LLM model (classical ML, small neural net, rule system) that handles specific subtask types |
| **Capability Manifest** | A lightweight index of available skills and MCP tools with cost/trigger metadata |
| **Lazy Loading** | Deferring resource initialization until the resource is actually needed |

---

## 3. Architecture

### 3.1 Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER REQUEST                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              CLAIR ROUTER (always loaded, ~200 tokens)       │
│  • Classifies task domain                                    │
│  • Estimates complexity                                      │
│  • Determines ML-offloadable subtasks                        │
│  • Returns: domain[], tools_needed[], ml_candidates[]        │
└───────────────┬─────────────────────┬───────────────────────┘
                │                     │
                ▼                     ▼
┌──────────────────────┐   ┌─────────────────────────────────┐
│   SKILL CASCADE      │   │        ML OFFLOAD ROUTER        │
│  (load on demand)    │   │  (intercepts repetitive tasks)  │
│                      │   │                                  │
│  router_skill        │   │  • Sentiment → tiny BERT         │
│    └─ doc_skill      │   │  • NER → spaCy / rules           │
│    └─ code_skill     │   │  • Classification → sklearn      │
│         └─ py_skill  │   │  • Tabular → XGBoost             │
│         └─ ts_skill  │   │  • Spell check → hunspell        │
└──────────────────────┘   └─────────────────────────────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              LLM (only receives what it needs)               │
│  context = base_system + active_skill + relevant_tools only  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 The Router Component

The router is the only always-loaded component. It is intentionally minimal — a single MCP tool call or a sub-300-token skill document that contains:

1. A **task taxonomy** (flat list of domain tags)
2. A **routing table** mapping tags to skill paths and MCP tool IDs
3. An **ML offload checklist** (task patterns that should bypass LLM)

**Router output schema:**
```json
{
  "domains": ["document_creation", "data_analysis"],
  "load_skills": ["skills/domains/docx.md"],
  "load_tools": ["mcp:filesystem", "mcp:python_exec"],
  "ml_candidates": [
    {
      "subtask": "classify_sentiment",
      "backend": "transformers/distilbert-sentiment",
      "confidence": 0.91
    }
  ],
  "estimated_tokens_saved": 4200
}
```

### 3.3 Skill Cascade Design

Skills are organized in a tree. A parent skill is loaded first; it declares its children and the conditions under which they should be loaded.

```
skills/
├── router/
│   └── ROUTER.md          ← always loaded (~200 tokens)
├── domains/
│   ├── documents.md       ← loaded when: task=document_creation
│   ├── coding.md          ← loaded when: task=code_*
│   ├── data.md            ← loaded when: task=data_analysis
│   └── research.md        ← loaded when: task=research
└── cascades/
    ├── coding/
    │   ├── python.md      ← loaded when: coding + lang=python
    │   ├── typescript.md  ← loaded when: coding + lang=typescript
    │   └── testing.md     ← loaded when: coding + needs_tests=true
    └── documents/
        ├── docx.md        ← loaded when: output_format=docx
        ├── pdf.md         ← loaded when: output_format=pdf
        └── pptx.md        ← loaded when: output_format=pptx
```

Each skill declares its own cascade header:

```markdown
---
name: coding
triggers: ["write code", "implement", "fix bug", "refactor"]
loads_children_when:
  python: "python|py|django|flask"
  typescript: "typescript|ts|node|react"
  testing: "test|spec|coverage|jest|pytest"
mcp_dependencies: ["filesystem", "bash_exec"]
token_budget: 800
---
```

### 3.4 ML Offload Routing

The ML router intercepts subtasks matching known patterns before they reach the LLM:

```
Subtask arrives
      │
      ▼
Pattern match against ML offload registry
      │
      ├── MATCH → route to ML backend → return result
      │
      └── NO MATCH → pass to LLM as normal
```

**Offload Registry format:**
```json
{
  "patterns": [
    {
      "id": "sentiment_classification",
      "triggers": ["classify sentiment", "positive/negative", "sentiment of"],
      "volume_threshold": 5,
      "backend": "distilbert-base-uncased-finetuned-sst-2",
      "latency_ms": 12,
      "accuracy": 0.93
    },
    {
      "id": "language_detection",
      "triggers": ["what language is", "detect language"],
      "backend": "langdetect",
      "latency_ms": 1,
      "accuracy": 0.99
    }
  ]
}
```

---

## 4. Protocol Specification

### 4.1 CLAIR MCP Tool: `clair_route`

**Input:**
```typescript
{
  task_description: string,     // Natural language description of the task
  context_budget?: number,      // Available token budget (default: unlimited)
  prefer_ml_offload?: boolean,  // Whether to aggressively route to ML (default: true)
  session_id?: string           // For caching routing decisions
}
```

**Output:**
```typescript
{
  domains: string[],
  load_skills: SkillRef[],
  load_tools: ToolRef[],
  ml_candidates: MLCandidate[],
  estimated_tokens_saved: number,
  routing_confidence: number
}
```

### 4.2 CLAIR MCP Tool: `clair_offload`

**Input:**
```typescript
{
  subtask_type: string,     // e.g. "sentiment_classification"
  data: unknown,            // Input data for the ML backend
  backend_hint?: string     // Optional specific backend override
}
```

**Output:**
```typescript
{
  result: unknown,
  backend_used: string,
  latency_ms: number,
  confidence?: number,
  fallback_to_llm: boolean  // true if ML backend unavailable
}
```

### 4.3 Skill Manifest Standard

Every CLAIR-compatible skill directory MUST include a `manifest.json`:

```json
{
  "version": "1.0",
  "skills": [
    {
      "id": "documents",
      "path": "skills/domains/documents.md",
      "token_cost": 420,
      "triggers": ["document", "word", "pdf", "presentation", "report"],
      "children": ["docx", "pdf", "pptx"],
      "mcp_dependencies": ["filesystem"]
    }
  ]
}
```

---

## 5. Implementation Notes

### 5.1 Backwards Compatibility

CLAIR is fully additive. Existing MCP servers and skills require no modification. The router is an optional layer — Claude can still be used without it; CLAIR simply improves efficiency when present.

### 5.2 Router Token Budget

The router MUST stay under 300 tokens when loaded as a skill, or return its routing decision in a single MCP call costing no more than one round-trip. Routing overhead must never exceed the savings it generates.

### 5.3 ML Backend Availability

The ML offload router MUST gracefully degrade. If a backend is unavailable, `clair_offload` returns `fallback_to_llm: true` and the task proceeds normally. Unavailability must never block the pipeline.

### 5.4 Caching

Routing decisions for identical `task_description` inputs SHOULD be cached within a session. Across sessions, routing decisions MAY be cached with a TTL of 24 hours.

---

## 6. Security Considerations

- The router processes user input; it must sanitize task descriptions before pattern matching
- ML backends must run in isolated processes with no filesystem or network access by default
- Skill loading must be restricted to declared manifest paths; arbitrary file inclusion must be rejected
- The router must not leak information about available skills or tools in error messages

---

## 7. Reference Implementation

A reference implementation is available at:
`https://github.com/concensure/clair-mcp-server`

> **Note**: The repository was previously at `https://github.com/concensure/clair-mcp`. The canonical URL is now `https://github.com/concensure/clair-mcp-server`.

It includes:
- TypeScript MCP server with `clair_route` and `clair_offload` tools
- Router skill document (ROUTER.md)
- Domain skill documents (documents, coding, data, research)
- Cascade skill documents (python, typescript, docx, pdf, pptx)
- ML offload registry with 8 common patterns
- Integration tests and MCP Inspector config

---

## 8. Applicability Beyond Claude Code

### 8.1 CLAIR with Non-Claude-Code Clients (Kilo Code, OpenRouter, etc.)

CLAIR is **client-agnostic**. It is an MCP server that exposes standard MCP tools (`clair_route`, `clair_list_skills`, `clair_offload`). Any MCP-compatible client can call it, regardless of the underlying LLM provider.

**Kilo Code + OpenRouter**: Kilo Code supports MCP servers and can call `clair_route` before loading context documents. The routing decision returned by CLAIR tells the client which skill/rule documents to attach for the current task. Kilo Code's skill document attachment feature (added in recent updates) is directly compatible with CLAIR's output format.

**No modification required** for the core CLAIR server. The client integration pattern is:
```
1. User submits task
2. Client calls clair_route({ task_description: userQuery })
3. CLAIR returns { load_skills: [...], load_tools: [...] }
4. Client attaches only the returned skill/rule documents to context
5. Client exposes only the returned MCP tools for this request
```

### 8.2 Rule Documents vs Skill Documents

CLAIR's skill documents are standard markdown files. They are functionally identical to:
- Kilo Code `.rules` files
- Claude Code custom instructions
- Any system prompt injection mechanism

The manifest simply maps trigger keywords to file paths. The files can be:
- Skill documents (CLAIR's native format)
- Rule documents (Kilo Code format)
- Custom instruction files (any format)
- Prompt templates

**No modification to CLAIR is required** to support rule documents. Simply point the manifest `path` entries to your rule files.

### 8.3 MCP Tool Token Savings — A Key Use Case

This is one of CLAIR's most impactful applications. MCP tool schemas are expensive:

| Scenario | Token cost |
|----------|-----------|
| 20 MCP tools loaded upfront | ~4,000–8,000 tokens |
| CLAIR router only | ~280 tokens |
| CLAIR + 2 relevant tools | ~800–1,200 tokens |
| **Savings** | **~75–90%** |

CLAIR's `clair_route` output includes a `load_tools` array specifying which MCP tool IDs are needed for the current task. The client should only expose those tools to the LLM for that request.

**Example**: A user asks "find flights to Paris". CLAIR returns:
```json
{
  "load_skills": [{ "id": "travel", ... }, { "id": "flights", ... }],
  "load_tools": [{ "id": "web_search", "reason": "Required by travel skill" }]
}
```
The client exposes only `web_search` — not `filesystem`, `bash_exec`, `python_exec`, `database_query`, etc. This prevents the LLM from hallucinating calls to irrelevant tools and saves thousands of tokens.

### 8.4 What Needs to Change for Full MCP Tool Lazy Loading

The current CLAIR reference implementation routes skill documents. To add full MCP tool lazy loading:

1. **Manifest extension**: Add `mcp_tool_schemas` to the manifest with token costs and triggers for each MCP tool
2. **Client-side enforcement**: The MCP client must support dynamic tool exposure (not all clients do yet)
3. **Tool schema caching**: Cache tool schemas client-side; only send the relevant subset to the LLM per request

This is a client-side concern — CLAIR's server-side routing logic requires no changes. The `load_tools` field in `clair_route` output already supports this pattern.

---

## 9. Open Questions

1. Should the Capability Manifest be a first-class MCP resource type, or remain a filesystem convention?
2. Should routing decisions be logged for learning/improvement? What are the privacy implications?
3. Should CLAIR define a standard `skill://` URI scheme for cross-server skill references?
4. How should conflicts between multiple CLAIR routers in the same session be resolved?
5. Should CLAIR support a "tool manifest" standard for MCP tool lazy loading, separate from skill documents?
6. How should Kilo Code and other non-Claude clients integrate CLAIR's routing decisions into their context attachment APIs?

---

## 10. Acknowledgements

This proposal builds on:
- The MCP specification and SDK developed by Anthropic
- Research on speculative decoding and model cascading (Viola & Jones, 2001; Karpathy et al., routing work)
- The "Skills" pattern developed within Anthropic's Claude platform team
- Lazy evaluation patterns from functional programming (Haskell, Clojure)
- The broader MCP community's feedback on tool discovery and context management

Special thanks to the `modelcontextprotocol` GitHub community for early discussion on tool proliferation issues.

---

## 11. Revision History

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-03-06 | Initial draft |
| 0.2 | 2026-03-12 | Add Section 8: applicability to non-Claude clients (Kilo Code, OpenRouter), rule documents, MCP tool lazy loading. Add A/B test results. Update open questions. |

---

*This RFC is submitted for community discussion. Feedback welcome via GitHub Issues and Discussions on the MCP specification repository.*
