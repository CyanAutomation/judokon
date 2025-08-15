# PRD: Draw Random Card Function

---

## TL;DR

This PRD defines the Draw Random Card function for Ju-Do-Kon!, providing a fast, engaging, and accessible way to select random cards during matches. The feature increases excitement, replayability, and average session time, with performance targets of ≤300ms draw speed and ≥60fps animations.

> Hiroshi faces his rival in Ju-Do-Kon!’s Classic Battle. He taps “Draw Card!” — a new Judoka card slides onto the screen, its stats flashing dramatically. Hiroshi’s heart races, knowing the outcome could change the match. This suspense keeps players coming back for more, fueling longer, more thrilling sessions.

---

## Problem Statement

As part of the web browser-based game **Ju-Do-Kon!**, players often need to draw a random card during matches. This mechanic injects vital excitement and unpredictability, ensuring players never know what card will come next. The uncertainty heightens the tension of one-on-one battles, making matches feel dynamic, surprising, and deeply engaging.

Without this feature, players would be forced to pre-select cards, leading to predictable, repetitive gameplay that diminishes replayability and player engagement.

**Playtest feedback:**

> “I love not knowing what card will pop up next — it makes it so much more exciting!” — Sanshiro, age 10

**This function is critical for:**

- Enhancing pacing — sustaining game flow without manual selection delays.
- Increasing replayability — ensuring different match outcomes on each playthrough.
- Boosting session duration — expected to increase session time by at least 10% due to heightened player engagement and tension.

---

## User Stories

- As a player who loves surprises, I want each card draw to feel random so battles stay exciting.
- As a player sensitive to motion, I want animations to respect my settings so I can play comfortably.
- As a parent watching my child play, I want the draw button to be large and responsive so they can use it easily.
- As a developer, I want the random card draw logic to be consistent across all features that use it.

---

## How It Works

- The player taps the “Draw Card!” button which triggers the `generateRandomCard()` function, or
- The player navigates to a designated card draw screen, and this action auto-triggers the `generateRandomCard()` function.
- The system:
  - Selects a random Judoka card from the active card set (isActive = True).
  - Visually reveals the card with a slide animation.
  - Future Enhancement: Plays a short celebratory sound (e.g., swoosh or chime) when sound is enabled in `settings.html`
  - Ensures animation smoothness for devices .
- **Active card set**: The current pool of cards available in the player’s deck, dynamically updated based on the game state.

---

## Technical Considerations

- Use `crypto.getRandomValues()` or equivalent for secure randomness, avoiding predictable PRNG.
- Optimize DOM updates for minimal reflows/repaints during animation.
- Implement debounce to prevent double taps on “Draw Card!” button.
- Ensure fallback logic uses a single, consistent error card (judoka id=0).
  The `getFallbackJudoka()` helper loads and caches this entry from
  `judoka.json`.
- Log random draw failures for post-launch debugging and analytics.
- Skip judoka entries where `isHidden` is `true`.

---

## Dependencies and Integrations

- `judoka.json` and `gokyo.json` datasets for card and technique data.
- `generateJudokaCardHTML()` and `getRandomJudoka()` helper functions.
- Existing game UI shell built from `game.js` and navigation modules.

---

## Implementation

The random draw logic is implemented in `src/helpers/randomCard.js`. Its
`generateRandomCard()` function handles dataset loading, card selection, and
rendering. This module is used in **Classic Battle** as well as all **Team
Battle** variants (Female, Male, and Mixed).

Card reveal animations are handled by the `.animate-card` CSS class defined in
`src/styles/buttons.css` (imported via `src/styles/components.css`). The class
applies a short fade and upward slide on card insert. A media query removes this
animation when a user has **Reduced Motion** enabled, ensuring the card appears
instantly without movement.

---

## Edge Cases / Failure States

