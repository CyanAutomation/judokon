# PRD: Classic Battle

**Game Mode ID:** `1`  
**Entry Point:** `battleClassic.html`  
**Shares Engine With:** Battle Engine Core (see [prdBattleEngine.md](prdBattleEngine.md))

---

## TL;DR

Classic Battle is Ju-Do-Kon!’s **introductory head-to-head mode**. It provides a **fast, simple, and rewarding experience** for new players, teaching them how stats drive outcomes while keeping matches short and replayable.

**Experience snapshot:**

> A new player draws her first card. She chooses _Speed_, wins the round, and sees her score tick up. Within minutes, she has learned how stats matter, feels successful, and wants to play again.

---

## Problem Statement

New players need a **low-stakes, easy-to-grasp battle mode** to understand the game’s core loop (draw → choose stat → compare → score). Without it, early retention suffers: players get overwhelmed in complex modes, feel confused, and abandon the game.

Classic Battle solves this by being:

- **Fast** — match start ≤ 5 s after mode selection.
- **Accessible** — guided UI, clear feedback, and generous timers.
- **Engaging** — short matches (≤ 3 min) with visible progress and a satisfying end condition.

**Player feedback example:**

> “I don’t know which stat to pick. I feel like I’ll lose if I guess wrong.” — Playtest participant, age 9

**Baseline Retention Data (for context):**  
Currently, only ~45% of new players complete their first battle across all modes. The target is to raise this to ≥70% completion via Classic Battle.

---

## Goals

### Player Goals

- Quick, intuitive battles with **clear rules**.
- Learn how judoka stats influence outcomes.
- See immediate, readable **round results** and **score updates**.
- Matches short enough to play in a break (≤ 3 min).
- Ability to **quit early** without penalty or confusion.

### Product Goals

- ≥ 70% of new players complete one Classic Battle in their first session.
- Increase new-user retention by offering a safe practice mode.
- ≥ 40% of players replay Classic Battle within their first session (measurable replayability metric).

---

## Non-Goals

- Online multiplayer.
- Customizable timers or win conditions beyond 5/10/15 points.
- Alternate rulesets, stat weighting, or advanced scoring.

---

## User Stories

- As a **new player**, I want a simple battle mode so I can **learn without pressure**.
- As a **child**, I want colorful, exciting round feedback so I stay engaged.
- As a **player with limited motor control**, I want enough time (30 s) to pick a stat.
- As a **tester**, I want a predictable sequence of states I can hook into.
- As a **player in a hurry**, I want to quit at any point without confusion.

---

## Gameplay Basics

- On first visit to `battleJudoka.html`, a modal prompts the player to select a win target of **5, 10, or 15 points** (default 10). After a choice is made, the modal closes and the match begins.
- The standard deck contains **99 unique cards**.
- Each match begins with both sides receiving **25 random cards**.
- At the start of each round, both players draw their top card.
- The player selects one stat (Power, Speed, Technique, etc.).
- Stat buttons stay disabled until the selection phase and turn off after a choice is made.
- The higher value wins the round and scores **1 point**; used cards are discarded.
- The match ends when a player reaches a **user-selected win target of 5, 10, or 15 points** (default 10) or after **25 rounds** (draw).

---

## Technical Considerations

