# PRD: Team Battle (Mixed)

## TL;DR

Enables mixed-gender teams to face off, encouraging varied rosters and strategic diversity.  
_Mixed mode uses six judoka per team (instead of five) to allow for equal representation of genders and to align with international mixed team judo formats._

**Game Mode ID:** teamBattleMixed (URL: teamBattleMixed.html)

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
- Team size customization is a shared open question across all Team Battle modes (Male, Female, Mixed).
- Once resolved, update all relevant PRDs to reflect the decision for consistency.

---

## Related Features

- See also: [PRD: Team Battle (Male)](prdTeamBattleMale.md) and [PRD: Team Battle (Female)](prdTeamBattleFemale.md) for single-gender team modes.
- Entry point: [PRD: Team Battle Selection](prdTeamBattleSelection.md) screen.

---

[Back to Game Modes Overview](prdGameModes.md)
