# Battle Info Bar PRD

## TL;DR

Displays round messages, a countdown timer, and live match score in the page header so players always know the current battle status. The Info Bar also manages the stat selection timer and fallback logic, as required by Classic Battle mode.

---

## Description

In battle game modes (e.g. Classic Battle), players have a real need to receive clear visual feedback between or after rounds. Without this info, it will leave users uncertain about match state, leading to confusion, reduced immersion, and increased risk of game abandonment. Players could feel "lost" due to a lack of timely updates about round outcomes, next steps, or overall progress.

The round message, timer, and score now sit directly inside the page header rather than in a separate bar. The Info Bar also displays the stat selection timer (30 seconds by default), and triggers auto-selection if the timer expires, as specified in Classic Battle requirements. The timer must pause if the game tab is inactive or device goes to sleep, and resume on focus (see Classic Battle PRD).

---

## Goals

1. **Display match score (player vs opponent)** on the **right side of the top bar**, updated at the **end of each round**, within **800ms** of score finalization.
2. **Display round-specific messaging** on the **left side of the top bar**, depending on match state:
   - If a round ends: show **win/loss/result** message for **2 seconds**.
   - If awaiting action: show **selection prompt** until a decision is made.
   - If waiting for next round: show **countdown timer** that begins **within 1s** of round end.
   - If in stat selection phase: show **30-second countdown timer** and prompt; if timer expires, auto-select a stat (see Classic Battle PRD).
3. Ensure all messages are clearly readable, positioned responsively, and maintain usability across devices.
4. Display fallback messages within 500ms of sync failure.

---

## Functional Requirements

| Priority | Feature                | Description                                                                                                                                                                                                         |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Match Score Display    | Real-time, fast update of player vs opponent score per round                                                                                                                                                        |
| **P1**   | Round Status Messaging | Show clear win/loss messages post-round                                                                                                                                                                             |
| **P1**   | Stat Selection Timer   | Display 30s countdown for stat selection; auto-select if expired; timer pauses/resumes on tab inactivity (see Classic Battle PRD)                                                                                   |
| **P2**   | Countdown Timer        | Display countdown to next round with fallback for server sync                                                                                                                                                       |
| **P2**   | User Action Prompt     | Prompt player for input and hide after interaction                                                                                                                                                                  |
| **P3**   | Responsive Layout      | Adapt layout for small screens and collapse content as needed                                                                                                                                                       |
| **P3**   | Accessibility Features | Ensure text contrast, screen reader compatibility (via `role="status"` on messages and timers), minimum touch target size, and keyboard navigation for stat, Next Round, and Quit controls (see Classic Battle PRD) |
| **P2**   | Edge Case Handling     | Fallback messages for backend sync failure and display issues                                                                                                                                                       |

---

## Acceptance Criteria

- Match score is updated within **800ms** after round ends. <!-- Implemented: see updateScore in InfoBar.js and battleEngine.js -->
- Win/loss message is shown within **1s** of round end and remains visible for **2s**. <!-- Implemented: see showResult in battleUI.js -->
- Countdown timer begins once the 2s result message fade-out completes, aligned with server round start delay. <!-- Implemented: see startCoolDown in battleEngine.js -->
- Action prompt appears during user input phases and disappears after interaction. <!-- Implemented: see showMessage and stat selection logic -->
- **Stat selection timer (30s) is displayed during stat selection phase; if timer expires, a random stat is auto-selected. Timer pauses/resumes on tab inactivity.** <!-- Implemented: see startRound in battleEngine.js -->
- Top bar content adapts responsively to different screen sizes and orientations. <!-- Partially implemented: stacking/truncation CSS present, but some edge cases pending -->
- All messages meet minimum contrast ratio of **4.5:1** and are screen reader compatible. Run `npm run check:contrast` to audit these colors. <!-- Contrast via CSS variables; screen reader labels implemented with `role="status"` -->
- **All interactive elements, including stat, Next Round, and Quit buttons, meet minimum touch target size (≥44px) and support keyboard navigation with Enter or Space.** <!-- Implemented: see CSS min-width/min-height and stat button logic -->

---

## Edge Cases / Failure States

