---
name: development
triggers: ["implement", "build", "add feature", "change", "update", "modify", "refactor", "fix", "debug", "button", "UI", "component", "style", "CSS", "layout", "form", "input", "click", "event", "state", "render", "display", "show", "hide", "toggle", "animate", "responsive", "mobile", "TypeScript", "JavaScript", "React", "Express", "API", "endpoint", "route", "server", "frontend", "backend", "fullstack"]
children: ["ui_components", "ui_debugging", "ui_styling", "button_interaction", "state_management", "api_development"]
mcp_dependencies: ["filesystem", "bash_exec"]
token_budget: 460
---

# Development Domain Skill

## Purpose
This skill guides software development tasks for the Travel Planner application. It covers frontend (HTML/CSS/JS/TSX), backend (Node.js/Express/TypeScript), and full-stack development patterns.

## Project Stack

| Layer | Technology | Files |
|-------|-----------|-------|
| Frontend | HTML5, CSS3, Vanilla JS | `public/index.html`, `public/styles.css`, `public/app.js` |
| Backend | Node.js, Express, TypeScript | `src/server.ts`, `src/clair.ts`, `src/types.ts` |
| Build | TypeScript compiler (`tsc`) | `tsconfig.json` |
| Config | dotenv | `.env` |

## Development Workflow

### Making Frontend Changes
1. Edit files in `public/` directly (no build step needed)
2. Refresh browser to see changes
3. Use browser DevTools for live CSS editing

### Making Backend Changes
1. Edit files in `src/`
2. Run `npm run build` to compile TypeScript
3. Restart server: `npm start` or `npm run dev` (auto-reload)

### Adding a New Feature
```
1. Define the data shape in src/types.ts
2. Add the API endpoint in src/server.ts
3. Update the frontend in public/app.js to call the endpoint
4. Update the UI in public/index.html and public/styles.css
5. Test with curl or browser
```

## Code Quality Standards

### TypeScript
- Use explicit types for function parameters and return values
- Prefer `interface` over `type` for object shapes
- Use `const` by default; `let` only when reassignment is needed
- Handle errors with try/catch in async functions

### CSS
- Use CSS custom properties for all colors and spacing
- Mobile-first responsive design
- BEM naming convention for new classes

### JavaScript (Frontend)
- Use `async/await` over `.then()` chains
- Always handle fetch errors with try/catch
- Validate user input before sending to API

## Common Development Tasks

### Add a new button
1. Add `<button>` element to `index.html`
2. Add click handler in `app.js`
3. Style in `styles.css`
→ Load cascade: `ui_components`, `button_interaction`

### Fix a visual bug
1. Open DevTools → Elements
2. Inspect computed styles
3. Edit CSS in `styles.css`
→ Load cascade: `ui_debugging`, `ui_styling`

### Add a new API endpoint
1. Define route in `src/server.ts`
2. Add TypeScript types in `src/types.ts`
3. Call from frontend in `public/app.js`
→ Load cascade: `api_development`

### Fix a JavaScript error
1. Read the console error message
2. Find the source file and line number
3. Apply fix and test
→ Load cascade: `ui_debugging`

### Update component styling
1. Identify the CSS class in DevTools
2. Modify in `styles.css`
3. Test across screen sizes
→ Load cascade: `ui_styling`

## Testing
```bash
# Manual API test
curl http://localhost:3003/api/ab-stats

# Build check
npm run build

# Run dev server
npm run dev
```

## File Modification Safety
- Always back up before major refactors
- Test API endpoints with curl before updating frontend
- Keep CSS changes scoped to specific components
- Use TypeScript strict mode to catch errors early