- Classic Battle logic must reuse shared random card draw module (`generateRandomCard`).
- Orchestrator initialization preloads timer utilities and UI services, builds the state handler map, then attaches listeners before exposing the machine.
- Round selection modal must use shared `Modal` and `Button` components for consistent accessibility.
- Card reveal and result animations should use hardware-accelerated CSS for smooth performance on low-end devices.
- Stat selection timer (30s) must be displayed in `#next-round-timer`; if the timer expires, a random stat is auto-selected. This auto-select behavior is controlled by a feature flag `autoSelect` (enabled by default). The timer must pause if the game tab is inactive or device goes to sleep, and resume on focus (see prdBattleScoreboard.md).
- Stat selection timer halts immediately once the player picks a stat.
- Detect timer drift by comparing engine state with real time; if drift exceeds 2s, display "Waiting…" and restart the countdown.
- Opponent stat selection runs entirely on the client. After the player picks a stat (or the timer auto-chooses), the opponent's choice is revealed after a short artificial delay to mimic turn-taking.
- During this delay, the Scoreboard displays "Opponent is choosing..." in `#round-message` to reinforce turn flow.
- The cooldown timer between rounds begins only after round results are shown in the Scoreboard and is displayed using one persistent snackbar that updates its text each second.
- The debug panel is available when the `enableTestMode` feature flag is enabled, appears above the player and opponent cards, and includes a copy button for exporting its text.
- A battle state progress list can be enabled via the `battleStateProgress` feature flag to show the sequence of match states beneath the battle area. The list pre-populates from `data-battle-state` and remaps interrupt states to their nearest core state. Disabled by default.

### Round Data Fallback

- Round options are sourced from `battleRounds.js` and bundled with the app.
- **QA:** Validate that options from `battleRounds.js` render correctly.

---

## Functional Requirements

| Priority | Feature                | Requirement                                                                                      |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| **P1**   | Random Card Draw       | Each player draws one unique card per round. No duplicates within a round.                       |
| **P1**   | Stat Selection         | Player chooses from visible stats; buttons disabled after selection.                             |
| **P1**   | Stat Selection Timer   | 30 s countdown; auto-selects on expiry if `autoSelect = true`. Pauses on tab sleep/inactivity.   |
| **P1**   | Scoring & Results      | +1 point for win, 0 for tie/loss; update `#score-display`. Show “You picked: X” + outcome.       |
| **P1**   | End Conditions         | End when player reaches target (5/10/15) or after 25 rounds.                                     |
| **P1**   | Scoreboard Integration | Use shared Scoreboard component for all messages, counters, timers, and accessibility.           |
| **P2**   | Opponent AI            | Difficulty settings: Easy = random; Medium = ≥ average stat; Hard = highest stat. Default: Easy. |
| **P2**   | Quit Flow              | Quit button and header logo prompt confirmation; if confirmed, end match and return home.        |
| **P2**   | Next Button            | Skips cooldown/timer when pressed; otherwise auto-progress after timer ends.                     |
| **P3**   | Debug/Testing Mode     | With `enableTestMode`, expose debug panel, seed injection, and state progress list.              |

---

## Feature Flags

- `autoSelect` (default **true**) — auto-pick stat on timeout. (Player-facing default)
- `battleStateProgress` (default **false**) — show state progress list. (Developer/testing only)
- `enableTestMode` (default **false**) — enable debug panel, seed control. (Developer/testing only)
- `statHotkeys` (default **false**) — allow keyboard 1–5 for stat buttons. (Optional player-facing)
- `skipRoundCooldown` (default **false**) — bypass inter-round cooldown. (Developer/testing only)

---

## UX & Design

- **Layout:** Player card left, opponent card right, stat buttons central (stacked on narrow screens).
- **Color coding:** Player (blue), Opponent (red).
- **Feedback:** Snackbars for prompts (“Choose a stat”), selections (“You picked: Power”), and countdowns.
- **Accessibility:**
  - WCAG ≥ 4.5:1 contrast.
  - Touch targets ≥ 44px.
  - Keyboard-navigable controls and quit confirmation.
  - Stat buttons include `aria-describedby` with short descriptions.
  - Scoreboard regions use `role="status"` and `aria-live="polite"`.
- **Audio Feedback (Optional, TBD):** Short sound cues for score updates and round outcomes to reinforce feedback.
- **Wireframes:**
  - Card layout with scoreboard at top.
  - Player card (left) and Opponent card (right).
  - Stat buttons centered below player card.
  - Snackbars appear at bottom of screen for prompts and results.

---

## Acceptance Criteria