- **Score desync between UI and backend** → Fallback to **“Waiting…”** label if backend sync fails. <!-- Implemented: see showMessage fallback logic -->
- **Timer mismatch with server start** → Display **“Waiting…”** until match is confirmed to start. <!-- Implemented: see showMessage fallback logic -->
- **Bar display issues due to screen resolution** → Collapse content into a stacked layout or truncate non-critical info with ellipsis. <!-- Partially implemented: CSS @media queries for stacking/truncation, but some edge cases pending -->
- **Player does not select a stat within 30s** → Auto-select a random stat and display appropriate message (see Classic Battle PRD). <!-- Implemented: see startRound in battleEngine.js -->

---

## Design and UX Considerations

- **Layout**
  - Right side: score display (`Player: X – Opponent: Y`)
  - Two-line score format appears on narrow screens (`Player: X` line break `Opponent: Y`)
  - Left side: rotating status messages (e.g., "You won!", "Next round in: 3s", "Select your move", **"Time left: 29s"**)
- **Visuals**
  - Font size: `clamp(16px, 4vw, 24px)`; on narrow screens (<375px) `clamp(14px, 5vw, 20px)`.
  - Color coding: green (win), red (loss), neutral grey (countdown).
- **Responsiveness**
  - Stacked layout on narrow screens (<375px width). <!-- Implemented: see battle.css @media (max-width: 374px) -->
- **Accessibility**
  - All text meets **WCAG 2.1 AA** standards. <!-- Contrast: mostly via CSS, but not programmatically checked -->
  - Screen reader labels for dynamic messages using `aria-live="polite"` and `role="status"`.

---

**Implementation status summary:**

- **Score, round messages, timers, stat selection auto-select, pause/resume, and fallback "Waiting..." logic are implemented as described.**
- **Responsive stacking/truncation and minimum touch target size are implemented in CSS, but some edge cases and explicit contrast checks are not yet fully implemented.**
- **See InfoBar.js, battleEngine.js, battleUI.js, and battle.css for current logic.**

---

## Tasks

- [x] 1.0 Implement Score Display

  - [x] 1.1 Fetch match score from backend or engine state
  - [x] 1.2 Render score on right side of top bar
  - [x] 1.3 Update score within 800ms after round ends

- [x] 2.0 Implement Round Info Messages

  - [x] 2.1 Display win/loss messages for 2 seconds
  - [x] 2.2 Start countdown timer after message disappears
  - [x] 2.3 Display selection prompt when input is needed
  - [x] 2.4 Display stat selection timer and auto-select if expired (see Classic Battle PRD)
  - [x] 2.5 Pause/resume stat selection timer on tab inactivity (see battleEngine.js)

- [ ] 3.0 Handle Responsive Layout

  - [x] 3.1 Detect screen width <375px and switch to stacked layout (CSS @media implemented)
  - [ ] 3.2 Truncate or stack content if resolution causes display issues (edge cases, pending)
  - [ ] 3.3 Adaptive font sizing for all states (partially via clamp(), may need review)

- [ ] 4.0 Implement Accessibility Features

  - [ ] 4.1 Ensure text contrast meets 4.5:1 ratio. Verify with `npm run check:contrast`.
  - [x] 4.2 Add screen reader labels for dynamic messages (`aria-live="polite"` and `role="status"`)
  - [x] 4.3 Ensure all interactive elements have minimum 44px touch targets (CSS min-width/min-height present)
  - [ ] 4.4 Ensure all interactive elements support keyboard navigation (stat buttons: basic support, but needs explicit review/test)

- [x] 5.0 Edge Case Handling and Fallbacks

  - [x] 5.1 Show “Waiting…” if backend score sync fails
  - [x] 5.2 Show “Waiting…” if countdown timer mismatches server start
  - [ ] 5.3 Define recovery logic for delayed player input (pending, e.g. if UI freezes)
  - [ ] 5.4 Handle all possible timer/counter desyncs and display fallback (pending)

- [ ] 6.0 Testing and Validation

  - [ ] 6.1 Add/expand unit tests for timer pause/resume, auto-select, and fallback logic
  - [ ] 6.2 Add/expand Playwright UI tests for info bar responsiveness, accessibility, and edge cases

---

**See also:**

- [Classic Battle PRD](prdClassicBattle.md) for timer, stat selection, and accessibility requirements.

- [Back to Game Modes Overview](prdGameModes.md)
