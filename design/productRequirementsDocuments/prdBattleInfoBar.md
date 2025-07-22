# Battle Info Bar PRD

## TL;DR

Displays round messages, a countdown timer, and live match score in the page header so players always know the current battle status.

---

## Description

In battle game modes (e.g. Classic Battle), players have a real need to receive clear visual feedback between or after rounds. Without this info, it will leave users uncertain about match state, leading to confusion, reduced immersion, and increased risk of game abandonment. Players could feel "lost" due to a lack of timely updates about round outcomes, next steps, or overall progress.

The round message, timer, and score now sit directly inside the page header rather than in a separate bar.

---

## Goals

1. **Display match score (player vs CPU)** on the **right side of the top bar**, updated at the **end of each round**, within **800ms** of score finalization.
2. **Display round-specific messaging** on the **left side of the top bar**, depending on match state:
   - If a round ends: show **win/loss/result** message for **2 seconds**.
   - If awaiting action: show **selection prompt** until a decision is made.
   - If waiting for next round: show **countdown timer** that begins **within 1s** of round end.
3. Ensure all messages are clearly readable, positioned responsively, and maintain usability across devices.
4. Display fallback messages within 500ms of sync failure.

---

## Functional Requirements

| Priority | Feature                | Description                                                   |
|----------|------------------------|---------------------------------------------------------------|
| **P1**   | Match Score Display    | Real-time, fast update of player vs CPU score per round       |
| **P1**   | Round Status Messaging | Show clear win/loss messages post-round                       |
| **P2**   | Countdown Timer        | Display countdown to next round with fallback for server sync |
| **P2**   | User Action Prompt     | Prompt player for input and hide after interaction            |
| **P3**   | Responsive Layout      | Adapt layout for small screens and collapse content as needed |
| **P3**   | Accessibility Features | Ensure text contrast, screen reader compatibility             |
| **P2**   | Edge Case Handling     | Fallback messages for backend sync failure and display issues |

---

## Acceptance Criteria

- [ ] Match score is updated within **800ms** after round ends.
- [ ] Win/loss message is shown within **1s** of round end and remains visible for **2s**.
- [ ] Countdown timer begins once the 2s result message fade-out completes, aligned with server round start delay.
- [ ] Action prompt appears during user input phases and disappears after interaction.
- [ ] Top bar content adapts responsively to different screen sizes and orientations.
- [ ] All messages meet minimum contrast ratio of **4.5:1** and are screen reader compatible.

---

## Edge Cases / Failure States

- **Score desync between UI and backend** → Fallback to **“Waiting…”** label if backend sync fails.
- **Timer mismatch with server start** → Display **“Waiting…”** until match is confirmed to start.
- **Bar display issues due to screen resolution** → Collapse content into a stacked layout or truncate non-critical info with ellipsis.

---

## Design and UX Considerations

- **Layout**
  - Right side: score display (`Player: X – CPU: Y`)
  - Two-line score format appears on narrow screens (`Player: X` line break `CPU: Y`)
  - Left side: rotating status messages (e.g., "You won!", "Next round in: 3s", "Select your move")
- **Visuals**
  - Font size: min 16sp, bold for win/loss messages.
  - Color coding: green (win), red (loss), neutral grey (countdown).
- **Responsiveness**
  - Stacked layout on narrow screens (<375px width).
  - Collapse countdown if less than 2s remains.
- **Accessibility**
  - All text meets **WCAG 2.1 AA** standards.
  - Screen reader labels for dynamic messages.
  - `#round-message` and `#next-round-timer` use `aria-live="polite"` so
    announcements occur automatically. `#score-display` sets `aria-live="off"`
    to avoid repeated score announcements.
 
---

| LEFT SIDE (Round Messages)            |                          RIGHT SIDE (Score) |
|--------------------------------------|---------------------------------------------|
|  "You won!"  (bold green, 16sp)      |           Player: 2  –  CPU: 1               |
|  "Select your move" (neutral grey)   |                                             |
|  "Next round in: 3s" (neutral grey) |                                             |

---

- Responsive Layout Notes:
- On wide screens (>=375px): single horizontal bar with left and right content aligned.
- On narrow screens (<375px): stacked vertically

---

| "You won!"                   |
|                             |
| Player: 2  –  CPU: 1         |

---

- Countdown timer truncates if less than 2s remains.
- Text size min 16sp; win/loss messages bold and color-coded.

### Additional Details:

- **Animation timing:**
  - Win/loss message fades in immediately after round ends, stays visible for 2s, then fades out.
  - Countdown timer fades in after win/loss message disappears.
- **Colors:**
  - Win message: Green text (#28a745)
  - Loss message: Red text (#dc3545)
  - Neutral messages: Grey (#6c757d)
- **Accessibility:**
  - All text uses high contrast with background
  - Screen reader labels update dynamically with messages

---

### Status Bar Module

**Contents:**
• Left container: Swappable message slot with fade-in/out animation for win/loss, prompts, countdown, and fallback (“Waiting…”) messages.
• Right container: Real-time score display with fixed width and responsive alignment.
• Timer slot: Dedicated, context-sensitive timer area beneath main message, auto-collapses if <2s remains.

**Why:** This enforces strict separation and visibility of all critical states, guarantees feedback is always present, and ensures compliance with responsiveness, accessibility, and error handling needs.

---

### Action Prompt Module

**Contents:**
• Prompt label: Clearly separated with bold, neutral styling.
• Action buttons/areas: Large, touch-friendly targets for move selection, spaced with minimum 12px padding.
• Feedback slot: Inline status/error message container (e.g., “Waiting for opponent…”).

**Why:** Your core user journey (selecting a move) is invisible here—this module makes the primary action obvious, accessible, and impossible to miss.

---

### Responsive Stack/Collapse Logic

**Contents:**
• Breakpoint annotations: <375px triggers vertical stacking.
• Truncation/ellipsis: Score and message text auto-truncate with ellipsis if space is insufficient.
• Adaptive font sizing: Minimum 16sp, adjusts for device, with enforced color contrast for all states.

**Why:** Forces the wireframe to handle edge cases, small screens, and overflow gracefully—ensures you never lose critical information, regardless of device.

---

## Tasks

- [x] 1.0 Implement Score Display
  - [x] 1.1 Fetch match score from backend
  - [x] 1.2 Render score on right side of top bar
  - [x] 1.3 Update score within 800ms after round ends

- [x] 2.0 Implement Round Info Messages
  - [x] 2.1 Display win/loss messages for 2 seconds
  - [x] 2.2 Start countdown timer after message disappears
  - [ ] 2.3 Display selection prompt when input is needed

- [ ] 3.0 Handle Responsive Layout
  - [ ] 3.1 Detect screen width <375px and switch to stacked layout
  - [ ] 3.2 Collapse countdown timer if <2 seconds remain

- [ ] 4.0 Implement Accessibility Features
  - [ ] 4.1 Ensure text contrast meets 4.5:1 ratio
  - [ ] 4.2 Add screen reader labels for dynamic messages

- [x] 5.0 Edge Case Handling and Fallbacks
  - [x] 5.1 Show “Waiting…” if backend score sync fails
  - [x] 5.2 Show “Waiting…” if countdown timer mismatches server start
  - [ ] 5.3 Truncate or stack content if resolution causes display issues
  - [ ] 5.4 Define recovery logic for delayed player input

---

\n[Back to Game Modes Overview](prdGameModes.md)
