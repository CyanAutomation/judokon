# PRD: Team Battle (Female)

## TL;DR

Compete in 5-on-5 matches using all-female teams, giving women-focused events their own dedicated mode.  
_Mode is identical to its [male counterpart](prdTeamBattleMale.md) except for the allowed gender (female only)._

**Game Mode ID:** teamBattleFemale (URL: teamBattleFemale.html)

---

## Goals

- Provide a dedicated 5v5 battle format for female judoka.

## User Stories

- As a competitor, I want matches to follow an ordered lineup so results feel organized.
- As an organizer, I need automatic gender checks to enforce fairness.
- As a casual player, I want the win screen to show my team’s victory clearly.

## Functional Requirements

- FR-1 (P1): Confirm all chosen judoka are female before starting a match.
- FR-2 (P1): Play five sequential bouts, one for each team member.
- FR-3 (P1): End the contest when one side reaches 5 points.

## Acceptance Criteria

- Gender validation blocks invalid team members.
- On-screen queue shows who fights next.
- Win animation triggers at 5 points.

## Non-Goals

- Advanced online matchmaking systems.

## Dependencies

- Uses the common Team Battle ruleset for scoring.
- Matches call `generateRandomCard` as described in [prdDrawRandomCard.md](prdDrawRandomCard.md).

---

## Related Features

- See also: [PRD: Team Battle (Male)](prdTeamBattleMale.md) for the counterpart mode.
- Entry point: [PRD: Team Battle Selection](prdTeamBattleSelection.md) screen.

---

[Back to Game Modes Overview](prdGameModes.md)
