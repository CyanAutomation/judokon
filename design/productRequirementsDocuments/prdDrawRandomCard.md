# PRD – Function to Draw Random Card

---

## TL;DR
This PRD defines the Draw Random Card function for Ju-Do-Kon!, providing a fast, engaging, and accessible way to select random cards during matches. The feature increases excitement, replayability, and average session time, with performance targets of ≤300ms draw speed and ≥60fps animations.

> Hiroshi faces his rival in Ju-Do-Kon!’s Classic Battle. He taps “Draw Card” — a new Judoka card slides onto the screen, its stats flashing dramatically. Hiroshi’s heart races, knowing the outcome could change the match. This suspense keeps players coming back for more, fueling longer, more thrilling sessions.

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
- As a player sensitive to motion, I want to disable animations so I can play comfortably.
- As a parent watching my child play, I want the draw button to be large and responsive so they can use it easily.

---

## How It Works

- The player taps the “Draw Card” button which triggers the `generateRandomCard()` function, or
- The player navigates to a designated card draw screen, and this action auto-triggers the `generateRandomCard()` function.
- The system:
  - Selects a random Judoka card from the active card set (isActive = True).
  - Visually reveals the card with a slide animation.
  - Future Enhancement: Plays a short celebratory sound (e.g., swoosh or chime)
  - Ensures animation smoothness at ≥60fps for devices with ≥2GB RAM.
- **Active card set**: The current pool of cards available in the player’s deck, dynamically updated based on the game state.

---

## Technical Considerations

- Use `crypto.getRandomValues()` or equivalent for secure randomness, avoiding predictable PRNG.
- Optimize DOM updates for minimal reflows/repaints during animation.
- Implement debounce to prevent double taps on “Draw Card” button.
- Ensure fallback logic uses a single, consistent error card (judoka id=0).
- Log random draw failures for post-launch debugging and analytics.

---

## Edge Cases / Failure States

- **Same Card Reselection**: Duplicates are possible and expected — randomness allows repeats.
- **Random Pick Failure**: If random draw fails (e.g., due to a code error), show a fallback card (judoka id=0, from judoka.json)
- **Empty Card Set**: Display a predefined error card (judoka id=0, from judoka.json) if no cards are available.
- **Low Performance Devices**: Automatically downgrade to a static reveal if animations cannot sustain 60fps.
- **Accessibility**:
  - Respect system Reduced Motion settings — disable animations if active.
  - Default: Animations ON, but respect system/user preferences.

---

## Goals

| Goal             | Metric                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Fast Response    | Card draw completes in under 300ms.                                                       |
| Smooth Animation | Reveal animation plays at ≥60fps with no visual glitches.                                 |
| Fair Randomness  | Random selection passes chi-square testing for uniformity, 95% confidence over 100 draws. |
| Low Failure Rate | No more than 1% draw failures.                                                            |
| Accessibility    | Automatically disable animations if system Reduced Motion is active.                      |

### User Goals
- Provide an exciting, quick card reveal to keep players engaged.
- Allow players sensitive to motion to control animation settings for comfort.

---

## Draw Card Flow

- Player taps “Draw Card” button.
- System triggers generateRandomCard() function.
- If active card set is not empty: Random card selected, then Card reveal animation plays.
- If active card set is empty or error occurs: Fallback card (judoka id=0) displayed, then Error message shown if applicable.
- User can draw again or exit screen.

---

## Acceptance Criteria

- [ ] When “Draw Card” is triggered, a random card from the active set is displayed within 300ms.
- [ ] A reveal animation (fade or bounce) completes within 500ms at ≥60fps.
- [ ] If the random function fails, a fallback card is shown (judoka id=0, from judoka.json).
- [ ] If the active card set is empty, a fallback card is shown (judoka id=0, from judoka.json).
- [ ] Animation is disabled if the user has enabled Reduced Motion settings.

---

## Prioritized Functional Requirements

