---
name: ui_debugging
triggers: ["debug", "error", "broken", "not working", "fix", "issue", "bug", "crash", "undefined", "null", "TypeError", "console", "inspect", "devtools", "network", "CORS", "404", "500", "blank screen", "white screen", "layout broken", "style not applying", "event not firing", "click not working", "state not updating"]
parent: development
token_budget: 440
---

# UI Debugging Skill

## Purpose
Systematic approach to diagnosing and fixing UI bugs in the Travel Planner application. Covers browser DevTools usage, common React/TypeScript errors, and network debugging.

## Debugging Workflow

### Step 1: Reproduce Reliably
- Identify exact steps to reproduce
- Note browser, OS, screen size
- Check if it's intermittent or consistent
- Test in incognito (no extensions)

### Step 2: Isolate the Problem
```
UI Bug
├── Visual/Layout issue → Check CSS, computed styles, box model
├── Interaction issue → Check event listeners, state, props
├── Data issue → Check API response, parsing, state management
└── Console error → Read the stack trace, find the source file
```

### Step 3: Use Browser DevTools

**Elements Panel**
- Inspect computed styles vs applied styles
- Check for overridden CSS rules (strikethrough)
- Verify DOM structure matches expected HTML

**Console Panel**
- Filter by Errors/Warnings
- Use `console.table()` for arrays/objects
- Set breakpoints with `debugger;` statement

**Network Panel**
- Check request/response for API calls
- Verify Content-Type headers
- Look for CORS errors (red entries)
- Check payload and response body

**React DevTools**
- Inspect component tree and props
- Check state values in real-time
- Profile renders to find performance issues

## Common Travel Planner Bugs

### "Plan" button does nothing
```javascript
// Check: is the form submit handler attached?
document.getElementById('plan-form')?.addEventListener('submit', handler);
// Check: is the button type="submit" inside the form?
// Check: is there a JavaScript error preventing execution?
```

### Stats not refreshing
```javascript
// Check: is /api/ab-stats returning 200?
// Check: is the response JSON valid?
// Check: is the DOM element ID correct?
const el = document.getElementById('stats-content'); // must exist
```

### Variant badge not showing
```javascript
// Check: localStorage.getItem('ab_variant') — is it set?
// Check: is the CSS class being applied correctly?
el.className = `variant-badge ${variant}`; // variant must be 'control' or 'clair'
```

### Token metrics showing 0
- Check server response: `data.tokens_used` must be a number
- Verify manifest.json is being loaded correctly
- Check skill file paths exist on disk

## TypeScript Errors

### "Property does not exist on type"
```typescript
// Wrong:
const data = await res.json();
console.log(data.tokens_used); // TS doesn't know the shape

// Right:
interface PlanResponse {
  tokens_used: number;
  skills_loaded: string[];
}
const data = await res.json() as PlanResponse;
```

### "Cannot read properties of undefined"
- Add optional chaining: `data?.tokens_used`
- Add null checks before accessing nested properties
- Ensure async data is loaded before rendering

## CSS Debugging

### Layout not as expected
1. Add `outline: 1px solid red` to suspect elements
2. Check `display`, `position`, `z-index`
3. Verify flexbox/grid parent properties
4. Check for `overflow: hidden` clipping content

### Styles not applying
1. Check selector specificity (use DevTools computed tab)
2. Verify CSS file is linked in HTML
3. Check for typos in class names
4. Look for `!important` overrides

## Network Debugging

### API calls failing
```bash
# Test endpoint directly:
curl -X POST http://localhost:3003/api/plan \
  -H "Content-Type: application/json" \
  -d '{"query": "flights to Paris", "variant": "clair"}'
```

### CORS errors
- Ensure `cors()` middleware is applied in Express before routes
- Check `Access-Control-Allow-Origin` header in response
