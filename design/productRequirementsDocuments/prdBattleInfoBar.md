# Battle Info Bar PRD

## TL;DR

Displays round messages, stat selection timer, and live match score in the page header so players always know the current battle status. The selection prompt and the countdown between rounds are surfaced via a single snackbar that updates its text each second.

---

## Description

In battle game modes (e.g. Classic Battle), players have a real need to receive clear visual feedback between or after rounds. Without this info, it will leave users uncertain about match state, leading to confusion, reduced immersion, and increased risk of game abandonment. Players could feel "lost" due to a lack of timely updates about round outcomes, next steps, or overall progress.

The round message, timer, and score now sit directly inside the page header rather than in a separate bar. The Info Bar also displays the stat selection timer (30 seconds by default), and triggers auto-selection if the timer expires, as specified in [Classic Battle PRD](prdClassicBattle.md) and [Random Stat Mode PRD](prdRandomStatMode.md). The timer must pause if the game tab is inactive or device goes to sleep, and resume on focus (see [Classic Battle PRD](prdClassicBattle.md)).

---

## Goals

1. **Display match score (player vs opponent)** on the **right side of the top bar**, updated at the **end of each round**, within **800ms** of score finalization.
2. **Display round-specific messaging** on the **left side of the top bar**, depending on match state:
   - If a round ends: show **win/loss/result** message for **2 seconds**.
   - If awaiting action: show a **selection prompt** via snackbar until a decision is made.
   - If waiting for next round: show a **snackbar countdown** that begins **within 1s** of round end and updates its text each second.
   - If in stat selection phase: show **30-second countdown timer** and prompt; if timer expires, auto-select a stat (see [Classic Battle PRD](prdClassicBattle.md)).
   - After the player picks a stat: show **"Opponent is choosing..."** until the opponent's choice is revealed.
3. Ensure all messages are clearly readable, positioned responsively, and maintain usability across devices.
4. Display fallback messages within 500ms of sync failure.
5. Surface a round counter and a field showing the player's selected stat for the current round.
6. **Complement header messaging with a numbered progress bar** beneath the battle area that displays the current state ID in ascending order for clear, accessible progress tracking.

---

## Functional Requirements

| Priority | Feature                | Description                                                                                                                                                                                                                                |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1**   | Match Score Display    | Real-time, fast update of player vs opponent score per round                                                                                                                                                                               |
| **P1**   | Round Status Messaging | Show clear win/loss messages post-round                                                                                                                                                                                                    |
| **P1**   | Stat Selection Timer   | Display 30s countdown for stat selection; auto-select if expired; timer pauses/resumes on tab inactivity (see [Classic Battle PRD](prdClassicBattle.md))                                                                                   |
| **P2**   | Countdown Timer        | Display countdown to next round with fallback for server sync                                                                                                                                                                              |
| **P2**   | User Action Prompt     | Prompt player for input and hide after interaction                                                                                                                                                                                         |
| **P3**   | Responsive Layout      | Adapt layout for small screens and collapse content as needed                                                                                                                                                                              |
| **P3**   | Accessibility Features | Ensure text contrast, screen reader compatibility (via `role="status"` on messages and timers), minimum touch target size, and keyboard navigation for stat, Next, and Quit controls. The **Next** button advances rounds and skips timers (see [Classic Battle PRD](prdClassicBattle.md)) |
| **P2**   | Edge Case Handling     | Fallback messages for backend sync failure and display issues                                                                                                                                                                              |

---

## Acceptance Criteria

- Match score is updated within **800ms** after round ends. <!-- Implemented: see updateScore in InfoBar.js and battleEngine.js -->
- Win/loss message is shown within **1s** of round end and remains visible for **2s**. <!-- Implemented: see showResult in battleUI.js -->
- Action prompt appears via snackbar during user input phases and disappears after interaction. <!-- Implemented: see showMessage and stat selection logic -->
- **Stat selection timer (30s) is displayed during stat selection phase; if timer expires, a random stat is auto-selected. Timer stops immediately once a stat is picked and pauses/resumes on tab inactivity.** <!-- Implemented: see startRound in battleEngine.js and [Classic Battle PRD](prdClassicBattle.md) -->
- Auto-select messages are only shown if no stat was chosen before the timer runs out.
- After the player selects a stat, the Info Bar shows "Opponent is choosing..." until the opponent's stat is revealed.
- Top bar content adapts responsively to different screen sizes and orientations. <!-- Partially implemented: stacking/truncation CSS present, but some edge cases pending -->
- All messages meet minimum contrast ratio of **4.5:1** and are screen reader compatible. Run `npm run check:contrast` to audit these colors. <!-- Implemented: screen reader labels via `aria-live` and `role="status"`; contrast via CSS variables -->
- **All interactive elements, including stat, Next, and Quit buttons, meet minimum touch target size (≥44px) and support keyboard navigation with Enter or Space. The Next button doubles as the timer skip and round progression control.** <!-- Implemented: see CSS min-width/min-height and stat button logic -->

---

## Edge Cases / Failure States