- Player can start and finish a match with default settings in ≤ 3 min.
- Stat selection timer behaves correctly: counts down, pauses/resumes, auto-selects if expired.
- Opponent’s stat selection shows after delay with message “Opponent is choosing…”.
- Round outcomes update Scoreboard immediately (Win/Loss/Draw, compared values, updated score).
- Quit flow always confirms before exiting.
- End modal always appears at win target or after 25 rounds, displaying correct results.
- If 25 rounds are reached without a winner, modal must still display correctly.
- All interactive elements meet accessibility standards (labels, focus, ARIA roles).
- Debug/test mode exposes deterministic hooks without affecting normal play.
- **Accessibility-specific:**
  - Given a player uses a screen reader, when a stat button receives focus, then its name and description are read aloud.
  - Given a player uses keyboard only, when tabbing through buttons, then all stat buttons and quit flows are reachable.
  - Given a visually impaired player, when viewing player/opponent cards, then contrast ratio ≥ 4.5:1 is maintained.

---

## Edge Cases

- **Dataset load failure:** Error shown with Retry option.
- **Timer drift (> 2 s):** Show “Waiting…” and reset countdown.
- **Simultaneous inputs:** First valid stat input wins; subsequent ignored.
- **AI failure:** Falls back to random stat.
- **Unexpected error:** Roll back to last completed round and show error message.

---

## Constants

- `ROUND_SELECTION_MS = 30_000`
- `MAX_ROUNDS = 25`
- `POINTS_TO_WIN_OPTIONS = [5, 10, 15]`
- `DEFAULT_POINTS_TO_WIN = 10`
- `COOLDOWN_MS = 3_000`

---

## Dependencies

- **Judoka dataset:** `judoka.json` (excluding hidden cards).
- **Shared modules:** Random card draw (`generateRandomCard`), Scoreboard, Snackbar, Modal.
- **Mystery Card:** see [prdMysteryCard.md](prdMysteryCard.md).

---

## Open Questions

1. Should win target choice persist across sessions, or reset each time?
2. Should difficulty setting for AI be exposed to players or reserved for debug/testing?
3. Do we want optional sound effects (e.g., for score updates) in Classic Battle?

---

## Tasks

- [ ] 1.0 Match Setup
  - [ ] 1.1 Implement points-to-win selection (5/10/15 with default 10).
  - [ ] 1.2 Randomly draw 25 unique cards per player from `judoka.json`.
  - [ ] 1.3 Ensure no duplicates within a round.
  - [ ] 1.4 Integrate deck draw with shared Random Card Draw module.

- [ ] 2.0 Round Loop
  - [ ] 2.1 Display top card for player; opponent card hidden.
  - [ ] 2.2 Implement 30s stat selection timer (`ROUND_SELECTION_MS`).
  - [ ] 2.3 Add auto-select fallback if timer expires (`autoSelect` flag).
  - [ ] 2.4 Integrate opponent AI stat choice (Easy/Medium/Hard).

- [ ] 3.0 Resolution
  - [ ] 3.1 Compare stats, assign point, update `#score-display`.
  - [ ] 3.2 Show “You picked: X” and round outcome in Scoreboard.
  - [ ] 3.3 Reveal opponent choice after short delay.

- [ ] 4.0 Cooldown
  - [ ] 4.1 Implement 3s cooldown between rounds.
  - [ ] 4.2 Add “Next” button to skip cooldown or auto-progress.
  - [ ] 4.3 Respect `skipRoundCooldown` flag.

- [ ] 5.0 Match End
  - [ ] 5.1 End game when player reaches target points or 25 rounds.
  - [ ] 5.2 Show modal with winner, score, “Play Again” / “Quit” options.
  - [ ] 5.3 Implement quit confirmation flow (quit button + header logo).

- [ ] 6.0 Accessibility & UX
  - [ ] 6.1 Ensure color contrast ≥ 4.5:1.
  - [ ] 6.2 Set all interactive elements to ≥ 44px touch targets.
  - [ ] 6.3 Add `aria-describedby` for stat buttons.
  - [ ] 6.4 Mark scoreboard as `role="status"` with `aria-live="polite"`.
  - [ ] 6.5 Keyboard navigation for all stat buttons and quit flow.
