# Update Judoka

Game Mode ID: updateJudoka (URL: updateJudoka.html)

[Back to Game Modes Overview](prdGameModes.md)

## Goals

- Allow players to refine stats and appearance over time.

## User Stories

## Functional Requirements

- Judoka list loads from dataset.
- Edits persist after save.
- Field validation enforces legal stat limits.
- If selected judoka is missing, display retry prompt.

## Acceptance Criteria

- Edits save correctly and persist on reload.

## Non-Goals

- Full version history of edits.

## Dependencies

- Same storage used by the creation screen.

## Open Questions

- Should we lock edits once a judoka enters ranked play?
