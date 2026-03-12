---
name: button_interaction
triggers: ["button", "click", "submit", "handler", "event listener", "onclick", "addEventListener", "form submit", "action", "interaction", "press", "tap", "trigger", "callback", "disabled", "loading state", "spinner", "debounce", "throttle"]
parent: development
token_budget: 380
---

# Button Interaction Skill

## Purpose
Guide the implementation of button interactions, event handling, and user action patterns in the Travel Planner application.

## Button Patterns

### Basic Click Handler
```javascript
// Vanilla JS (public/app.js)
document.getElementById('my-button').addEventListener('click', async (e) => {
  e.preventDefault(); // prevent form submission if inside a form
  // handle click
});
```

### Form Submit Handler
```javascript
document.getElementById('plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('query').value.trim();
  if (!query) return; // validate before proceeding

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; // prevent double-submit
  btn.textContent = 'Planning...';

  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variant }),
    });
    const data = await res.json();
    // handle response
  } catch (err) {
    console.error('Request failed:', err);
    // show error to user
  } finally {
    btn.disabled = false;
    btn.textContent = 'Plan'; // restore original text
  }
});
```

### Toggle Button
```javascript
let isExpanded = false;

document.getElementById('toggle-btn').addEventListener('click', () => {
  isExpanded = !isExpanded;
  const panel = document.getElementById('expandable-panel');
  panel.classList.toggle('hidden', !isExpanded);
  document.getElementById('toggle-btn').textContent = isExpanded ? 'Collapse' : 'Expand';
  document.getElementById('toggle-btn').setAttribute('aria-expanded', isExpanded);
});
```

### Copy to Clipboard Button
```javascript
document.getElementById('copy-btn').addEventListener('click', async () => {
  const text = document.getElementById('result-text').textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
});
```

### Export / Download Button
```javascript
document.getElementById('export-btn').addEventListener('click', () => {
  const data = JSON.stringify(abEvents, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ab-test-results-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
```

## Loading States

### Button Loading Pattern
```javascript
function setButtonLoading(btn, isLoading, loadingText = 'Loading...') {
  btn.disabled = isLoading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = isLoading ? loadingText : btn.dataset.originalText;
}
```

### CSS for Loading State
```css
button.loading {
  position: relative;
  color: transparent; /* hide text */
}

button.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

## Debouncing & Throttling

### Debounce (search input)
```javascript
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const handleSearch = debounce((query) => {
  // only fires 300ms after user stops typing
  fetchSuggestions(query);
}, 300);

document.getElementById('query').addEventListener('input', (e) => {
  handleSearch(e.target.value);
});
```

## Keyboard Interactions

### Enter key to submit
```javascript
document.getElementById('query').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('plan-form').dispatchEvent(new Event('submit'));
  }
});
```

### Escape key to close/cancel
```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});
```

## Accessibility for Buttons
- Use `<button>` not `<div>` for clickable elements
- Add `aria-label` when button text is ambiguous (e.g., icon-only buttons)
- Use `aria-pressed` for toggle buttons
- Use `aria-expanded` for expand/collapse buttons
- Ensure focus is visible (don't remove `outline` without replacement)
