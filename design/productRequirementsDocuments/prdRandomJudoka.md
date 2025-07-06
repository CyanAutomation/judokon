# PRD: Display Random Judoka

**Game Mode ID:** randomJudoka (URL: randomJudoka.html)

---

## Problem Statement

Players currently experience predictable, repetitive gameplay when they pre-select cards, leading to decreased engagement and shorter session times. Without randomness, team composition lacks inspiration and novelty, causing players to churn or lose interest more quickly.  

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

*(Add user stories here if needed; recommended: 2–3 stories covering player excitement, accessibility needs, and parent-friendly design.)*

---

## Functional Requirements

- Show one random judoka on load or refresh.
- “Draw” button refreshes content.

---

## Acceptance Criteria

- Random judoka displayed each visit.
- Display random judoka within 300ms (95% success rate).
- Draw button reliably refreshes card on tap (≥99% tap success).
- Show fallback card if judoka list is empty (displays in <1s in 99% of cases).
- Respect Reduced Motion settings (disable animations when active).

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

---

## Open Questions

- Should favourites influence the random selection?

---

## UI Design

### Design and UX Considerations

#### Layout and Interaction
- **Main Screen Structure**:
  - **Card Display Area**: Centered large card placeholder with dynamic content.
  - **Action Button**: Prominent “Draw” button below the card, centered, with clear label.
- **Draw Flow**:
  1. Player loads the screen → random judoka card appears automatically.
  2. Player taps “Draw” button → new random card slides or fades in.
  3. If Reduced Motion is active, card changes instantly without animation.
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
- Mute option via a toggle icon near the draw button.

#### Visual Mockup Description
- **Top Bar**: minimal header with “Random Judoka” title centered.
- **Central Card Area**: large placeholder card with question mark icon on initial state.
- **Draw Button**: prominent pill-shaped “Draw New Judoka!” button ~24px below the card.
- **Fallback State**: placeholder card with error icon and explanatory text below.

---

## Prioritized Functional Requirements

| Priority | Feature                        | Description                                                                        |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| P1       | Random Card Selection          | Select a random card from the active card set dynamically, ensuring no bias.       |
| P1       | Display Selected Card          | Visually reveal the selected card with animation and sound feedback.               |
| P2       | Fallback on Failure            | Show fallback card and error message if draw fails or active set is empty.         |
| P2       | Reusable Random Draw Module    | Make the random draw callable from multiple game states or screens.                |
| P3       | Accessibility Support          | Support Reduced Motion settings and maintain color contrast and readability.       |
| P3       | UX Enhancements                | Optimize for 60fps animation, sound effect, and large tap targets.                 |
| P3       | Sound & Animation User Toggles | Allow users to manually mute sounds and disable animations if desired.             |

---

[Back to Game Modes Overview](prdGameModes.md)