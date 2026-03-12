---
name: travel
domain: travel_planning
token_budget: 420
triggers: ["travel", "trip", "vacation", "destination", "itinerary", "plan", "book", "visit", "explore"]
loads_children_when:
  flights: "flight|fly|airline|airport|booking"
  accommodation: "hotel|stay|lodging|airbnb|accommodation"
  itinerary: "itinerary|day|schedule|activities"
  transport: "transport|car|rental|transfer|transit"
  dining: "restaurant|food|dining|eat|cuisine"
  family: "family|kids|children|baby|toddler"
  nature: "nature|hiking|outdoor|park|beach"
mcp_dependencies: ["web_search"]
---

# Travel Planning Domain

## Core Principles

- Always clarify destination, dates, and group composition before making recommendations.
- Consider budget constraints and travel style (luxury, budget, adventure, relaxation).
- Prioritize safety and accessibility based on traveler profile.
- Provide options with pros/cons rather than single recommendations.

## Planning Workflow

1. **Gather requirements**: destination, dates, travelers, budget, preferences
2. **Identify sub-tasks**: flights, accommodation, activities, transport
3. **Load relevant cascades**: Only load child skills that match the query
4. **Synthesize**: Combine recommendations into a coherent plan

## Output Format

- Use clear sections: Overview, Flights, Accommodation, Itinerary, Tips
- Include estimated costs where possible
- Add booking links or search suggestions
- Mention visa/health requirements for international travel
