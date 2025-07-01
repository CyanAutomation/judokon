# Classic Battle

Game Mode ID: classicBattle (URL: battleJudoka.html)

[Back to Game Modes Overview](prdGameModes.md)

## Goals

- Deliver a quick head‑to‑head mode for new players.
- Encourage replay through a simple scoring system.

## User Stories

## Functional Requirements

- Draw one random card from each deck per round.
- Player selects a stat to compare.
- Higher stat wins; score increases by one.
- End match on 10 points or after 25 rounds.

## Acceptance Criteria

- Cards are revealed in correct sequence.
- Player can select stat.
- Score updates per round outcome.
- Summary screen shown at end.

## Non-Goals

- Online multiplayer battles.

## Dependencies

- Judoka dataset loaded from `judoka.json`.

## Open Questions

- Will difficulty levels change AI stat selection?