- **Same Card Reselection**: Duplicates are possible and expected — randomness allows repeats.
- **Random Pick Failure**: If random draw fails (e.g., due to a code error), show a fallback card (judoka id=0, from `judoka.json`) via `getFallbackJudoka()`
- **Empty Card Set**: Display a predefined error card (judoka id=0, from judoka.json) if no cards are available.
- **Accessibility**:
  - Respect system Reduced Motion and global motion settings — disable animations if either is active.
  - Default: Animations ON for device smoothness, unless disabled by system Reduced Motion or in `settings.html`.
  - Provide an `aria-label` on the Draw button so the accessible name stays
    "Draw a random judoka card" even when the visible text is updated.

---

## Goals

- Provide a fast, fair, and accessible way to select a random Judoka card during matches.
- Ensure the function is reusable across all game modes and screens that require random card draws.
- Maintain consistent logic and behavior with the Random Judoka feature (see cross-reference below).
- Support smooth, engaging animations and accessibility compliance.

### User Goals

- Provide an exciting, quick card reveal to keep players engaged.
- Ensure animations honor global motion settings so players sensitive to motion can play comfortably.

---

## Non-Goals

- Balancing or adjusting card rarity odds.
- Complex particle effects or 3D animations.
- Deck customization, trading, or collection management.
- Expansive sound design beyond a simple chime.

---

## Draw Card Flow

- Player taps “Draw Card!” button.
- System triggers generateRandomCard() function.
- If active card set is not empty: Random card selected, then Card reveal animation plays.
- If active card set is empty or error occurs: Fallback card (judoka id=0) displayed.
- User can draw again or exit screen.

---

## Acceptance Criteria

- When “Draw Card” is triggered, a random card from the active set is displayed.
- A reveal animation (fade and slide via `.animate-card`).
- If the random function fails, a fallback card is shown (judoka id=0, from judoka.json).
- If the active card set is empty, a fallback card is shown (judoka id=0, from judoka.json).
  Both cases rely on the shared `getFallbackJudoka()` helper.
- Animation is disabled if the user has enabled Reduced Motion or disabled motion in `settings.html`.

---

## Prioritized Functional Requirements

| Priority | Feature                        | Description                                                                  |
| -------- | ------------------------------ | ---------------------------------------------------------------------------- |
| P1       | Random Card Selection          | Select a random card from the active card set dynamically.                   |
| P1       | Display Selected Card          | Visually reveal the selected card with animation and sound feedback.         |
| P2       | Fallback on Failure            | Show fallback card if draw fails or active set is empty.                     |
| P2       | Reusable Random Draw Module    | Make the random draw callable from multiple game states or screens.          |
| P3       | Accessibility Support          | Honor Reduced Motion and sound settings from `settings.html` and maintain color contrast and readability. |
| P3       | UX Enhancements                | Optimize for animation, sound effect, and large tap targets.                 |

---

## Design and User Experience Considerations

- **Animation Style**: Fade or slide only — no flips or excessive transitions to keep visuals polished.
- **Sound Effect**: Short celebratory chime or swoosh (<1 second) when sound is enabled in `settings.html` – future enhancement
- **Responsiveness**:
  - Smooth transitions.
  - Degrade to static reveal if hardware performance is low.
- **Accessibility**:
  - Respect system Reduced Motion and global motion settings (disable animations automatically).
  - Ensure color contrast and text readability on cards (WCAG AA compliance; validate with `npm run check:contrast`).
  - Animations and sound follow global preferences from `settings.html` (default ON).
- **Fallback Visuals**:
  - If card loading fails, show a placeholder card (judoka id=0, from judoka.json).
- **Tap Target Size**:
  - All interactive elements (Draw button) must be ≥44px in height and width, with a recommended 64px for kid-friendly ease. See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness).
- **Button Size**: Minimum 64px high, 300px wide — central and dominant. Use `--radius-pill` for a capsule shape.
- **Card Size**: Large enough for excitement, but responsive — 70% of viewport width on mobile, 40% on tablet/desktop.
- **Spacing**: Tight vertical stacking (~24px between card and button).
- **Accessibility**: High contrast placeholders.

---

### 1. Top Bar (Persistent Header)

**Contents:**

