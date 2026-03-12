---
name: ui_styling
triggers: ["style", "CSS", "color", "theme", "dark mode", "light mode", "font", "typography", "spacing", "padding", "margin", "border", "shadow", "animation", "transition", "hover", "focus", "active", "responsive", "mobile", "breakpoint", "gradient", "background", "opacity", "visibility", "z-index", "overflow", "scroll", "flex", "grid", "align", "justify", "gap"]
parent: development
token_budget: 420
---

# UI Styling Skill

## Purpose
Guide CSS and visual design changes in the Travel Planner application. Covers the existing CSS custom property system, responsive design, and animation patterns.

## CSS Architecture

### Custom Properties (Variables)
The app uses CSS custom properties defined in `:root`:
```css
:root {
  --bg: #0f1419;          /* Page background */
  --surface: #1a2332;     /* Card/panel background */
  --text: #e6edf3;        /* Primary text */
  --muted: #8b949e;       /* Secondary text */
  --accent: #58a6ff;      /* Interactive elements */
  --success: #3fb950;     /* Positive metrics */
  --control: #f0883e;     /* Control variant color */
  --clair: #a371f7;       /* CLAIR variant color */
}
```

**To change a color globally**: update the variable in `:root`, not individual selectors.

### Adding New Variables
```css
:root {
  /* existing vars... */
  --warning: #d29922;
  --error: #f85149;
  --border: #30363d;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

## Layout Patterns

### Flexbox (current layout)
```css
/* Horizontal row, centered */
.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

/* Vertical stack */
form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
```

### Responsive Design
```css
/* Mobile first */
.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 900px;
  }
}
```

## Component Styling Patterns

### Buttons
```css
/* Primary button */
button {
  padding: 0.6rem 1.25rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

button:hover { opacity: 0.9; }
button:active { transform: scale(0.98); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Secondary/outline button */
.btn-outline {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
}
```

### Cards / Panels
```css
.card {
  padding: 1.25rem;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid #30363d;
  transition: border-color 0.2s ease;
}

.card:hover {
  border-color: var(--accent);
}
```

### Badges / Tags
```css
.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success { background: rgba(63, 185, 80, 0.15); color: var(--success); }
.badge-warning { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
.badge-error   { background: rgba(248, 81, 73, 0.15);  color: var(--error); }
```

## Animations & Transitions

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.result {
  animation: fadeIn 0.25s ease forwards;
}
```

### Loading Spinner
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--muted);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### Progress Bar
```css
.progress-bar {
  height: 4px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s ease;
}
```

## Dark Mode Considerations
The app is dark-mode by default. If adding light mode:
```css
@media (prefers-color-scheme: light) {
  :root {
    --bg: #ffffff;
    --surface: #f6f8fa;
    --text: #1f2328;
    --muted: #656d76;
  }
}
```

## Typography Scale
```css
h1 { font-size: 1.75rem; font-weight: 700; }
h2 { font-size: 1.25rem; font-weight: 600; }
h3 { font-size: 1rem;    font-weight: 600; }
p  { font-size: 1rem;    line-height: 1.6; }
small { font-size: 0.85rem; }
```
