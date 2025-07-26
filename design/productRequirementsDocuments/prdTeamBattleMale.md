# PRD: Team Battle (Male)

---

## TL;DR

This mode inherits the base rules from [PRD: Team Battle Rules](prdTeamBattleRules.md). It provides a male-only version of Team Battle.

**Game Mode ID:** `4`
**URL:** `teamBattleMale.html`

---

## Problem Statement

Players often request a competition focused exclusively on male judoka. Without a dedicated mode, they must filter manually each match. This PRD defines the male-only variant built on the shared Team Battle rules.

---

## Goals

- Offer a straightforward 5‑vs‑5 male format.
- Use the same scoring and pacing as the other Team Battle modes.

---

## User Stories

- As a player, I want to select only male judoka for my team so the match feels authentic.
- As a developer, I want this mode to leverage the base Team Battle logic.

---

## Prioritized Functional Requirements

| Priority | Feature               | Description                                                    |
|:--------:|:---------------------|:---------------------------------------------------------------|
| **P1**   | Male Roster Only     | Restrict team selection to judoka marked as male.              |
| **P1**   | Fixed Team Size      | Each team contains exactly 5 judoka.                           |
| **P1**   | Base Rule Inheritance| Follow all rules in [PRD: Team Battle Rules](prdTeamBattleRules.md). |
| **P2**   | Early Quit Allowed   | Player may forfeit the match early.                            |

---

## Acceptance Criteria

- Only male judoka can be chosen when forming a team.
- A match ends when one team scores 5 points.
- All other behavior matches the base Team Battle Rules.
- Quitting early records a loss for the quitting player.

---

## Non-Functional Requirements

- Match flow updates with **≤200 ms** latency.
- Maintain **≥60 fps** during battle animations.

---

## Mode-Specific Details

- Allowed gender: **male only**
- Team size: **5 judoka per team**

---

## Related Features

- [PRD: Team Battle (Female)](prdTeamBattleFemale.md)
- [PRD: Team Battle (Mixed)](prdTeamBattleMixed.md)
- Entry point: [PRD: Team Battle Selection](prdTeamBattleSelection.md)

---

[Back to Game Modes Overview](prdGameModes.md)