- **Player Info Module**: “You” + small avatar + status (e.g., “Your Turn” indicator).
- **Optional Timer** (future feature): If there’s a time limit per draw.

**Why**: Clear identification of player status.

---

### 2. Central Interaction Block (Main Zone)

**Contents:**

- **Card Placeholder Module**:
  - Start State: “?” icon card.
  - Draw State: Random card fades and slides in using the `.animate-card` class.
  - Animation Layer: Reserve transparent zone for slide/fade animations.
- **Action Button Module**:
  - Giant “Draw Card!” button (64px height min, 90px optimal for kid-friendly tapping).
  - **Loading State**: Button changes to a spinner or text (“Drawing…”).

**Why**: Separate content vs. action modules makes touch flow logical and easily adjustable.

---

### 3. Dynamic Feedback (Transitions)

- **Animation Frames**:
  - Stage 1: Button press triggers card slide transition.
  - Stage 2: Card fades and slides in using `.animate-card`.
- **Fallback**:
  - If fail → fallback card (judoka id=0, from judoka.json) slides in with reduced animation.
- **Accessibility Setting Check**:
  - Automatically downgrade if Reduced Motion is detected or motion is disabled in `settings.html` — immediately snap card reveal, no slide.

**Why**: Players should _feel_ the result without being confused or left staring at nothing.

---

### 4. Modular Expandability

- Add a “Card History” mini panel (expandable from side or bottom).
- Pre-wire zones for device scaling:
  - Flexbox/grid layout so the card & button center stack on small screens, side-by-side on tablets.

---

| **Draw Random Card Mockup 1**                                     |                                     **Draw Random Card Mockup 2** |
| ----------------------------------------------------------------- | ----------------------------------------------------------------: |
| ![Draw Random Card Mockup 1](/design/mockups/mockupDrawCard1.png) | ![Draw Random Card Mockup 2](/design/mockups/mockupDrawCard2.png) |

---

## Tasks

- [x] 1.0 Implement Random Card Draw Function
  - [x] 1.1 Create `generateRandomCard()` function to select random card from active set.
  - [x] 1.2 Integrate card draw with UI trigger ("Draw Card" button).
- [x] 2.0 Develop Card Reveal Animation
  - [x] 2.1 Implement `.animate-card` class for fade/slide card reveal.
  - [x] 2.3 Respect Reduced Motion and global motion settings and disable animation when active.
- [x] 3.0 Error and Fallback Handling
  - [x] 3.1 Display fallback card (judoka id=0, from judoka.json) if random draw fails.
  - [x] 3.2 Show predefined error card (judoka id=0, from judoka.json) if active card set is empty.
- [ ] 4.0 Accessibility and UX Enhancements
- [x] 4.1 Support Reduced Motion and global motion settings.
  - [x] 4.2 Ensure color contrast on cards meets WCAG AA standards. Verified in [`tests/helpers/randomJudokaPage.test.js`](../../tests/helpers/randomJudokaPage.test.js).
  - [ ] 4.3 Set all tap targets to ≥44px, recommended 64px for better kid usability (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)). **[Button styled, but no runtime check]**
  - [ ] 4.4 Play card-draw audio when sound is enabled in `settings.html`. **[Not implemented]**
  - [x] 4.5 Disable the “Draw Card” button while loading or animating a card.
  - [ ] 4.6 Add orientation-based layout rules for portrait vs. landscape. **[Not implemented]**
  - [x] 4.7 Write automated tests verifying color contrast and tap target sizes. See [`tests/helpers/randomJudokaPage.test.js`](../../tests/helpers/randomJudokaPage.test.js).
- [ ] 5.0 Additional Features
  - [ ] 5.1 Implement "Card History" panel. **[Not implemented]**
  - [ ] 5.2 Provide visual or ARIA feedback for loading state. **[Only button disables, no spinner/text]**

---

**Note:**
This PRD covers the technical implementation of the random card draw helper function. For UI details and user-facing flows, see [PRD: Random Judoka](prdRandomJudoka.md). Both documents reference the same logic and should remain consistent.

[Back to Game Modes Overview](prdGameModes.md)
