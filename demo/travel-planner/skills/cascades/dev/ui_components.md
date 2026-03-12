---
name: ui_components
triggers: ["component", "button", "form", "input", "modal", "card", "layout", "render", "UI", "interface", "widget", "dropdown", "checkbox", "radio", "toggle", "tab", "accordion", "tooltip", "popover", "badge", "chip", "avatar", "icon", "image", "list", "table", "grid", "flex", "responsive"]
parent: development
token_budget: 480
---

# UI Components Skill

## Purpose
Guide the creation, modification, and composition of UI components in the Travel Planner application. This skill covers React/TSX component patterns, accessibility, and reusable component design.

## Component Patterns

### Functional Components (TSX)
```tsx
// Preferred pattern: typed props, named export
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const ActionButton: React.FC<ButtonProps> = ({
  label, onClick, variant = 'primary', disabled = false
}) => (
  <button
    className={`btn btn-${variant}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    {label}
  </button>
);
```

### Form Components
- Always use controlled inputs with `value` + `onChange`
- Validate on blur, not on every keystroke
- Show inline error messages below the field
- Use `aria-describedby` to link errors to inputs

### Modal / Dialog
- Trap focus inside modal when open
- Close on Escape key and backdrop click
- Use `role="dialog"` and `aria-modal="true"`
- Restore focus to trigger element on close

### Card Components
```tsx
interface TripCardProps {
  destination: string;
  dates: string;
  imageUrl?: string;
  onSelect: (destination: string) => void;
}
```

## Styling Conventions
- Use CSS custom properties (variables) for theming
- BEM naming: `.block__element--modifier`
- Mobile-first breakpoints: 480px, 768px, 1024px
- Dark mode: use `prefers-color-scheme` media query

## Accessibility Checklist
- [ ] All interactive elements are keyboard-navigable
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Images have descriptive `alt` text
- [ ] Form fields have associated `<label>` elements
- [ ] Focus indicators are visible

## Common Pitfalls
- Avoid inline styles for layout; use CSS classes
- Don't use `div` for clickable elements — use `button` or `a`
- Avoid `!important` in CSS; refactor specificity instead
- Don't mutate props; always use state or callbacks

## Travel Planner Specific Components
- `SearchBar`: destination input with autocomplete
- `DateRangePicker`: departure/return date selection
- `TripCard`: summary card for a planned trip
- `SkillBadge`: shows which CLAIR skills were loaded
- `TokenMeter`: visual token usage indicator
- `VariantBadge`: A/B test variant indicator
