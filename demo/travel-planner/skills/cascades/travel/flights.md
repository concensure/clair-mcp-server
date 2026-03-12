---
name: flights
parent: travel
triggers: ["flight", "fly", "airline", "airport", "booking"]
token_budget: 350
---

# Flight Booking Skill

## When to Use

Load this skill when the user mentions flights, flying, airlines, airports, or booking air travel.

## Guidelines

- Compare direct vs connecting flights; mention layover duration for connections.
- Consider baggage allowances (carry-on, checked) for budget airlines.
- Check family-friendly policies: infant lap seats, bassinet availability, pre-boarding.
- Suggest best booking windows (typically 2–3 months for international).
- Mention alternative airports if they save money or time.

## Key Questions to Ask

- One-way or round-trip?
- Flexible dates? (cheaper mid-week often)
- Any loyalty programs or preferred airlines?
- Special needs: wheelchair, extra legroom, dietary?

## Output Format

| Flight | Departure | Arrival | Duration | Price |
|--------|-----------|---------|----------|-------|
| ...    | ...       | ...     | ...      | ...   |

Include total price, baggage info, and booking link suggestions.
