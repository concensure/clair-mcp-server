---
name: coding
domain: code_general
token_budget: 420
triggers: ["code", "function", "implement", "bug", "refactor", "script", "debug", "build"]
loads_children_when:
  python: "python|\\.py|django|flask|fastapi|pandas|numpy|pip"
  typescript: "typescript|javascript|\\.ts|\\.js|node|react|next|npm"
  testing: "test|spec|coverage|jest|pytest|unit test|integration"
mcp_dependencies: ["filesystem", "bash_exec"]
---

# Code Generation Domain

## Core Principles

- Write production-grade code: typed, tested, documented
- Prefer idiomatic patterns for the target language
- Never write code longer than 100 lines without offering to split into modules
- Always verify file exists before editing; always show diffs for edits

## Cascade Loading

Detect language from task context, then load exactly ONE language cascade:

- Python task → read `skills/cascades/coding/python.md`
- TypeScript/JavaScript task → read `skills/cascades/coding/typescript.md`

If tests are needed, additionally load `skills/cascades/coding/testing.md`.

## Error Handling

- Always include try/catch or equivalent
- Log errors to stderr, not stdout
- Return meaningful error messages

## File Operations

- Read files before editing with `view` tool
- Write code to `/home/claude/` first, test, then move to outputs
- Use `str_replace` for targeted edits, `create_file` for new files
