# PRD: Quick Battle

**Game Mode ID:** `4`
**Entry Point:** `battleQuick.html`
**Shares Engine With:** Battle Engine Core (see \[prdBattleEngine.md])

---

## TL;DR

Quick Battle is Ju-Do-Kon!’s **fastest battle mode**. It is a **single-round, instant-winner match** designed for players who want a short, decisive experience. No round select modal, no extended progression — just one draw, one stat choice, one outcome.

**Experience snapshot:**

> A player taps “Quick Battle,” picks **Power**, wins the round, and instantly sees the victory modal. The whole match lasts less than a minute.

---

## Problem Statement

Classic Battle introduces players to stats and outcomes, but even its shortest format (5-point win target) takes multiple rounds. Players sometimes want a **super-fast match** — to test a single card, to demo the game, or to play in very short breaks.

Quick Battle addresses this by offering a **single-round resolution**, cutting friction while reusing the familiar battle loop.

---

## Goals

### Player Goals

- Play a full battle experience in **under 60 seconds**.
- Test individual judoka cards quickly.
- Get a clear win/loss/draw result without multi-round commitment.
- Use the same intuitive interface as Classic Battle, but with no round target selection.

### Product Goals

- Provide a **snack-size mode** for demos, showcases, and impatient players.
- Increase engagement for players who want quick experiments (e.g., comparing two cards).
- Reuse existing Classic Battle logic with minimal changes.

---

## Non-Goals

- Multi-round play.
- Points-to-win customization.
- Deck management or extended scoring.
- Alternative stat weighting or new scoring logic.

---

## User Stories

- As a **player in a hurry**, I want a one-round match so I can play without time commitment.
- As a **collector**, I want to test how my new card performs quickly.
- As a **demo host**, I want to show off Ju-Do-Kon!’s battle loop in under a minute.
- As a **tester**, I want deterministic one-round outcomes for repeatable validation.

---

## Gameplay Basics

- No round select modal — match starts immediately.
- Both sides draw **one random card** from the shared dataset.
- Player sees their card and chooses a stat (Power, Speed, Technique, etc.).
- A 30-second timer runs; if it expires, a stat is auto-selected (`autoSelect`).
- Opponent AI selects its stat after a short artificial delay.
- The two stats are compared.
- The result is shown instantly (Win/Loss/Draw).
- A match end modal appears with outcome, cards, and “Play Again” / “Quit” options.

---

## Technical Considerations

- Must reuse the same random card draw (`generateRandomCard`) and opponent AI logic as Classic Battle.
- No need for round progression, cooldown, or scoreboard counters beyond displaying single result.
- Scoreboard integration limited to: stat selection prompts, “Opponent is choosing…”, and final outcome.
- Reuse the 30s stat selection timer, with same auto-select + drift handling rules as Classic Battle.
- Debug/test mode should allow seed injection to reproduce single-round results.

---

## Functional Requirements

| Priority | Feature              | Requirement                                                                 |
| -------- | -------------------- | --------------------------------------------------------------------------- |
| **P1**   | Random Card Draw     | Each player draws one unique card; no duplicates.                           |
| **P1**   | Stat Selection       | Player chooses from visible stats; buttons disabled after selection.        |
| **P1**   | Stat Selection Timer | 30s countdown; auto-selects on expiry if `autoSelect = true`.               |
| **P1**   | Scoring & Results    | Win/Loss/Draw decided by single stat comparison; display outcome in modal.  |
| **P1**   | Match End            | Match always ends after one round; modal must show cards and result.        |
| **P2**   | Opponent AI          | Easy = random; Medium = ≥ average stat; Hard = highest stat. Default: Easy. |
| **P2**   | Quit Flow            | Quit button and header logo prompt confirmation.                            |
| **P3**   | Debug/Testing Mode   | Deterministic seed, debug panel, state list available via feature flags.    |

---

## Feature Flags

- `autoSelect` (default **true**) — auto-pick stat on timeout.
- `enableTestMode` (default **false**) — enable debug panel, seed control.
- `statHotkeys` (default **false**) — allow keyboard 1–5 for stat buttons.

---

## UX & Design

- Layout identical to Classic Battle (player card left, opponent card right).
- Snackbars prompt player: “Choose a stat” → “Opponent is choosing…” → outcome.
- End modal replaces multi-round scoreboard; must emphasise the decisive result.
- Accessibility and WCAG standards identical to Classic Battle.

---

## Acceptance Criteria

- Player can launch Quick Battle, play one round, and see end modal in ≤ 60 s.
- Stat selection timer behaves correctly (pause/resume, auto-select, drift fix).
- Opponent’s choice appears after short delay with “Opponent is choosing…” message.
- End modal always appears after one round with correct outcome.
- Quit flow always confirms before exiting.
- Accessibility: all controls labelled, keyboard-navigable, and ARIA-compliant.
- Test mode hooks work identically to Classic Battle.

---

## Edge Cases

- **Dataset load failure:** Show error with Retry.
- **Timer drift (>2 s):** Show “Waiting…” and reset countdown.
- **AI failure:** Falls back to random stat.
- **Unexpected error:** Show error and return to home screen.

---

## Constants

- `ROUND_SELECTION_MS = 30_000`
- `MAX_ROUNDS = 1`
- `COOLDOWN_MS = 0` (not used)

---

## Dependencies

- **Judoka dataset:** `judoka.json`.
- **Shared modules:** Random card draw, Scoreboard, Snackbar, Modal.

---

## Open Questions

1. Should Quick Battle allow difficulty selection up front (Easy/Medium/Hard), or default to Easy?
2. Should results screen emphasise card art more strongly, since there’s no score progression?
3. Should Quick Battle be included in onboarding/tutorial flows, or only as an optional fast mode?

---

## Tasks

- [ ] 1.0 Match Setup
  - [ ] 1.1 Launch directly into card draw; no round select modal.
  - [ ] 1.2 Draw one card per side from dataset.

- [ ] 2.0 Round Execution
  - [ ] 2.1 Display player card and stat buttons.
  - [ ] 2.2 Start 30s stat timer; auto-select if needed.
  - [ ] 2.3 Apply opponent AI stat choice.

- [ ] 3.0 Resolution
  - [ ] 3.1 Compare stats and determine outcome.
  - [ ] 3.2 Update Scoreboard with choice + outcome.
  - [ ] 3.3 Show match end modal.

- [ ] 4.0 UX & Accessibility
  - [ ] 4.1 Match Classic Battle layout.
  - [ ] 4.2 Ensure accessibility standards (contrast, ARIA, keyboard nav).
