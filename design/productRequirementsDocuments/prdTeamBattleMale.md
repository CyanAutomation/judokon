# PRD: Team Battle (Male)

## TL;DR

Provides a male-only team battle format, mirroring the female mode for gender-specific tournaments.  
_Mode is identical to its [female counterpart](prdTeamBattleFemale.md) except for the allowed gender (male only)._

**Game Mode ID:** teamBattleMale (URL: teamBattleMale.html)

---

## Goals

- Provide a dedicated 5v5 battle format for male judoka.

## User Stories

- As a competitor, I want matches limited to male judoka so the contest is fair.
- As a strategist, I need each round to follow a fixed order so planning matters.
- As a spectator, I want a clear score display so I can track which team is ahead.

## Functional Requirements

- FR-1 (P1): Confirm all chosen judoka are male and ensure each team has exactly five members before starting a match.
- FR-2 (P1): Play five sequential bouts, one for each team member.
- FR-3 (P1): End the contest when one side reaches 5 points.

## Acceptance Criteria

- Gender validation blocks invalid team members.
- On-screen queue shows who fights next.
- Win animation triggers at 5 points.

## Non-Goals

- Ranked online tournaments.

## Dependencies

- Relies on the base Team Battle ruleset for scoring and rounds.
- Matches call `generateRandomCard` as described in [prdDrawRandomCard.md](prdDrawRandomCard.md).

## Open Questions

- Should Male mode permit custom team sizes or stick to five members?

## Related Features

- See also: [PRD: Team Battle (Female)](prdTeamBattleFemale.md) for the counterpart mode.

---

[Back to Game Modes Overview](prdGameModes.md)
