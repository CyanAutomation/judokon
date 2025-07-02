# PRD: Team Battle (Male)

**Game Mode ID:** teamBattleMale (URL: teamBattleMale.html)

---

## Goals

- Offer a mixed-gender team contest with balanced rules.

## User Stories

- As a player, I want men and women to compete together so I can build varied teams.
- As a strategist, I need each round to follow a fixed order so planning matters.
- As a spectator, I want a clear score display so I can track which team is ahead.

## Functional Requirements

- FR-1 (P1): Support teams of six judoka, any gender allowed.
- FR-2 (P1): Run six sequential 1v1 matches, rotating through the team roster.
- FR-3 (P1): Declare the winner once a team scores 6 points.

## Acceptance Criteria

- Mixed teams can be formed without restriction.
- Match flow shows current fighters and upcoming order.
- Win screen appears when a side reaches 6 points.

## Non-Goals

- Ranked online tournaments.

## Dependencies

- Relies on the base Team Battle ruleset for scoring and rounds.
- Matches call `generateRandomCard` as described in [prdDrawRandomCard.md](prdDrawRandomCard.md).

## Open Questions

- Should Mixed mode permit custom team sizes or stick to six members?

## Metadata

- **Author:** Game Design Team
- **Last Edited:** 2025-06-29

[Back to Game Modes Overview](prdGameModes.md)
