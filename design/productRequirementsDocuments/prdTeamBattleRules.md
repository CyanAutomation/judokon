# PRD: Team Battle Rules

## TL;DR

Base rule set for Team Battle modes. Teams fight in a series of 1v1 bouts with points awarded per bout. The first team to reach the team-size score wins.

---

## Overview of Match Flow

- Each team arranges its judoka in a fixed order before the match starts.
- Fighters face off one at a time in sequential 1v1 bouts.
- A bout uses the same comparison logic as Classic Battle: each side draws a card using `generateRandomCard()` and compares the chosen stat.
- The winning side earns **one point**. The next judoka in each lineup then competes.
- The process repeats until one team earns points equal to the number of judoka on its roster.

## Scoring and Win Conditions

- Default team size is five members (Male and Female modes) or six members (Mixed mode).
- Teams score one point per victorious bout.
- The first team to score the full team-size total wins the match.
- If a bout ends in a tie, no point is awarded and the next fighters compete.

## Dependencies

- Reuses the 1v1 logic defined in [PRD: Classic Battle](prdClassicBattle.md).
- Relies on the shared `generateRandomCard` helper for drawing each judoka card.

## Shared Open Questions

- **Pending:** Decide whether team size can be customized or will stay fixed at 5 (Male/Female) or 6 (Mixed).
- **Pending:** If customization is allowed, determine the tie-handling logic for odd totals.

---

[Back to Game Modes Overview](prdGameModes.md)
