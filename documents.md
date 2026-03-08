---
name: documents
domain: document_creation
token_budget: 380
triggers: ["document", "word", "pdf", "presentation", "pptx", "report", "write", "draft"]
loads_children_when:
  docx: "word|docx|\\.docx|word document"
  pdf: "pdf|\\.pdf|portable"
  pptx: "pptx|powerpoint|slides|presentation|deck"
mcp_dependencies: ["filesystem"]
---

# Document Creation Domain

## Core Principles

- Always ask for output format if ambiguous (docx / pdf / pptx / markdown)
- Match tone to context: formal for reports, conversational for memos
- Use section headers, tables, and lists judiciously — not by default
- Always confirm filename and destination before writing

## Output Format Decision Tree

```
Is this a presentation with multiple slides? → load pptx cascade
Is this a structured document for sharing/printing? → load docx or pdf cascade
Is this a quick written piece? → markdown is fine, no cascade needed
```

## Cascade Instructions

After loading this skill, check which cascade to load:

- Output is `.docx` / Word document → read `skills/cascades/documents/docx.md`
- Output is `.pdf` → read `skills/cascades/documents/pdf.md`
- Output is `.pptx` / slides / deck → read `skills/cascades/documents/pptx.md`

Only load ONE cascade — the one matching the requested output format.

## File Handling

Always write output files to `/mnt/user-data/outputs/` and present them with the `present_files` tool.
