# CLAIR — Cascaded Lazy AI Routing

> An MCP server that reduces token burn by lazily loading skills and tools only when needed, and routing repetitive subtasks to ML backends instead of the LLM.

## Why CLAIR?

Loading all MCP tools and skill documents upfront can consume 5,000–15,000 tokens before the user's first message is processed. CLAIR introduces a 280-token always-on router that:

1. **Classifies** the incoming task
2. **Returns** only the skills and tools relevant to that task
3. **Identifies** subtasks that can bypass the LLM entirely via small ML models

## Architecture

```
User Request → CLAIR Router (~280 tokens) → Domain Skill → Cascade Skill → LLM
                                          ↘ ML Backend (for repetitive tasks)
```

## Installation

```bash
git clone https://github.com/concensure/clair-mcp-server
cd clair-mcp-server
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clair": {
      "command": "node",
      "args": ["/path/to/clair-mcp-server/dist/index.js"]
    }
  }
}
```

## Usage with Claude Code

```bash
claude mcp add clair node /path/to/clair-mcp-server/dist/index.js
```

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

## Extending CLAIR

### Adding a new skill

1. Create your skill markdown file in `skills/domains/` or `skills/cascades/`
2. Add an entry to `skills/manifest.json`
3. Include trigger keywords and token cost estimate

### Adding an ML backend

Add an entry to the `ml_offload_registry` in `skills/manifest.json`:

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

## Hosting

**Recommended:** Railway, Fly.io, or Render for remote HTTP transport.  
**Local dev:** stdio transport (default, no server needed).

See [HOSTING.md](./docs/HOSTING.md) for deployment guides.

## RFC

The formal proposal for the CLAIR protocol is in [docs/RFC-CLAIR.md](./docs/RFC-CLAIR.md).

## License

MIT
