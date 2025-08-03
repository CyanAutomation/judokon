# Card Inspector PRD (Revised)

## Overview (TL;DR)

The Card Inspector is a developer/debugging feature in JU-DO-KON! that allows users to view the raw JSON data of a judoka card directly within the UI. It is toggled via a switch in the Settings page and is intended to aid development, QA, and advanced user troubleshooting without disrupting gameplay.

## Problem Statement / Why It Matters

Developers and testers need a fast, in-context method to inspect the underlying data for each judoka card to verify correctness, debug issues, and validate data binding. Currently, they rely on time-consuming, error-prone workflows like DOM inspection or console logging, which slows down iteration and increases QA errors.

## Goals / Success Metrics

- Enable users to toggle Card Inspector from the Settings page with a toggle latency of **<300ms**.
- Display JSON data for 100% of judoka cards in rendered views, formatted and collapsed by default.
- Render JSON panels with zero frame drops and **≤100ms additional rendering time** per card.
- Ensure the inspector never overlaps with primary UI elements or gameplay interactions.
- Guarantee that Card Inspector is hidden by default in production unless explicitly enabled by QA/dev settings.

## User Stories

- As a developer, I want to see JSON data for each card, so I can debug and validate data integrity.
- As a QA tester, I want to verify card UI matches backend data without external tools.
- As an advanced user, I want transparency into the game data for troubleshooting and learning.

## Prioritized Functional Requirements

| Priority | Feature                      | Description                                                                  |
| -------- | ---------------------------- | ---------------------------------------------------------------------------- |
| P1       | Inspector Toggle in Settings | Add a toggle to enable/disable the Card Inspector in `settings.html`.       |
| P1       | Inspector Panel on Card      | Each card displays a JSON panel when inspector is enabled.                  |
| P2       | Inspector Panel Collapsible  | Panel is collapsed by default; user can expand via a disclosure widget.     |
| P2       | Inspector Panel Styling      | Styled with non-interfering border, monospace font, and scroll support.     |
| P3       | Dev-Only Visibility Mode     | Feature hidden in production unless explicitly enabled in `devMode=true`.   |

## Acceptance Criteria

- [ ] Card Inspector toggle appears in Settings with a label and visual ON/OFF state.
- [ ] Toggling setting enables/disables inspector without page reload.
- [ ] Inspector appears collapsed by default on every judoka card.
- [ ] Panel contains formatted, valid JSON reflecting card data.
- [ ] Panel expands/collapses on user interaction (`<details>` or equivalent).
- [ ] JSON panel never overlaps or blocks core gameplay elements.
- [ ] Inspector does not appear unless setting is ON **and** `devMode=true` is enabled.

## Non-Functional Requirements / Design Considerations

- Must be **keyboard accessible**, screen-reader navigable, and follow WCAG contrast standards.
- Must maintain 60fps rendering and ≤100ms render delay per card.
- Must have robust error handling for malformed or null card data.
- Use visually distinct but unobtrusive styling (e.g., light gray panel with monospace font).
- Must scale gracefully across devices (desktop, tablet, mobile).

## Edge Cases / Failure States

- **Corrupt Card Data:** Show fallback message (“Invalid card data”) instead of JSON.
- **Settings Toggle Fails to Persist:** Log to console and fallback to default (OFF).
- **Malformed JSON:** Use `try/catch` to prevent inspector crash; show `Error parsing data`.
- **Toggle Render Glitch:** Fallback to hard reload via QA console shortcut.
- **Production Flag Not Set:** Panel must remain fully hidden.

## Dependencies and Open Questions

- Depends on `cardBuilder.js` and rendering logic.
- Uses shared settings config via `settings.html`.
- Open Question: Should inspector support a secondary “Markup View” for UI templates?

## Tasks

- [ ] 1.0 Implement Settings Toggle
  - [ ] 1.1 Add a new switch for "Card Inspector" in `settings.html`
  - [ ] 1.2 Store toggle state in user preferences
  - [ ] 1.3 Ensure toggle immediately affects UI without reload

- [ ] 2.0 Display Inspector Panel on Cards
  - [ ] 2.1 Modify `cardBuilder.js` to check for inspector toggle
  - [ ] 2.2 Inject JSON panel into card DOM when enabled
  - [ ] 2.3 Format JSON data with syntax highlighting or indentation

- [ ] 3.0 Make Inspector Panel Collapsible
  - [ ] 3.1 Use `<details>` or similar component for collapse behavior
  - [ ] 3.2 Ensure default collapsed state

- [ ] 4.0 Style and UX Adjustments
  - [ ] 4.1 Apply distinct visual styling to the inspector panel
  - [ ] 4.2 Prevent UI overlap with gameplay elements
  - [ ] 4.3 Ensure inspector is hidden in production builds

- [ ] 5.0 Accessibility and Performance
  - [ ] 5.1 Make inspector keyboard-navigable and screen reader compatible
  - [ ] 5.2 Profile panel performance to avoid render lag
  - [ ] 5.3 Add error handling for invalid/malformed card data

