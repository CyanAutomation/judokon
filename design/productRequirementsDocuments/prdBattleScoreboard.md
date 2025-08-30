# Battle Scoreboard PRD

## TL;DR

Displays round messages, stat selection timer, and live match score in the page header so players always know the current battle status. The Scoreboard is responsible only for persistent match and round information: overall score, round number, and state changes (e.g., "Player has selected", "Opponent has won."). It does not display contextual or transient feedback; such messages are handled by the Snackbar (see prdSnackbar.md).

---

### Canonical DOM IDs

The Scoreboard reserves the following DOM IDs for its placeholders so other docs and code can reference them consistently:

- `#round-message` – round outcomes and status messages (outcome messages set `data-outcome="true"` to prevent placeholders like "Waiting…" from overwriting them)
- `#next-round-timer` – stat selection timer
- `#score-display` – player vs opponent score
- `#round-counter` – current round number

---

### API

The Scoreboard exposes functions for updating its displays:

- `updateTimer(seconds)` – render countdown text in `#next-round-timer` or clear it when `seconds <= 0`.

---

## Problem Statement

In battle game modes (e.g. Classic Battle), players have a real need to receive clear visual feedback between or after rounds. Without this info, it will leave users uncertain about match state, leading to confusion, reduced immersion, and increased risk of game abandonment. Players could feel "lost" due to a lack of timely updates about round outcomes, next steps, or overall progress.

---

## Goals

1. **Display match score (player vs opponent)** on the **right side of the top bar** via `#score-display`, updated at the **end of each round**, within **800ms** of score finalization.
2. **Display round-specific messaging** on the **left side of the top bar** via `#round-message`, depending on match state:
   - If a round ends: show **win/loss/result** message briefly.
   - If in stat selection phase: show **a countdown timer** in `#next-round-timer`; if timer expires, auto-select a stat (see [Classic Battle PRD](prdBattleClassic.md)).
   - After the player picks a stat: show **"Opponent is choosing..."** until the opponent's choice is revealed.
   - Snackbars surface selection prompts and next-round countdowns.
3. Ensure all messages are clearly readable, positioned responsively, and maintain usability across devices.
4. Display fallback messages within 500ms of sync failure in `#round-message`.
5. Surface a round counter (`#round-counter`), but not the total number of rounds.
6. **Complement header messaging with a numbered progress bar** beneath the battle area that displays the current state ID in ascending order for clear, accessible progress tracking.

---

## User Stories

- As a player, I want to see my score and my opponent's score updated immediately after each round so I always know the match status.
- As a player, I want to see clear round messages and prompts so I understand what action is needed or what just happened.
- As a player, I want a visible timer during stat selection and round transitions so I know how much time I have left.
- As a player, I want fallback messages if the game loses sync so I am not left confused.
- As a player, I want the Scoreboard to be readable and accessible on any device.

---

## Description

The round message (`#round-message`), timer (`#next-round-timer`), round counter (`#round-counter`), and score (`#score-display`) now sit directly inside the page header rather than in a separate bar. The Scoreboard also displays the stat selection timer (30 seconds by default), and triggers auto-selection if the timer expires, as specified in [Classic Battle PRD](prdBattleClassic.md) and [Random Stat Mode PRD](prdRandomStatMode.md). The timer in `#next-round-timer` must pause if the game tab is inactive or device goes to sleep, and resume on focus (see [Classic Battle PRD](prdBattleClassic.md)).

**Note:** The Scoreboard does not display contextual feedback such as stat selection confirmation, countdowns to next round, or error messages. These are surfaced via the Snackbar component (see prdSnackbar.md).

---

## Functional Requirements

