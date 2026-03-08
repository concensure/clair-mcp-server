---
name: clair-router
version: 1.0
token_budget: 280
always_loaded: true
description: Lightweight task classifier. Call clair_route before any substantive task. Returns which skills and tools to load.
---

# CLAIR Router

Always call `clair_route` first. Do not load other skills or invoke MCP tools until routing is complete.

## Domain Tags

| Tag | Keywords |
|-----|----------|
| `document_creation` | write, draft, document, report, word, pdf, slides, pptx |
| `code_general` | code, implement, function, script, debug, refactor |
| `data_analysis` | data, csv, excel, chart, statistics, dataset |
| `research` | search, find, explain, summarize, compare |

## Rules

1. Call `clair_route` with the user's task description
2. Load ONLY the skills returned in `load_skills`
3. Initialize ONLY the MCP tools returned in `load_tools`  
4. For any subtask in `ml_candidates`, call `clair_offload` instead of reasoning directly
5. If routing confidence < 0.6, load the `research` skill as fallback

## ML Offload Mandate

**Always offload to ML when volume ≥ threshold:**
- Sentiment classification (≥3 items) → distilbert
- Language detection (any volume) → langdetect  
- Spell check (any volume) → pyspellchecker
- Entity extraction (≥5 items) → spacy
- Anomaly detection (≥20 rows) → isolation forest

Never use LLM tokens for these tasks when ML backend is available.
