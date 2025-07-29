# PRD: Display Random Judoka

**Game Mode ID:** `12`
**URL:** `randomJudoka.html`

---

## TL;DR

Display Random Judoka gives players instant, inspiring roster ideas by drawing and revealing a random card with fast, smooth animations (**≥60 fps, transitions <500 ms**) and full accessibility support — reducing team-building fatigue and increasing session engagement.

> Mia taps “Draw” and a new judoka slides up instantly, surprising her with a powerful pick she hadn’t considered. She taps again, excitedly building a fresh team, and spends twice as long experimenting compared to when she built manually. The bright animations and satisfying feel keep her engaged.

---

## Problem Statement

Players currently experience predictable, repetitive gameplay when they pre-select cards, leading to decreased engagement and shorter session times. Without randomness, team composition lacks inspiration and novelty, causing players to churn or lose interest more quickly.

> _“I always pick the same cards because it’s easier. I get bored of my team really fast.” — 10-year-old player during playtest session_

**Game data shows:** 35% of players who manually build teams exit the game within 5 minutes, while players using random draws play an average of 40% longer per session.

---

## Goals

- Give players quick inspiration for new team ideas (**random card ≤300 ms**)
- Play sessions average 2 minutes shorter when pre-selecting cards; aim to close this gap
- Reduce time-to-inspiration by 50% compared to manual team-building (reduce average team-building time from 30 seconds to ≤15 seconds)
- Ensure each card draw completes in ≤300ms in 95% of cases
- Achieve 95% error-free card draws across 1000 consecutive draws
- ≥90% of random draws complete in ≤300ms on mid-tier devices
- ≤1% fallback error rate over 1000 draws
- Average time spent on Random Judoka screen ≥40% higher than average team-building time for players who only pre-select cards
- ≥80% of players use the Draw button at least once per session in the first week post-launch

---
## Non-Goals

- Complex filters or search
- Persistent card history or logs of previous draws
- Weighted draws (favoring certain judoka)
- Advanced filters or rarity-based restrictions

---

## Prioritized Functional Requirements

| Priority | Feature                         | Description                                                                            |
| :------: | :------------------------------ | :------------------------------------------------------------------------------------- |
|  **P1**  | Draw Random Judoka              | Automatically display a random judoka on page load and when the Draw button is tapped. |
|  **P1**  | Animation Timing                | Card reveal animation completes within 500ms and respects Reduced Motion settings.     |
|  **P2**  | Fallback Card                   | If the judoka list is empty or fails to load, show a default placeholder card.         |
|  **P2**  | Disable Interaction During Draw | Prevent repeated taps while a new card is loading.                                     |
|  **P3**  | Optional Sound Toggle           | Play a short draw sound when enabled; default off.                                     |

---

## Acceptance Criteria

- A random judoka is displayed on each visit.
- Each random judoka is displayed within 300ms in at least 95% of cases (matches performance goal wording).
- Draw button reliably refreshes card on tap (≥99% tap success).
- Show fallback card if judoka list is empty (displays in <1s in 99% of cases).
- Respect OS-level Reduced Motion settings (disable animations when active).
- Sound is off by default.

---


## Dependencies

- Access to the full judoka list
- Uses `generateRandomCard` as described in [prdDrawRandomCard.md](prdDrawRandomCard.md)

---

## Technical Considerations

- Caching, randomness, and fallback logic are handled by `generateRandomCard`

---

## Edge Cases / Failure States

- Handled by `generateRandomCard` (empty list fallback, error logging, and graceful cancellation)

---

## Open Questions

- **Pending:** Decide whether favourites influence the random selection.

---

## UI Design

### Design and UX Considerations

#### Layout and Interaction

- **Main Screen Structure:**
  - **Card Display Area:** Centered large card placeholder with dynamic content
  - **Action Buttons:**
    - Prominent “Draw Card!” button below the card, centered, clear label
- **Draw Flow:**
  1. Player loads the screen → random judoka card appears automatically
  2. Player taps “Draw Card!” button → new random card slides or fades in
  3. If Reduced Motion or manual animation toggle is active, card changes instantly without animation
- **Button Size:**
  - Minimum: 64px height × 300px width for easy tapping, especially for kids
  - Style: Capsule shape using `--radius-pill` for consistent branding

#### Animation and Transitions

- **Card Reveal Animation:**
  - Slide-in from bottom or fade-in (duration: 300–500ms)
  - Maintain ≥60fps on devices with ≥2GB RAM
- **Fallback:**
  - If animation performance drops below 50fps, degrade to static card reveal
- **Button Feedback:**
  - Press: Slight scale-in (95% size) for ~100ms
  - Disabled state: Lower opacity (50%), disable input if judoka list is empty or draw is in progress

#### Accessibility

- Detect OS-level Reduced Motion; disable animations if active
- Provide manual animation toggle (default ON)
- Tap targets ≥44px × 44px (64px recommended for kid-friendly design). See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)
- Text must meet WCAG 2.1 AA 4.5:1 contrast ratio (verify with automated tools)
- All buttons and states require clear text labels
- The Draw button uses `aria-label="Draw a random judoka card"` so screen readers
  announce a consistent name even if the visible text changes

#### Responsiveness

- **Mobile (<600px):** card fills ~70% of viewport; draw button spans nearly full width
- **Tablet/Desktop (>600px):** card ~40% of viewport; centered draw button with spacing
- **Landscape Support:** components reposition vertically or side-by-side
- Card container uses `min-height: 50dvh` to keep the Draw button visible on small screens
- The Draw button and its toggles must remain fully visible within the viewport even with the fixed footer navigation present
- `.card-section` uses `padding-bottom: calc(var(--footer-height) + env(safe-area-inset-bottom))` so buttons stay visible above the footer

#### Audio Feedback (Optional Enhancement)

- Chime/swoosh sound <1 second, volume at 60% of system volume
- Mute option via toggle icon near the draw button (default: sound off)

#### Visual Mockup Description

- **Draw Button Area:** prominent pill-shaped “Draw Card!” button prefixed with a draw icon, with mute and animation toggles ~24px below the card

---

## Tasks

- [x] **1.0 Integrate `generateRandomCard`**
  - [x] 1.1 Trigger the function on screen load
  - [x] 1.2 Call it again when the Draw button is tapped
- [x] **2.0 Build layout and controls**
  - [x] 2.1 Create card display area and prominent Draw button
  - [x] 2.2 Add Animation and Sound toggle switches below the Draw button
- [ ] **3.0 Accessibility & fallback**
  - [ ] 3.1 Verify WCAG contrast and tap target sizes
  - [x] 3.2 Display fallback card on error using the module

---

[Back to Game Modes Overview](prdGameModes.md)
