# PRD: Display Random Judoka

**Game Mode ID:** `12`
**URL:** `randomJudoka.html`

---

## TL;DR

Display Random Judoka gives players instant, inspiring roster ideas by drawing and revealing a random card with fast, smooth animations and full accessibility support — reducing team-building fatigue and increasing session engagement.

> Mia taps “Draw” and a new judoka slides up instantly, surprising her with a powerful pick she hadn’t considered. She taps again, excitedly building a fresh team, and spends twice as long experimenting compared to when she built manually. The bright animations and satisfying feel keep her engaged.

---

## Problem Statement

Players currently experience predictable, repetitive gameplay when they pre-select cards, leading to decreased engagement and shorter session times. Without randomness, team composition lacks inspiration and novelty, causing players to churn or lose interest more quickly.

> _“I always pick the same cards because it’s easier. I get bored of my team really fast.” — 10-year-old player during playtest session_

**Game data shows:** 35% of players who manually build teams exit the game within 5 minutes, while players using random draws play an average of 40% longer per session.

---

## Goals

- Give players quick inspiration for new team ideas (**random card appears in ≤300 ms in ≥95% of sessions, matching Game Modes PRD metric**)

---

## User Stories

- As a player who wants to try new team combinations, I want to draw a random judoka so that I can discover picks I might not have considered.
- As a young player with limited patience, I want the random card to appear instantly so that I stay engaged and don’t get bored waiting.
- As a parent or accessibility user, I want the card reveal to respect Reduced Motion settings so that animations do not cause discomfort.
- As a player who sometimes loses internet or has device issues, I want to see a fallback card if something goes wrong so that the screen never feels broken.

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
|  **P1**  | Animation Timing                | Card reveal animation completes promptly and respects Reduced Motion settings.     |
|  **P2**  | Fallback Card                   | If the judoka list is empty or fails to load, show a default placeholder card.         |
|  **P2**  | Disable Interaction During Draw | Prevent repeated taps while a new card is loading.                                     |

---

## Acceptance Criteria

- A random judoka is displayed on each visit (≥95% of sessions).
- Each random judoka is displayed in ≥95% of cases (matches Game Modes PRD metric).
- Draw button reliably refreshes card on tap (≥99% tap success).
- Show fallback card if judoka list is empty (displays in ≥99% of cases).
- Respect OS-level Reduced Motion settings (disable animations when active).

---

## Dependencies

- Access to the full judoka list
- Uses `generateRandomCard` (see [prdDrawRandomCard.md](prdDrawRandomCard.md)), which:
  - Selects a random judoka from the active set, skipping hidden/inactive cards
  - Guarantees fallback to a default card if the list is empty or an error occurs
  - Honors Reduced Motion and sound settings for accessibility
  - Disables repeated draws during animation/loading
  - Ensures fast, fair, and accessible random selection logic for all game modes
- Reads global sound and motion preferences from `settings.html`

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
  3. If Reduced Motion is active or the player disables motion in `settings.html`, the card changes instantly without animation
- **Button Size:**
  - Minimum: 64px height × 300px width for easy tapping, especially for kids
  - Style: Capsule shape using `--radius-pill` for consistent branding

#### Animation and Transitions

- **Card Reveal Animation:**
  - Slide-in from bottom or fade-in
- **Fallback:**
  - If animation performance drops, degrade to static card reveal
- **Button Feedback:**
  - Press: Slight scale-in (95% size) for ~100ms
  - Disabled state: Lower opacity (50%), disable input if judoka list is empty or draw is in progress

#### Accessibility

- Detect OS-level Reduced Motion; disable animations if active
- Sound and motion preferences are configured via `settings.html` (no on-screen toggles)
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
- The Draw button must remain fully visible within the viewport even with the fixed footer navigation present
- `.card-section` uses `padding-bottom: calc(var(--footer-height) + env(safe-area-inset-bottom))` so buttons stay visible above the footer

#### Audio Feedback (Optional Enhancement)

- Chime/swoosh sound <1 second, volume at 60% of system volume
- Sound effect plays only when enabled in `settings.html`

#### Visual Mockup Description

- **Draw Button Area:** prominent pill-shaped “Draw Card!” button prefixed with a draw icon; sound and motion settings live in `settings.html`

---

## Tasks

- [x] **1.0 Integrate `generateRandomCard`**
  - [x] 1.1 Trigger the function on screen load
  - [x] 1.2 Call it again when the Draw button is tapped
- [x] **2.0 Build layout and controls**
  - [x] 2.1 Create card display area and prominent Draw button
- [ ] **3.0 Accessibility & fallback**
  - [ ] 3.1 Verify WCAG contrast and tap target sizes (manual/automated check needed)
  - [x] 3.2 Display fallback card on error using the module
- [ ] **4.0 Reduced Motion & Animation**
  - [ ] 4.1 Honor animation preference from `settings.html`
  - [x] 4.2 Respect OS-level Reduced Motion setting (logic present)
  - [ ] 4.3 Ensure all card reveal animations are fully disabled when Reduced Motion or the global preference is active (verify in UI and CSS)
- [ ] **5.0 Audio Feedback**
  - [ ] 5.1 Play draw sound effect when global sound setting in `settings.html` is enabled
  - [ ] 5.2 Confirm sound is off by default in `settings.html`
- [ ] **6.0 Button Interaction**
  - [x] 6.1 Disable Draw button during card animation/loading
  - [ ] 6.2 Add visual feedback for button press (scale-in effect)
- [ ] **7.0 UI Responsiveness**
  - [ ] 7.1 Ensure Draw button remains visible above footer on all screen sizes (manual/automated check needed)
  - [ ] 7.2 Card and controls layout matches mobile/tablet/desktop requirements
- [ ] **8.0 Testing**
  - [ ] 8.1 Add/verify unit tests for random card logic
  - [ ] 8.2 Add/verify Playwright UI tests for draw flow, fallback, and accessibility

---

[Back to Game Modes Overview](prdGameModes.md)
