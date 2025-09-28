# PRD: Team Battle Selection

---

## TL;DR

Simple menu that lets players quickly choose Male, Female, or Mixed modes for team battles (**selection screen loads ≤500 ms**).

**Game Mode ID:** `2`
**URL:** `teamBattleSelection.html`

This selection screen is the gateway to the three Team Battle modes:

- [PRD: Team Battle (Male)](prdTeamBattleMale.md)
- [PRD: Team Battle (Female)](prdTeamBattleFemale.md)
- [PRD: Team Battle (Mixed)](prdTeamBattleMixed.md)

---

## Goals

- Guide players to choose the correct team battle format.

## Non-Goals

- Team management or roster editing beyond mode choice.

---

## User Stories

- As a new player, I want simple buttons so I can pick Male, Female or Mixed quickly (**≤2 taps**).
- As a returning player, I want my previous choice highlighted so selection feels familiar.
- As a keyboard user, I want focus order to follow the menu layout so navigation is predictable.

---

## Functional Requirements

- **FR-1 (P1):** Display three buttons for Male, Female and Mixed.
- **FR-2 (P1):** Selecting a button routes to the matching team battle mode.
- **FR-3 (P2):** If an invalid route is attempted, return to the selection screen.

---

## Acceptance Criteria

- All buttons are clickable and keyboard accessible.
- Correct mode loads after selection.
- Invalid routes fall back gracefully.

---

## Design and UX Considerations

- Display three large buttons horizontally (or vertically on mobile) labeled "Male", "Female", and "Mixed".
- Highlight the last selected mode if available.
- Ensure all buttons are accessible by keyboard (tab order matches visual order).
- Buttons must have a minimum touch target size of 44px. See [UI Design Standards](../prdDevelopmentStandards.md#accessibility--ux-expectations).
- Use clear, high-contrast colors for button text and backgrounds.
- Provide visible focus indicators for keyboard navigation.
- The layout should be responsive and visually centered on the page.

---

## Dependencies

- Navigation Map must link to this screen.

---

## Open Questions

- **Pending:** Decide whether the last chosen mode should persist between sessions.

---

[Back to Game Modes Overview](prdGameModes.md)
