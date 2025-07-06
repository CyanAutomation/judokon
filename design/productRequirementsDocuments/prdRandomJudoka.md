# PRD: Display Random Judoka (Updated)

**Game Mode ID:** randomJudoka (URL: randomJudoka.html)

---

## Problem Statement

Players currently experience predictable, repetitive gameplay when they pre-select cards, leading to decreased engagement and shorter session times. Without randomness, team composition lacks inspiration and novelty, causing players to churn or lose interest more quickly.  

> _“I always pick the same cards because it’s easier. I get bored of my team really fast.” — 10-year-old player during playtest session_

**Game data shows:** 35% of players who manually build teams exit the game within 5 minutes, while players using random draws play an average of 40% longer per session.

---

## Goals

- Give players quick inspiration for new team ideas.
- Play sessions average 2 minutes shorter when pre-selecting cards; aim to close this gap.
- Reduce time-to-inspiration by 50% compared to manual team-building (reduce average team-building time from 30 seconds to ≤15 seconds).
- Ensure each card draw completes in ≤300ms in 95% of cases.
- Achieve 95% error-free card draws across 1000 consecutive draws.

---

## User Stories

- As a player, I want to see a new judoka each time I tap the Draw button so I can get fresh ideas without feeling stuck on old teams.
- As a player sensitive to motion, I want animations to disable automatically or manually so I can avoid discomfort.
- As a parent, I want my child’s game to have big, easy-to-tap buttons so they don’t get frustrated.

---

## Functional Requirements

- Show one random judoka on load or refresh.
- “Draw” button refreshes content.
- User cannot stop draw once function is triggered.
- If the user **navigates away or refreshes mid-draw**, draw is silently canceled and fallback card or new random card appears on reload.
- Provide **manual animation toggle** (in addition to Reduced Motion detection) for player choice.

---

## Acceptance Criteria

- Random judoka displayed on each visit.
- Display random judoka within 300ms (95% success rate).
- Draw button reliably refreshes card on tap (≥99% tap success).
- Show fallback card if judoka list is empty (displays in <1s in 99% of cases).
- Respect OS-level Reduced Motion settings (disable animations when active).
- Provide manual animation toggle (default: animations ON).
- Sound is off by default.
- Spam-tap or repeated input protection exists.
- If player navigates away during draw, draw cancels without errors.

---

## Non-Goals

- Complex filters or search.

---

## Dependencies

- Access to the full judoka list.

---

## Edge Cases / Failure States

- **Empty judoka list** → show fallback card, display “No Judokas Available.”
- **Draw function errors** → log error, show fallback card with soft error message.
- **Slow devices or network issues** → degrade animations to static reveal if 60fps cannot be maintained.
- **Navigation away during draw** → cancel draw, display fallback or new random card on next load.

---

## Open Questions

- Should favourites influence the random selection?

---

## UI Design

### Design and UX Considerations

#### Layout and Interaction
- **Main Screen Structure**:
  - **Card Display Area**: Centered large card placeholder with dynamic content.
  - **Action Buttons**:
    - Prominent “Draw” button below the card, centered, clear label.
    - Mute icon (toggle sound) and Animation icon (toggle animations) positioned next to the Draw button for easy access.
- **Draw Flow**:
  1. Player loads the screen → random judoka card appears automatically.
  2. Player taps “Draw” button → new random card slides or fades in.
  3. If Reduced Motion or manual animation toggle is active, card changes instantly without animation.
  4. If player navigates away mid-draw, the draw silently cancels, avoiding stuck states.
- **Button Size**:
  - Minimum: 64px height × 300px width for easy tapping, especially for kids.
  - Style: Capsule shape using `--radius-pill` for consistent branding.

#### Animation and Transitions
- **Card Reveal Animation**:
  - Slide-in from bottom or fade-in (duration: 300–500ms).
  - Maintain ≥60fps on devices with ≥2GB RAM.
- **Fallback**:
  - If animation performance drops below 50fps, degrade to static card reveal.
- **Button Feedback**:
  - Press: Slight scale-in (95% size) for ~100ms.
  - Disabled state: Lower opacity (50%), disable input if judoka list is empty or draw is in progress.

