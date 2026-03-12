# CLAIR — Cascaded Lazy AI Routing

> An MCP server that reduces token burn by lazily loading skills and tools only when needed, and routing repetitive subtasks to ML backends instead of the LLM.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## Why CLAIR?

Loading all MCP tools and skill documents upfront can consume 5,000–15,000 tokens before the user's first message is processed. CLAIR introduces a 280-token always-on router that:

1. **Classifies** the incoming task
2. **Returns** only the skills and tools relevant to that task
3. **Identifies** subtasks that can bypass the LLM entirely via small ML models

## Proven Results — A/B Test

A controlled A/B test was run against a real Travel Planner web application across **50 tasks** spanning **7 task categories** (travel planning, UI changes, debugging, styling, state management, API development, button interactions).

| Metric | Control (full load) | CLAIR (lazy) | Improvement |
|--------|--------------------|-----------|-----------| 
| Avg tokens/request | 9,930 | 2,719 | **−72.6%** |
| Skills loaded | 15 (always) | 3.8 (avg) | **−74.7%** |
| Best category | 9,930 | 559 | **−94.4%** |
| Worst category | 9,930 | 4,361 | **−56.1%** |

Real LLM API calls (OpenRouter) confirmed the estimates:
- Control: **9,740 real prompt tokens** per request
- CLAIR travel query: **328 real prompt tokens** (−96.6% vs control)
- CLAIR dev task: **2,982 real prompt tokens** (−69.4% vs control)

**→ See the full report: [`demo/travel-planner/REPORT.md`](./demo/travel-planner/REPORT.md)**  
**→ Run the demo: [`demo/travel-planner/`](./demo/travel-planner/)**

## Architecture

```
User Request → CLAIR Router (~280 tokens) → Domain Skill → Cascade Skill → LLM
                                           ↘ ML Backend (for repetitive tasks)
```

## Installation

```bash
git clone https://github.com/concensure/clair-mcp-server.git
cd clair-mcp-server
npm install
npm run build
# Compiled output: dist/stdio.js (stdio transport) and dist/server.js (HTTP transport)
```

## Compatibility — Works with Any MCP Client

CLAIR is **client-agnostic**. It works with any MCP-compatible AI coding assistant:

| Client | LLM | Status |
|--------|-----|--------|
| Claude Desktop | Claude | ✅ Full support |
| Claude Code | Claude | ✅ Full support |
| **Kilo Code** | **OpenRouter / any** | ✅ **Full support** |
| Cursor | OpenAI / Anthropic | ✅ Full support (via MCP) |
| Any MCP client | Any | ✅ Full support |

**Kilo Code users**: CLAIR works with Kilo Code + OpenRouter. Call `clair_route` before attaching skill/rule documents. CLAIR's output tells you exactly which documents to attach for the current task — compatible with Kilo Code's skill document attachment feature.

**Rule documents**: CLAIR's manifest can point to any markdown file — skill documents, Kilo Code `.rules` files, or custom instruction files. No modification required.

**MCP tool savings**: CLAIR also reduces MCP tool token costs. With 20 tools loaded upfront (~4,000–8,000 tokens), CLAIR routes which tools are needed per request, reducing tool context to ~800–1,200 tokens (75–90% savings). See [RFC-CLAIR.md §8.3](./RFC-CLAIR.md) for details.

---

## Usage — stdio Transport (Universal)

**stdio is the standard transport** for local MCP servers across all major AI coding clients. After building, use `dist/stdio.js` as the entry point.

### Kilo Code (`mcp_settings.json`)

```json
{
  "mcpServers": {
    "clair": {
      "command": "node",
      "args": ["/path/to/clair-mcp-server/dist/stdio.js"],
      "alwaysAllow": ["clair_route", "clair_list_skills", "clair_offload"]
    }
  }
}
```

