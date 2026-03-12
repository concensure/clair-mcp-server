# Travel Planner — CLAIR A/B Test Demo

> **This is a demo project** included with the CLAIR repository to demonstrate the token savings achieved by CLAIR (Cascaded Lazy AI Routing) in a realistic development scenario.

## What This Demo Shows

This Travel Planner web application was used as the test subject for a controlled A/B experiment comparing:

- **Control (A)**: Traditional full-context load — all 15 skills loaded upfront (9,930 tokens per request)
- **CLAIR (B)**: Lazy routing — only the router (~280 tokens) + skills matching the query

The test covered **7 task categories** reflecting real-world development work:
- Travel planning queries
- UI component changes
- Button/event interactions
- Debugging tasks
- CSS/styling changes
- State management
- API development

## Key Results

| Metric | Value |
|--------|-------|
| Overall token reduction | **72.6%** |
| Control avg tokens/request | **9,930** |
| CLAIR avg tokens/request | **2,719** |
| Control skills loaded | **15 (always)** |
| CLAIR skills loaded | **3.8 (avg)** |
| Best category (travel) | **87.1% savings** |
| Worst category (button interaction) | **56.1% savings** |

Real LLM API calls (OpenRouter) confirmed the file-size estimates:
- Control: 9,740 real prompt tokens (vs 9,930 estimated)
- CLAIR travel query: 328 real prompt tokens (vs 559 estimated)

See [`REPORT.md`](./REPORT.md) for the full end-to-end impact report.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env and add your OpenRouter API key (optional — works without it using simulated responses)
npm run build
npm start
```

Open **http://localhost:3003** in your browser.

## Running the Simulation

```powershell
# Run the full 50-task A/B simulation
powershell -ExecutionPolicy Bypass -File simulate.ps1
```

## Project Structure

```
demo/travel-planner/
├── manifest.json          # 15 skills (travel + development domains)
├── public/
│   ├── index.html         # UI with task type chips and example queries
│   ├── styles.css         # Dark theme with token bar and stats table
│   └── app.js             # Frontend logic
├── skills/
│   ├── domains/
│   │   ├── travel.md      # Travel domain skill
│   │   └── development.md # Development domain skill (NEW)
│   └── cascades/
│       ├── travel/        # 7 travel cascade skills
│       └── dev/           # 6 development cascade skills (NEW)
├── src/
│   ├── server.ts          # Express server + real LLM integration
│   ├── clair.ts           # CLAIR routing logic
│   └── types.ts           # TypeScript interfaces
├── simulate.ps1           # 50-task automated simulation
├── AB_TEST.md             # A/B test setup and methodology
└── REPORT.md              # Full end-to-end impact report
```

## Related

- **CLAIR MCP Server** — the main project in the parent directory
- **RFC-CLAIR** — formal protocol proposal (`../../RFC-CLAIR.md`)
- **CLAIR A/B Test Report** — [`REPORT.md`](./REPORT.md)