#### Accessibility
- Detect OS-level Reduced Motion; disable animations if active.
- Provide manual animation toggle (default ON).
- Tap targets ≥48px × 48px (64px recommended for kid-friendly design).
- Text must meet WCAG 2.1 AA 4.5:1 contrast ratio (verify with automated tools).
- Fallback card displays high-contrast “Oops! Try again” text if errors occur.
- All buttons and states require clear text labels.

#### Responsiveness
- **Mobile (<600px)**: card fills ~70% of viewport; draw button spans nearly full width.
- **Tablet/Desktop (>600px)**: card ~40% of viewport; centered draw button with spacing.
- **Landscape Support**: components reposition vertically or side-by-side.

#### Audio Feedback (Optional Enhancement)
- Chime/swoosh sound <1 second, volume at 60% of system volume.
- Mute option via toggle icon near the draw button (default: sound off).

#### Visual Mockup Description
- **Top Bar**: minimal header with “Random Judoka” title centered.
- **Central Card Area**: large placeholder card with question mark icon on initial state.
- **Draw Button Area**: prominent pill-shaped “Draw New Judoka!” button with mute and animation toggles ~24px below the card.
- **Fallback State**: placeholder card with error icon and explanatory text below.

---

## Prioritized Functional Requirements

| Priority | Feature                        | Description                                                                                 |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| **P1**   | Random Card Selection          | Randomly pick a judoka from the list and ensure immediate display.                          |
| **P1**   | Draw Button Interaction        | Provide responsive, animated button with spam-tap protection.                               |
| **P1**   | Card Display & Animation       | Smooth reveal of the selected card, respecting Reduced Motion settings and manual toggle.   |
| **P2**   | Fallback on Failure            | Show fallback card with clear error message if draw fails or list is empty.                 |
| **P2**   | Accessibility Features         | Reduced Motion support, WCAG contrast, large tap targets, and cancellation handling.        |
| **P3**   | Optional Audio Feedback        | Chime on draw with mute toggle, sound off by default.                                       |
| **P3**   | Manual Animation User Toggle   | Provide player control to disable animations regardless of OS Reduced Motion setting.       |

---

## Tasks

- [ ] 1.0 Implement Random Judoka Selection Logic
  - [ ] 1.1 Fetch full judoka list on screen load.
  - [ ] 1.2 Randomly select a judoka each time the screen loads or the draw button is tapped.
  - [ ] 1.3 Handle empty list by triggering fallback card display.
- [ ] 2.0 Build Card Display and Animation System
  - [ ] 2.1 Create card placeholder UI component.
  - [ ] 2.2 Animate card reveal with slide or fade effect.
  - [ ] 2.3 Respect Reduced Motion setting and manual animation toggle.
- [ ] 3.0 Develop Draw Button Interaction
  - [ ] 3.1 Build prominent “Draw” button with capsule styling.
  - [ ] 3.2 Add button press feedback (scale-in effect).
  - [ ] 3.3 Disable button during draw-in-progress to prevent rapid taps.
- [ ] 4.0 Integrate Accessibility Features
  - [ ] 4.1 Implement detection for Reduced Motion OS settings.
  - [ ] 4.2 Provide manual animation toggle control with clear state.
  - [ ] 4.3 Ensure button and card UI meet WCAG 2.1 contrast requirements.
  - [ ] 4.4 Verify tap target sizes meet or exceed 64px for children.
- [ ] 5.0 Error Handling and Fallback States
  - [ ] 5.1 Display fallback card and error text if judoka list is empty or draw fails.
  - [ ] 5.2 Log errors for debugging without disrupting the player experience.
  - [ ] 5.3 Handle player navigation away mid-draw by canceling draw gracefully.
- [ ] 6.0 Add Optional Audio Feedback
  - [ ] 6.1 Play chime/swoosh on successful card draw.
  - [ ] 6.2 Build toggle icon to mute/unmute sound effects.
  - [ ] 6.3 Set and store the default state for the sound toggle.

---

[Back to Game Modes Overview](prdGameModes.md)