| Priority | Feature                        | Description                                                                  |
| -------- | ------------------------------ | ---------------------------------------------------------------------------- |
| P1       | Random Card Selection          | Select a random card from the active card set dynamically.                   |
| P1       | Display Selected Card          | Visually reveal the selected card with animation and sound feedback.         |
| P2       | Fallback on Failure            | Show fallback card and error message if draw fails or active set is empty.   |
| P2       | Reusable Random Draw Module    | Make the random draw callable from multiple game states or screens.          |
| P3       | Accessibility Support          | Support Reduced Motion settings and maintain color contrast and readability. |
| P3       | UX Enhancements                | Optimize for 60fps animation, sound effect, and large tap targets.           |
| P3       | Sound & Animation User Toggles | Allow users to manually mute sounds and disable animations if desired.       |

---

## Design and User Experience Considerations

- **Animation Style**: Fade or slide only — no flips or excessive transitions to keep visuals polished.
- **Sound Effect**: Short celebratory chime or swoosh (<1 second) - future enhancement
- **Responsiveness**:
  - Smooth transitions at ≥60fps.
  - Degrade to static reveal if hardware performance is low.
- **Accessibility**:
  - Respect system Reduced Motion settings (disable animations automatically).
  - Ensure color contrast and text readability on cards (WCAG AA compliance).
- **Default Setting**: Animations and sound OFF unless user/system preferences state otherwise.
- **Fallback Visuals**:
  - If card loading fails, show a placeholder/error graphic (judoka id=0, from judoka.json).
- **Tap Target Size**:
  - All interactive elements (Draw button) must be ≥48px in height and width, with a recommended 64px for kid-friendly ease.
- **Button Size**: Minimum 64px high, 300px wide — central and dominant.
- **Card Size**: Large enough for excitement, but responsive — 70% of viewport width on mobile, 40% on tablet/desktop.
- **Spacing**: Tight vertical stacking (~24px between card and button).
- **Accessibility**: High contrast placeholders; consider light text on dark backgrounds for error/fallback states.

---

### 1. Top Bar (Persistent Header)

**Contents:**

- **Player Info Module**: “You” + small avatar + status (e.g., “Your Turn” indicator).
- **Settings Button**: Bigger tappable area (48px+), slight margin from edge, no tiny icons.
- **Optional Timer** (future feature): If there’s a time limit per draw.

**Why**: Clear identification + quick settings access without hunting for small buttons.

---

### 2. Central Interaction Block (Main Zone)

**Contents:**

- **Card Placeholder Module**:
  - Start State: “?” icon card.
  - Draw State: Fade-in random card.
  - Fail State: Error card with soft warning text (“Oops! Try again!”).
  - Animation Layer: Reserve transparent zone for bounce/fade animations.
- **Action Button Module**:
  - Giant “Draw Card!” button (64px height min, 90px optimal for kid-friendly tapping).
  - **Loading State**: Button changes to a spinner or text (“Drawing…”).
  - **Error State**: Subtle inline text under the button (“Connection Issue, Showing Backup Card”).

**Why**: Separate content vs. action modules makes touch flow logical and easily adjustable.

---

### 3. Dynamic Feedback (Transitions)

- **Animation Frames**:
  - Stage 1: Button press triggers card slide transition.
  - Stage 2: Card slides to reveal.
- **Fallback**:
  - If fail → fallback card (judoka id=0, from judoka.json) slides in with reduced animation.
- **Accessibility Setting Check**:
  - Automatically downgrade if Reduced Motion is detected — immediately snap card reveal, no slide.

**Why**: Players should _feel_ the result without being confused or left staring at nothing.

---

### 4. Modular Expandability

- Add a “Card History” mini panel (expandable from side or bottom).
- Add mute toggle for sound (little speaker icon on card corner or header).
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
- [ ] 2.0 Develop Card Reveal Animation
  - [ ] 2.1 Implement card slide for card reveal.
  - [ ] 2.2 Ensure animation plays at ≥60fps.
  - [ ] 2.3 Respect Reduced Motion settings and disable animation when active.
- [ ] 3.0 Error and Fallback Handling
  - [ ] 3.1 Display fallback card (judoka id=0, from judoka.json) if random draw fails.
  - [ ] 3.2 Show predefined error card (judoka id=0, from judoka.json) if active card set is empty.
- [ ] 4.0 Accessibility and UX Enhancements
  - [ ] 4.1 Support Reduced Motion settings.
  - [ ] 4.2 Ensure color contrast on cards meets WCAG AA standards.
  - [ ] 4.3 Set all tap targets to ≥48px, recommended 64px for better kid usability.
  - [ ] 4.4 Add sound and animation toggle options for user preferences.
