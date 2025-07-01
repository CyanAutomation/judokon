# PRD: Team Battle Selection

**Game Mode ID:** teamBattleSelection (URL: teamBattleSelection.html)

---

## Goals

- Guide players to choose the correct team battle format.

## User Stories

- As a new player, I want simple buttons so I can pick Male, Female or Mixed quickly.
- As a returning player, I want my previous choice highlighted so selection feels familiar.
- As a keyboard user, I want focus order to follow the menu layout so navigation is predictable.

## Functional Requirements

- FR-1 (P1): Display three buttons for Male, Female and Mixed.
- FR-2 (P1): Selecting a button routes to the matching team battle mode.
- FR-3 (P2): If an invalid route is attempted, return to the selection screen.

## Acceptance Criteria

- All buttons are clickable and keyboard accessible.
- Correct mode loads after selection.
- Invalid routes fall back gracefully.

## Non-Goals

- Team management or roster editing beyond mode choice.

## Dependencies

- Navigation Map must link to this screen.

## Open Questions

- Should the last chosen mode be saved between sessions?

## Metadata

- **Author:** Game Design Team
- **Last Edited:** 2025-06-29

[Back to Game Modes Overview](prdGameModes.md)