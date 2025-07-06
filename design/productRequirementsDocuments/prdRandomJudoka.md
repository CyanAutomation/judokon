# PRD: Display Random Judoka

**Game Mode ID:** randomJudoka (URL: randomJudoka.html)

---

TL;DR: Display Random Judoka gives players instant, inspiring roster ideas by drawing and revealing a random card with fast, smooth animations and full accessibility support — reducing team-building fatigue and increasing session engagement.

> Mia taps “Draw” and a new judoka slides up instantly, surprising her with a powerful pick she hadn’t considered. She taps again, excitedly building a fresh team, and spends twice as long experimenting compared to when she built manually. The bright animations and satisfying feel keep her engaged.

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
- ≥90% of random draws complete in ≤300ms on mid-tier devices.
- ≤1% fallback error rate over 1000 draws.
- Average time spent on Random Judoka screen ≥40% higher than average team-building time for players who only pre-select cards.
- ≥80% of players use the Draw button at least once per session in the first week post-launch.

---

## User Stories

- As a player, I want to see a new judoka each time I tap the Draw button so I can get fresh ideas without feeling stuck on old teams.
- As a player sensitive to motion, I want animations to disable automatically or manually so I can avoid discomfort.
- As a parent, I want my child’s game to have big, easy-to-tap buttons so they don’t get frustrated.

---

## Functional Requirements

- Show one random judoka when the screen loads.
- "Draw" button calls the shared random card module to refresh the card.

---

## Acceptance Criteria

- Random judoka displayed on each visit.
- Display random judoka within 300ms (95% success rate).
- Draw button reliably refreshes card on tap (≥99% tap success).
- Show fallback card if judoka list is empty (displays in <1s in 99% of cases).
- Respect OS-level Reduced Motion settings (disable animations when active).
- Sound is off by default.

---

## Non-Goals

- Complex filters or search.
- Persistent card history or logs of previous draws.
- Weighted draws (favoring certain judoka).
- Advanced filters or rarity-based restrictions.

---

## Dependencies

- Access to the full judoka list.
- Uses `generateRandomCard` as described in [prdDrawRandomCard.md](prdDrawRandomCard.md).

---

## Technical Considerations

- Caching, randomness, and fallback logic are handled by `generateRandomCard`.

---

## Edge Cases / Failure States

- Handled by `generateRandomCard` (empty list fallback, error logging, and graceful cancellation).

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
- **Draw Flow**:
  1. Player loads the screen → random judoka card appears automatically.
  2. Player taps “Draw” button → new random card slides or fades in.
  3. If Reduced Motion or manual animation toggle is active, card changes instantly without animation.
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

| Priority | Feature                  | Description                                                   |
| -------- | ------------------------ | ------------------------------------------------------------- |
| **P1**   | Use `generateRandomCard` | Selects and displays a random judoka via the shared module.   |
| **P1**   | Screen Layout & Controls | Large Draw button plus animation and sound toggles.           |
| **P2**   | Accessibility            | WCAG contrast, large tap targets, and Reduced Motion support. |
| **P3**   | Optional Audio Feedback  | Chime on draw with mute toggle (sound off by default).        |

---

## Tasks

- [ ] 1.0 Integrate `generateRandomCard`
  - [ ] 1.1 Trigger the function on screen load.
  - [ ] 1.2 Call it again when the Draw button is tapped.
- [ ] 2.0 Build layout and controls
  - [ ] 2.1 Create card display area and prominent Draw button.
  - [ ] 2.2 Add manual animation and sound toggles.
- [ ] 3.0 Accessibility & fallback
  - [ ] 3.1 Verify WCAG contrast and tap target sizes.
  - [ ] 3.2 Display fallback card on error using the module.

---

[Back to Game Modes Overview](prdGameModes.md)
