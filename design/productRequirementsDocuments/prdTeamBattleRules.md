# PRD: Team Battle Rules

---

## TL;DR

Base rule set for Team Battle modes. Teams fight in a series of 1v1 bouts with points awarded per bout. The first team to reach the team-size score wins.

---

## Problem Statement

Players enjoy forming teams of favorite judoka, but rules vary between modes and lack a single source of truth. Inconsistent scoring and win conditions confuse newcomers and shorten play sessions. This document defines core rules so every Team Battle behaves predictably.

---

## Goals

- Provide one authoritative rule set for all Team Battle modes.
- Keep average match duration under **10 minutes**.
- Ensure scoring is calculated consistently across modes.

---

## User Stories

- As a player, I want my team to fight one judoka at a time so I can plan the order strategically.
- As a competitor, I want a clear win condition so I know when the match is over.
- As a developer, I want shared logic that other Team Battle PRDs can inherit.

---

## Overview of Match Flow

- Each team arranges its judoka in a fixed order before the match starts.
- Fighters face off one at a time in sequential 1v1 bouts.
- A bout uses the same comparison logic as Classic Battle: each side draws a card using `generateRandomCard()` and compares the chosen stat.
- The winning side earns **one point**. The next judoka in each lineup then competes.
- The process repeats until one team earns points equal to the number of judoka on its roster.

---

## Scoring and Win Conditions

- Default team size is five members (Male and Female modes) or six members (Mixed mode).
- Teams score one point per victorious bout.
- The first team to score the full team-size total wins the match.
- If a bout ends in a tie, no point is awarded and the next fighters compete.

---

## Prioritized Functional Requirements

| Priority | Feature              | Description                                               |
| -------- | -------------------- | --------------------------------------------------------- |
| **P1**   | Team Setup           | Players arrange judoka order before the match begins.     |
| **P1**   | Sequential 1v1 Bouts | Fighters battle in order, one bout at a time.             |
| **P1**   | Point Scoring        | Winning a bout grants the team one point.                 |
| **P1**   | Match End Condition  | First team to reach the team-size score wins.             |
| **P2**   | Tie Handling         | Tie rounds award no points and the next fighters compete. |
| **P2**   | Early Quit Option    | Player may forfeit the match before completion.           |

---

## Acceptance Criteria

- Players can arrange their team order before the match starts.
- Each bout compares the selected stats and awards a point to the winner.
- The match ends immediately once a team reaches its required score.
- Tied bouts result in no point change and proceed to the next fighters.
- If a player quits early, the match records a loss for that player.

---

## Non-Functional Requirements

- Match flow updates in real time with **≤200 ms** input latency.
- UI maintains **≥60 fps** during card animations.

---

## Dependencies

- Reuses the 1v1 logic defined in [PRD: Classic Battle](prdBattleClassic.md).
- Relies on the shared `generateRandomCard` helper for drawing each judoka card.

---

## Shared Open Questions

- **Pending:** Decide whether team size can be customized or will stay fixed at 5 (Male/Female) or 6 (Mixed).
- **Pending:** If customization is allowed, determine the tie-handling logic for odd totals.

---

[Back to Game Modes Overview](prdGameModes.md)
