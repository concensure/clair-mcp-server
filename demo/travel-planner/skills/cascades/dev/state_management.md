---
name: state_management
triggers: ["state", "store", "data flow", "update state", "reactive", "re-render", "variable", "global state", "local state", "cache", "persist", "localStorage", "sessionStorage", "sync", "async state", "loading", "error state", "success state", "reset", "clear", "refresh"]
parent: development
token_budget: 400
---

# State Management Skill

## Purpose
Guide state management patterns in the Travel Planner application. The app uses vanilla JavaScript with module-level variables and localStorage for persistence.

## Current State Architecture

```javascript
// public/app.js — module-level state
let currentVariant = null;    // 'control' | 'clair' | null
let isLoading = false;        // prevents concurrent requests
let lastResult = null;        // last API response

// Persisted state (localStorage)
// Key: 'ab_variant' — Value: 'control' | 'clair'
```

## State Patterns

### Initializing State on Page Load
```javascript
(async () => {
  // 1. Restore persisted state
  const variant = await ensureVariant();
  renderVariantBadge(variant);

  // 2. Load initial data
  await refreshStats();

  // 3. Set up event listeners
  setupEventListeners();
})();
```

### Loading State Pattern
```javascript
async function fetchWithLoadingState(fetchFn, loadingEl) {
  loadingEl.classList.add('loading');
  try {
    return await fetchFn();
  } finally {
    loadingEl.classList.remove('loading');
  }
}
```

### Optimistic Updates
```javascript
// Show result immediately, then confirm with server
function submitQuery(query) {
  // 1. Show optimistic UI
  showPendingResult(query);

  // 2. Make actual request
  fetch('/api/plan', { method: 'POST', body: JSON.stringify({ query }) })
    .then(res => res.json())
    .then(data => updateResult(data))
    .catch(err => showError(err));
}
```

### Resetting State
```javascript
function resetApp() {
  currentVariant = null;
  lastResult = null;
  localStorage.removeItem('ab_variant');

  // Reset UI
  document.getElementById('result').classList.add('hidden');
  document.getElementById('query').value = '';
  document.getElementById('variant-badge').textContent = '';
  document.getElementById('variant-badge').className = 'variant-badge';
}
```

## localStorage Patterns

### Safe Read/Write
```javascript
function getStoredVariant() {
  try {
    const val = localStorage.getItem('ab_variant');
    return (val === 'control' || val === 'clair') ? val : null;
  } catch {
    return null; // localStorage may be unavailable (private browsing)
  }
}

function setStoredVariant(variant) {
  try {
    localStorage.setItem('ab_variant', variant);
  } catch {
    // Silently fail — app still works without persistence
  }
}
```

### Storing Complex Data
```javascript
function saveResults(results) {
  try {
    localStorage.setItem('ab_results', JSON.stringify(results));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Clear old data and retry
      localStorage.removeItem('ab_results');
    }
  }
}

function loadResults() {
  try {
    const raw = localStorage.getItem('ab_results');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```

## Event-Driven State Updates

### Custom Events for State Changes
```javascript
// Dispatch custom event when state changes
function updateVariant(variant) {
  currentVariant = variant;
  setStoredVariant(variant);
  document.dispatchEvent(new CustomEvent('variantChanged', { detail: { variant } }));
}

// Listen for state changes
document.addEventListener('variantChanged', (e) => {
  renderVariantBadge(e.detail.variant);
});
```

## Error State Management

### Error Display Pattern
```javascript
function showError(message, containerId = 'result') {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="error-message" role="alert">
      <strong>Error:</strong> ${escapeHtml(message)}
      <button onclick="this.parentElement.remove()">Dismiss</button>
    </div>
  `;
  container.classList.remove('hidden');
}

function clearError(containerId = 'result') {
  const el = document.querySelector(`#${containerId} .error-message`);
  el?.remove();
}
```

## Stats State

### Polling for Live Stats
```javascript
let statsInterval = null;

function startStatsPolling(intervalMs = 5000) {
  if (statsInterval) return; // already polling
  statsInterval = setInterval(refreshStats, intervalMs);
}

function stopStatsPolling() {
  clearInterval(statsInterval);
  statsInterval = null;
}

// Start polling when user is active
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopStatsPolling();
  } else {
    startStatsPolling();
  }
});
```

## State Debugging Tips
- Log state changes: `console.log('[state]', { currentVariant, isLoading })`
- Use React DevTools or browser DevTools → Application → Local Storage
- Add a debug panel: `document.getElementById('debug').textContent = JSON.stringify(state, null, 2)`