| Priority | Feature                | Description |
| -------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Match Score Display    | Real-time, fast update of player vs opponent score per round via `#score-display` |
| **P1**   | Round Status Messaging | Show clear win/loss messages post-round in `#round-message` |
| **P1**   | Stat Selection Timer   | Display 30s countdown for stat selection in `#next-round-timer`; auto-select if expired; timer pauses/resumes on tab inactivity (see [Classic Battle PRD](prdBattleClassic.md)) |
| **P3**   | Responsive Layout      | Adapt layout for small screens and collapse content as needed |
| **P3**   | Accessibility Features | Ensure text contrast, screen reader compatibility (`role="status"` on `#round-message` and `#next-round-timer`), minimum touch target size, and keyboard navigation for stat, Next, and Quit controls. The **Next** button advances rounds and skips timers (see [Classic Battle PRD](prdBattleClassic.md)) |
| **P2**   | Edge Case Handling     | Fallback messages for backend sync failure and display issues |

Snackbars handle selection prompts and next-round countdowns.

---

## Acceptance Criteria

 - The Scoreboard always displays the current match score (player vs opponent) on the right side of the top bar in `#score-display`, updated within 800ms after round ends.
 - The Scoreboard displays round-specific messages (win/loss/result) on the left side of the top bar in `#round-message`, visible for at least 1s after round end.
 - Snackbars display selection prompts and next-round countdowns.
 - During stat selection, the Scoreboard shows a 30s countdown timer in `#next-round-timer`; if the timer expires, a random stat is auto-selected and a snackbar announces it.
 - The timer in `#next-round-timer` pauses if the tab is inactive or device sleeps, and resumes on focus.
 - After stat selection, the Scoreboard shows "Opponent is choosing..." in `#round-message` until the opponent's choice is revealed.
 - Fallback messages (e.g., "Waiting…") are displayed within 500ms in `#round-message` if backend sync fails or the timer mismatches server start.
 - The Scoreboard adapts responsively to screen size and orientation, stacking or truncating content as needed.
 - All Scoreboard messages and controls (`#round-message`, `#next-round-timer`, `#score-display`, `#round-counter`) meet accessibility standards: minimum contrast ratio 4.5:1, screen reader compatibility (`aria-live`, `role="status"`), minimum 44px touch targets, and keyboard navigation.
- The progress bar beneath the battle area displays the current state ID in ascending order for accessible progress tracking.

---

## Edge Cases / Failure States

- **Score desync between UI and backend** → Fallback to **“Waiting…”** label in `#round-message` if backend sync fails. <!-- Implemented: see Scoreboard.js -->
- **Timer mismatch with server start** → Display **“Waiting…”** in `#next-round-timer` until match is confirmed to start. <!-- Implemented: see Scoreboard.js -->
- **Bar display issues due to screen resolution** → Collapse content into a stacked layout or truncate non-critical info with ellipsis. <!-- Partially implemented: CSS @media queries for stacking/truncation, but some edge cases pending -->
- **Player does not select a stat within 30s** → Auto-select a random stat and display appropriate message (see [Classic Battle PRD](prdBattleClassic.md)). <!-- Implemented: see startRound in battleEngine.js -->
- **Stat selection appears stalled** → Show "Stat selection stalled" message; auto-select a random stat after 5s if no input. <!-- Implemented: see classicBattle.js -->

---

## Design and UX Considerations

- **Layout**
  - Right side: score display in `#score-display` (`Player: X – Opponent: Y`)
  - Two-line score format appears on narrow screens via stacked `<span>` elements (`<span>You: X</span> <span>Opponent: Y</span>`)
  - Left side: rotating status messages in `#round-message` (e.g., "You won!", "Opponent is choosing..."). `#next-round-timer` shows the stat-selection countdown. Include round counter `#round-counter`, but not total rounds.
  - Contextual feedback (e.g., selection prompts, next-round countdowns, error messages) is handled by the Snackbar.
- **Visuals**
  - Font size: `clamp(16px, 4vw, 24px)`; on narrow screens (<375px) `clamp(14px, 5vw, 20px)`.
  - Color coding: green (win), red (loss), neutral grey (countdown).
  - Snackbars slide in/out using fade/translate animations and auto-select feedback remains visible for at least 1s before "Opponent is choosing..." appears.
