# CLAIR A/B Test — Travel Planner (Extended)

This document describes the A/B test setup for measuring **token savings** when using CLAIR (Cascaded Lazy AI Routing) vs. loading all skills upfront. The test has been extended to include realistic **software development tasks** (UI changes, debugging, button interactions, styling, state management, API development) in addition to the original travel-planning queries.

## Overview

| Variant | Description | Token behavior |
|---------|-------------|----------------|
| **Control (A)** | Full context load | All 15 skills from the manifest are loaded upfront. Simulates traditional MCP behavior. |
| **CLAIR (B)** | Lazy routing | Only the router (~280 tokens) + skills matching the user query are loaded. |

## Hypothesis

CLAIR reduces token consumption by loading only relevant skills per request, leading to significant savings compared to full-load baselines. This benefit holds across diverse development task types, not just travel-planning queries.

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd "path/to/demo/travel-planner"
npm install
```

### Build & Run

```bash
npm run build
npm start
```

Or for development:

```bash
PORT=3003 npm run dev
```

The app runs at **http://localhost:3003**.

## How the A/B Test Works

1. **Assignment**: On first visit, each user is randomly assigned to Control (A) or CLAIR (B). Assignment is stored in `localStorage` and persists across sessions.

2. **Queries**: Users enter queries — travel-related OR development-related (UI changes, debugging, etc.).

3. **Task category detection**: The server automatically classifies each query into one of 7 task categories using keyword matching.

4. **Token simulation**:
   - **Control**: Loads all 15 skill files (9,930 tokens baseline).
   - **CLAIR**: Loads router (280 tokens) + only the skill files whose triggers match the query.

5. **Logging**: Each request is logged with `variant`, `query`, `task_category`, `tokens_used`, `skills_loaded`, and savings metrics.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/variant` | GET | Returns a random A/B variant for assignment. |
| `/api/plan` | POST | Accepts `{ query, variant }`, returns simulated response and token metrics. |
| `/api/ab-stats` | GET | Returns aggregated A/B statistics with per-category breakdown. |
| `/api/export` | GET | Downloads all A/B events as JSON. |
| `/api/reset` | DELETE | Clears all A/B events (for re-running tests). |

## Metrics

- **Tokens used**: Simulated token cost per request (based on actual skill file sizes).
- **Skills loaded**: List of skill IDs loaded for that request.
- **Full-load baseline**: Total tokens if all skills were loaded (9,930 tokens).
- **Tokens saved vs full load**: Difference between full-load baseline and actual tokens used.
- **Savings %**: Percentage reduction when using CLAIR vs. control.
- **Per-category breakdown**: Average tokens and skills loaded per task category.

## Manifest & Skills (15 skills, 9,930 tokens total)

### Travel Domain
- **Travel** domain skill (420 tokens): `travel`, `trip`, `vacation`, `destination`, `itinerary`, `plan`, `book`, `visit`, `explore`
- **Flights** cascade (350 tokens): `flight`, `fly`, `airline`, `airport`, `booking`
- **Accommodation** cascade (340 tokens): `hotel`, `accommodation`, `stay`, `lodging`, `airbnb`
- **Itinerary** cascade (380 tokens): `itinerary`, `day`, `schedule`, `activities`, `sightseeing`
- **Transport** cascade (320 tokens): `transport`, `car`, `rental`, `train`, `bus`, `metro`
- **Dining** cascade (300 tokens): `restaurant`, `food`, `dining`, `eat`, `cuisine`
- **Family** cascade (360 tokens): `family`, `kids`, `children`, `baby`, `toddler`
- **Nature** cascade (340 tokens): `nature`, `hiking`, `outdoor`, `park`, `beach`, `wildlife`

### Development Domain (NEW)
- **Development** domain skill (460 tokens): `implement`, `build`, `fix`, `debug`, `button`, `UI`, `component`, `style`, `CSS`, `API`, `endpoint`
- **UI Components** cascade (480 tokens): `component`, `button`, `form`, `input`, `modal`, `card`, `layout`, `render`
- **UI Debugging** cascade (440 tokens): `debug`, `error`, `broken`, `not working`, `TypeError`, `CORS`, `404`, `500`
- **UI Styling** cascade (420 tokens): `style`, `CSS`, `color`, `theme`, `animation`, `transition`, `hover`, `responsive`
- **Button Interaction** cascade (380 tokens): `click`, `submit`, `handler`, `addEventListener`, `callback`, `debounce`
- **State Management** cascade (400 tokens): `state`, `localStorage`, `refresh`, `reset`, `reactive`, `persist`
- **API Development** cascade (430 tokens): `API`, `endpoint`, `route`, `fetch`, `Express`, `middleware`, `validation`

## Task Categories

| Category | Example queries |
|----------|----------------|
| `travel_planning` | "Plan a trip to Tokyo with flights and hotel" |
| `ui_change` | "Redesign the result card to show a token savings progress bar" |
| `button_interaction` | "Add a copy-to-clipboard button for the result response text" |
| `debugging` | "CORS error when calling /api/plan from the frontend" |
| `styling` | "Add a dark/light mode toggle using CSS custom properties" |
| `state_management` | "The localStorage variant assignment is not persisting across page refreshes" |
| `api_development` | "Add a GET /api/export endpoint to download all A/B events as JSON" |

## Running the Test

1. Open http://localhost:3003 in a browser.
2. Note your variant badge (A: Control or B: CLAIR).
3. Submit queries from different task categories using the example buttons or type your own.
4. Use "Refresh stats" to see aggregated A/B metrics with per-category breakdown.
5. For a more robust test, use multiple browsers/incognito sessions to get both variants.

### Automated Simulation

```powershell
# Run the full 50-task simulation
powershell -ExecutionPolicy Bypass -File simulate.ps1
```

## Actual Results (from simulation)

| Category | Control tokens | CLAIR tokens | Savings | Savings % | Control skills | CLAIR skills |
|----------|---------------|-------------|---------|-----------|---------------|-------------|
| travel_planning | 9,930 | 1,283 | 8,647 | **87.1%** | 15 | 3.5 |
| general | 9,930 | 559 | 9,371 | **94.4%** | 15 | 2.0 |
| state_management | 9,930 | 2,902 | 7,028 | **70.8%** | 15 | 3.3 |
| api_development | 9,930 | 3,023 | 6,907 | **69.6%** | 15 | 3.5 |
| ui_change | 9,930 | 3,090 | 6,840 | **68.9%** | 15 | 4.1 |
| debugging | 9,930 | 3,140 | 6,790 | **68.4%** | 15 | 4.0 |
| button_interaction | 9,930 | 4,361 | 5,569 | **56.1%** | 15 | 5.0 |
| **OVERALL** | **9,930** | **2,719** | **7,211** | **72.6%** | **15.0** | **3.8** |

## Related

- **CLAIR lazy skill loading** (`../CLAIR lazy skill loading/`) — Source project for routing logic.
- **RFC-CLAIR** — Formal CLAIR protocol proposal in the CLAIR project.
- **REPORT.md** — Full end-to-end impact report with per-task detail and analysis.
