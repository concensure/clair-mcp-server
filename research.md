---
name: research
domain: research
token_budget: 290
triggers: ["research", "search", "find", "summarize", "compare", "explain", "what is"]
loads_children_when: {}
mcp_dependencies: ["web_search"]
---

# Research Domain

## Core Principles

- Search before answering for anything that could have changed since knowledge cutoff
- Use 1–3 searches for simple facts; 5–10 for comparative or deep research
- Paraphrase sources — never reproduce 15+ words verbatim
- Cite all claims derived from search results

## Search Strategy

1. Start broad (1–3 word query), inspect results
2. Narrow with specific terms if needed
3. Use `web_fetch` on promising URLs for full content
4. Cross-reference 2+ sources for disputed facts

## ML Offload for Research Tasks

If the research task involves processing a corpus of text the user provides:
- Language detection across documents → `clair_offload: language_detection`
- Deduplication → `clair_offload: text_similarity`
- Entity extraction at scale → `clair_offload: named_entity_extraction`

## Output Format

- Conversational responses: prose, no headers, inline citations
- Structured reports: headers allowed, still prose-first
- Never bullet-point everything — write in sentences