- **Responsiveness**
  - Stacked layout on narrow screens (<375px width). <!-- Implemented: see battle.css @media (max-width: 374px) -->
- **Accessibility**
  - All text meets **WCAG 2.1 AA** standards. <!-- Contrast: mostly via CSS, but not programmatically checked -->
  - Screen reader labels for dynamic messages using `aria-live="polite"` and `role="status"`.

---

## Tasks

- [x] 1.0 Implement Score Display

  - [x] 1.1 Fetch match score from backend or engine state
  - [x] 1.2 Render score on right side of top bar
  - [x] 1.3 Update score within 800ms after round ends

- [x] 2.0 Implement Round Info Messages

  - [x] 2.1 Display win/loss messages briefly
  - [x] 2.2 Start countdown timer after message disappears
  - [x] 2.3 Display selection prompt via snackbar when input is needed
  - [x] 2.4 Display stat selection timer and auto-select if expired (see [Classic Battle PRD](prdBattleClassic.md))
  - [x] 2.5 Pause/resume stat selection timer on tab inactivity (see battleEngine.js)

- [ ] 3.0 Handle Responsive Layout

  - [x] 3.1 Detect screen width <375px and switch to stacked layout (CSS @media implemented)
  - [ ] 3.2 Truncate or stack content if resolution causes display issues (edge cases, pending)
  - [x] 3.3 Adaptive font sizing for all states (partially via clamp(), may need review) <!-- Implemented: font-size clamp() in battle.css -->
  - [x] 3.4 Handle orientation changes and reflow layout accordingly <!-- Implemented: orientation watcher in classicBattlePage.js -->
  - [x] 3.5 Validate Scoreboard on ultra-narrow screens (<320px) <!-- Implemented: narrow viewport test in playwright/battleJudoka.spec.js -->

- [ ] 4.0 Implement Accessibility Features

  - [ ] 4.1 Ensure text contrast meets 4.5:1 ratio. Verify with `npm run check:contrast`.
  - [x] 4.2 Add screen reader labels for dynamic messages (`aria-live="polite"` and `role="status"`)
  - [x] 4.3 Ensure all interactive elements have minimum 44px touch targets (CSS min-width/min-height present)
  - [x] 4.4 Ensure all interactive elements support keyboard navigation; tests cover stat, Next, and Quit controls
  - [x] 4.5 Announce score and timer updates via `aria-live` for screen readers (see [Classic Battle PRD](prdBattleClassic.md)) <!-- Implemented: aria-live regions in battleJudoka.html -->
  - [x] 4.6 Provide high-contrast theme for Scoreboard elements <!-- Implemented: `[data-theme="high-contrast"]` in base.css -->

- [ ] 5.0 Edge Case Handling and Fallbacks

  - [x] 5.1 Show “Waiting…” if backend score sync fails
  - [x] 5.2 Show “Waiting…” if countdown timer mismatches server start
  - [x] 5.3 Define recovery logic for delayed player input (show message and auto-select after stall)
   - [x] 5.4 Handle all timer/counter desyncs via `watchForDrift` with “Waiting…” safeguards

- [ ] 6.0 Testing and Validation

- [ ] 6.1 Add/expand unit tests for timer pause/resume, auto-select, and fallback logic
- [ ] 6.2 Add/expand Playwright UI tests for scoreboard responsiveness, accessibility, and edge cases

---

## Accessibility Audit

- **2025-08-05**: `npm run check:contrast` reported no issues after updating `--color-secondary` to `#0066cc`.

**See also:**

- [Classic Battle PRD](prdBattleClassic.md) for timer, stat selection, and accessibility requirements.
- [Random Stat Mode PRD](prdRandomStatMode.md) for auto-selection behavior.
- [Battle Debug Panel PRD](prdBattleDebugPanel.md) for developer-facing state visibility.

- [Back to Game Modes Overview](prdGameModes.md)