*File location*: `%APPDATA%\Code\User\globalStorage\kilocode.kilo-code\settings\mcp_settings.json` (Windows)
or `~/.config/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json` (Linux/Mac)

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "clair": {
      "command": "node",
      "args": ["/path/to/clair-mcp-server/dist/stdio.js"]
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add clair node /path/to/clair-mcp-server/dist/stdio.js
```

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "clair": {
      "command": "node",
      "args": ["/path/to/clair-mcp-server/dist/stdio.js"]
    }
  }
}
```

### OpenAI Codex / Any MCP-compatible client

```json
{
  "mcpServers": {
    "clair": {
      "command": "node",
      "args": ["/path/to/clair-mcp-server/dist/stdio.js"]
    }
  }
}
```

> **Windows paths**: Use double backslashes: `"C:\\Users\\you\\clair-mcp-server\\dist\\stdio.js"`

### HTTP Transport (Remote / Team Deployment)

For remote deployment (Railway, Fly.io, Render), use `dist/server.js` which exposes an HTTP endpoint at `/mcp`. See [HOSTING.md](./HOSTING.md).

## Available Tools

### `clair_route`
Classifies a task and returns the minimal set of skills and MCP tools to load.

```json
{
  "task_description": "Write a Python script to analyze sales data from a CSV",
  "prefer_ml_offload": true
}
```

Returns:
```json
{
  "domains": ["coding", "data_analysis"],
  "load_skills": [
    { "id": "coding", "path": "skills/domains/coding.md", "token_cost": 420 },
    { "id": "data", "path": "skills/domains/data.md", "token_cost": 340 },
    { "id": "python", "path": "skills/cascades/coding/python.md", "token_cost": 320 }
  ],
  "load_tools": [
    { "id": "filesystem", "reason": "Required by coding skill" },
    { "id": "python_exec", "reason": "Required by data skill" }
  ],
  "ml_candidates": [],
  "estimated_tokens_saved": 1840,
  "routing_confidence": 0.85
}
```

### `clair_offload`
Routes a repetitive subtask to an ML backend.

```json
{
  "subtask_type": "sentiment_classification",
  "data": ["Great product!", "Terrible service", "It was okay"]
}
```

### `clair_list_skills`
Lists all available skills, cascades, and ML backends with their token costs.

## Skill Tree

```
skills/
├── router/ROUTER.md          ← always loaded (280 tokens)
├── domains/
│   ├── documents.md          (380 tokens)
│   ├── coding.md             (420 tokens)
│   ├── data.md               (340 tokens)
│   └── research.md           (290 tokens)
└── cascades/
    ├── documents/
    │   ├── docx.md           (560 tokens)
    │   ├── pdf.md            (480 tokens)
    │   └── pptx.md           (510 tokens)
    └── coding/
        ├── python.md         (320 tokens)
        ├── typescript.md     (310 tokens)
        └── testing.md        (280 tokens)
```

**Total if loaded naively:** ~4,170 tokens  
**Average CLAIR-routed load:** ~1,040 tokens  
**Average savings: ~75%**

## ML Offload Registry

| Task | Backend | Accuracy | Latency |
|------|---------|----------|---------|
| Sentiment classification | distilbert-sst-2 | 93% | 15ms |
| Language detection | langdetect | 99% | 2ms |
| Spell check | pyspellchecker | 97% | 5ms |
| Named entity extraction | spaCy en_core_web_sm | 91% | 10ms |
| Text similarity | all-MiniLM-L6-v2 | 89% | 20ms |
| Anomaly detection | Isolation Forest | 85% | 25ms |
| Regex extraction | Rules | 99% | 1ms |
| Tabular classification | sklearn | 88% | 8ms |

## How Routing Works (Zero LLM Tokens)

CLAIR's routing is **pure keyword matching** — no LLM is invoked at routing time. The developer writes a `manifest.json` once with trigger keywords for each skill. At request time, CLAIR scans the user's query for those keywords in microseconds.

```
Token cost of routing: ~280 tokens (router overhead) + 0 LLM tokens
Token cost of NOT routing: 5,000–15,000 tokens (all skills loaded upfront)
```

**→ See [MANIFEST_GUIDE.md](./MANIFEST_GUIDE.md)** for how to write the manifest, organize the skill tree, and validate triggers — without consuming any LLM tokens.

---

## Extending CLAIR

### Adding a new skill

1. Create your skill markdown file in `skills/domains/` or `skills/cascades/`
2. Add an entry to `manifest.json`
3. Include trigger keywords and token cost estimate

### Adding an ML backend

Add an entry to the `ml_offload_registry` in `manifest.json`:

```json
{
  "id": "your_task_id",
  "triggers": ["keyword1", "keyword2"],
  "volume_threshold": 5,
  "backend": "your-model-name",
  "backend_type": "huggingface|sklearn|spacy|rules|python_library",
  "latency_ms": 10,
  "accuracy": 0.90
}
```

## Demo

The [`demo/travel-planner/`](./demo/travel-planner/) directory contains a complete A/B test demo:

- A Travel Planner web app with real LLM integration (OpenRouter)
- 15 skills across travel and software development domains
- Automated 50-task simulation script
- Full A/B test report with per-category breakdown

## Hosting

**Recommended:** Railway, Fly.io, or Render for remote HTTP transport.  
**Local dev:** stdio transport (default, no server needed).

See [HOSTING.md](./HOSTING.md) for deployment guides.

## RFC

The formal proposal for the CLAIR protocol is in [RFC-CLAIR.md](./RFC-CLAIR.md).

## License

Apache 2.0 — see [LICENSE](./LICENSE).

Free to use commercially with attribution. See the [licence comparison](./RFC-CLAIR.md#licence) for details.
