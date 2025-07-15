# Battle Info Bar PRD

## Description

In battle game modes (e.g. Classic Battle), players currently receive no clear visual feedback between or after rounds. This leaves them uncertain about match state, leading to confusion, reduced immersion, and increased risk of game abandonment. Players frequently feel "lost" due to a lack of timely updates about round outcomes, next steps, or overall progress.

## Goals

1. **Display match score (player vs CPU)** on the **right side of the top bar**, updated at the **end of each round**, within **800ms** of score finalization.
2. **Display round-specific messaging** on the **left side of the top bar**, depending on match state:
   - If a round ends: show **win/loss/result** message for **2 seconds**.
   - If awaiting action: show **selection prompt** until a decision is made.
   - If waiting for next round: show **countdown timer** that begins **within 1s** of round end.
3. Ensure all messages are clearly readable, positioned responsively, and maintain usability across devices.

## Functional Requirements

| Priority | Feature                  | Description                                                                 |
|----------|--------------------------|-----------------------------------------------------------------------------|
| P1       | Match Score Display      | Show real-time player vs CPU score on right of top bar, updated per round. |
| P1       | Round Status Messaging   | Display result (win/loss) message after each round.                        |
| P2       | Countdown Timer          | Show countdown to next round when waiting.                                 |
| P2       | User Action Prompt       | Prompt user when input or selection is required.                           |

## Acceptance Criteria

- [ ] Match score is updated within **800ms** after round ends.
- [ ] Win/loss message is shown within **1s** of round end and remains visible for **2s**.
- [ ] Countdown timer starts after result message, aligned with server round start delay.
- [ ] Action prompt appears during user input phases and disappears after interaction.
- [ ] Top bar content adapts responsively to different screen sizes and orientations.
- [ ] All messages meet minimum contrast ratio of **4.5:1** and are screen reader compatible.

## Edge Cases / Failure States

- **Score desync between UI and backend** → Fallback to **“Waiting…”** label if backend sync fails.
- **Timer mismatch with server start** → Display **“Waiting…”** until match is confirmed to start.
- **Bar display issues due to screen resolution** → Collapse content into a stacked layout or truncate non-critical info with ellipsis.

## Design and UX Considerations

- **Layout**
  - Right side: score display (`Player: X – CPU: Y`)
  - Left side: rotating status messages (e.g., "You won!", "Round starts in: 3", "Select your move")
- **Visuals**
  - Font size: min 16sp, bold for win/loss messages.
  - Color coding: green (win), red (loss), neutral grey (countdown).
- **Responsiveness**
  - Stacked layout on narrow screens (<375px width).
  - Collapse countdown if less than 1.5s remains.
- **Accessibility**
  - All text meets **WCAG 2.1 AA** standards.
  - Screen reader labels for dynamic messages.

## Tasks

- [ ] 2.0 Implement Score Display
  - [ ] 2.1 Fetch and render match score from backend.
  - [ ] 2.2 Update score within 800ms post-round.

- [ ] 3.0 Implement Round Info Messages
  - [ ] 3.1 Display win/loss messages for 2 seconds.
  - [ ] 3.2 Start countdown timer after message.
  - [ ] 3.3 Display selection prompt when input is needed.

- [ ] 4.0 Handle Edge Cases
  - [ ] 4.1 Show fallback “Waiting…” label when backend sync fails.
  - [ ] 4.2 Adjust layout responsively for all screen sizes.