- **Score desync between UI and backend** → Fallback to **“Waiting…”** label if backend sync fails. <!-- Implemented: see InfoBar.js -->
- **Timer mismatch with server start** → Display **“Waiting…”** until match is confirmed to start. <!-- Implemented: see InfoBar.js -->
- **Bar display issues due to screen resolution** → Collapse content into a stacked layout or truncate non-critical info with ellipsis. <!-- Partially implemented: CSS @media queries for stacking/truncation, but some edge cases pending -->
- **Player does not select a stat within 30s** → Auto-select a random stat and display appropriate message (see [Classic Battle PRD](prdClassicBattle.md)). <!-- Implemented: see startRound in battleEngine.js -->
- **Stat selection appears stalled** → Show "Stat selection stalled" message; auto-select a random stat after 5s if no input. <!-- Implemented: see classicBattle.js -->

---

## Design and UX Considerations

- **Layout**
  - Right side: score display (`Player: X – Opponent: Y`)
  - Two-line score format appears on narrow screens via stacked `<span>` elements (`<span>You: X</span> <span>Opponent: Y</span>`)
  - Left side: rotating status messages (e.g., "You won!", **"Time left: 29s"**, "Opponent is choosing..."). Selection prompts and the countdown to the next round appear in snackbars whose text update each second.
  - Center: round counter (`Round 3`) and field showing the player's selected stat (`Selected: Power`).
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

**Implementation status summary:**

- **Score, round messages, timers, stat selection auto-select, pause/resume, screen-reader attributes, and fallback "Waiting..." logic are implemented.**
- **Recovery logic for stalled stat selection shows a message and auto-selects after a short delay, and keyboard navigation for interactive controls is covered by tests.**
- **Responsive stacking/truncation and minimum touch target size are implemented in CSS, but some edge cases and explicit contrast checks are not yet fully implemented.**
- **Orientation watcher, `aria-live` announcements, high-contrast theme, and narrow-view tests exist in classicBattlePage.js, battleJudoka.html, base.css, and `playwright/battleJudoka.spec.js`.**
- **See InfoBar.js, battleEngine.js, battleUI.js, and battle.css for current logic.**

---

## Tasks

- [x] 1.0 Implement Score Display

  - [x] 1.1 Fetch match score from backend or engine state
  - [x] 1.2 Render score on right side of top bar
  - [x] 1.3 Update score within 800ms after round ends

- [x] 2.0 Implement Round Info Messages

  - [x] 2.1 Display win/loss messages for 2 seconds
  - [x] 2.2 Start countdown snackbar after message disappears
  - [x] 2.3 Display selection prompt when input is needed
  - [x] 2.4 Display stat selection timer and auto-select if expired (see [Classic Battle PRD](prdClassicBattle.md))
  - [x] 2.5 Pause/resume stat selection timer on tab inactivity (see battleEngine.js)

- [ ] 3.0 Handle Responsive Layout

  - [x] 3.1 Detect screen width <375px and switch to stacked layout (CSS @media implemented)
  - [ ] 3.2 Truncate or stack content if resolution causes display issues (edge cases, pending)
  - [x] 3.3 Adaptive font sizing for all states (partially via clamp(), may need review) <!-- Implemented: font-size clamp() in battle.css -->
  - [x] 3.4 Handle orientation changes and reflow layout accordingly <!-- Implemented: orientation watcher in classicBattlePage.js -->
  - [x] 3.5 Validate Info Bar on ultra-narrow screens (<320px) <!-- Implemented: narrow viewport test in playwright/battleJudoka.spec.js -->

- [ ] 4.0 Implement Accessibility Features

  - [ ] 4.1 Ensure text contrast meets 4.5:1 ratio. Verify with `npm run check:contrast`.
  - [x] 4.2 Add screen reader labels for dynamic messages (`aria-live="polite"` and `role="status"`)
  - [x] 4.3 Ensure all interactive elements have minimum 44px touch targets (CSS min-width/min-height present)
  - [x] 4.4 Ensure all interactive elements support keyboard navigation; tests cover stat, Next, and Quit controls
  - [x] 4.5 Announce score and timer updates via `aria-live` for screen readers (see [Classic Battle PRD](prdClassicBattle.md)) <!-- Implemented: aria-live regions in battleJudoka.html -->
  - [x] 4.6 Provide high-contrast theme for Info Bar elements <!-- Implemented: `[data-theme="high-contrast"]` in base.css -->

- [ ] 5.0 Edge Case Handling and Fallbacks

  - [x] 5.1 Show “Waiting…” if backend score sync fails
  - [x] 5.2 Show “Waiting…” if countdown timer mismatches server start
  - [x] 5.3 Define recovery logic for delayed player input (show message and auto-select after stall)
   - [x] 5.4 Handle all timer/counter desyncs via `watchForDrift` with “Waiting…” safeguards

- [ ] 6.0 Testing and Validation

- [ ] 6.1 Add/expand unit tests for timer pause/resume, auto-select, and fallback logic
- [ ] 6.2 Add/expand Playwright UI tests for info bar responsiveness, accessibility, and edge cases

---

## Accessibility Audit

- **2025-08-05**: `npm run check:contrast` reported no issues after updating `--color-secondary` to `#0066cc`.

**See also:**

- [Classic Battle PRD](prdClassicBattle.md) for timer, stat selection, and accessibility requirements.
- [Random Stat Mode PRD](prdRandomStatMode.md) for auto-selection behavior.
- [Battle Debug Panel PRD](prdBattleDebugPanel.md) for developer-facing state visibility.

- [Back to Game Modes Overview](prdGameModes.md)
