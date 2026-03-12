---
name: api_development
triggers: ["API", "endpoint", "route", "REST", "HTTP", "GET", "POST", "PUT", "DELETE", "PATCH", "request", "response", "JSON", "fetch", "axios", "Express", "middleware", "CORS", "authentication", "authorization", "status code", "error handling", "validation", "body parser", "query param", "path param", "header"]
parent: development
token_budget: 430
---

# API Development Skill

## Purpose
Guide the creation and modification of API endpoints in the Travel Planner Express server (`src/server.ts`) and the corresponding frontend fetch calls in `public/app.js`.

## Express Server Patterns

### Adding a New Endpoint
```typescript
// src/server.ts

// GET endpoint
app.get('/api/my-endpoint', (_req, res) => {
  res.json({ data: 'value' });
});

// POST endpoint with body validation
app.post('/api/my-endpoint', (req, res) => {
  const { field1, field2 } = req.body as { field1: string; field2?: number };

  if (!field1 || typeof field1 !== 'string') {
    return res.status(400).json({ error: 'field1 is required and must be a string' });
  }

  // process...
  res.json({ result: 'success', field1 });
});
```

### Error Handling Middleware
```typescript
// Add after all routes
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

### Request Logging
```typescript
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

## TypeScript Types for API

### Define Request/Response Types
```typescript
// src/types.ts

export interface PlanRequest {
  query: string;
  variant: 'control' | 'clair';
  task_type?: string;
}

export interface PlanResponse {
  variant: 'control' | 'clair';
  response: string;
  tokens_used: number;
  skills_loaded: string[];
  tokens_saved_vs_full_load: number;
  savings_percent: string;
  task_type?: string;
}

export interface AbStats {
  total_events: number;
  control: { count: number; avg_tokens: number };
  clair: { count: number; avg_tokens: number };
  estimated_savings: number;
  savings_percent: string;
  events: AbEvent[];
}
```

## Frontend Fetch Patterns

### Basic Fetch with Error Handling
```javascript
// public/app.js

async function callApi(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Usage:
const data = await callApi('/api/plan', {
  method: 'POST',
  body: JSON.stringify({ query, variant }),
});
```

### Fetch with Timeout
```javascript
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}
```

## Current API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/variant` | Assign A/B variant |
| POST | `/api/plan` | Process query, return token metrics |
| GET | `/api/ab-stats` | Aggregated A/B statistics |
| GET | `/api/export` | Export events as JSON (to be added) |
| DELETE | `/api/reset` | Clear A/B events (to be added) |

## Adding Export Endpoint
```typescript
// src/server.ts
app.get('/api/export', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ab-events-${Date.now()}.json"`);
  res.json({ exported_at: new Date().toISOString(), events: abEvents });
});
```

## Adding Reset Endpoint
```typescript
app.delete('/api/reset', (_req, res) => {
  const count = abEvents.length;
  abEvents.length = 0; // clear in-place
  res.json({ message: `Cleared ${count} events` });
});
```

## HTTP Status Codes Reference
| Code | Meaning | When to use |
|------|---------|-------------|
| 200 | OK | Successful GET/POST |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected error |

## CORS Configuration
```typescript
// Allow all origins (development)
app.use(cors());

// Restrict to specific origin (production)
app.use(cors({ origin: 'https://your-domain.com' }));
```
