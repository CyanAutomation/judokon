# PRD: Meditation Screen (Zen mode)

---

## TL;DR

This PRD defines a Meditation Screen (Zen mode) for Ju-Do-Kon! to provide a moment of calm between intense battles. By combining a wise quote with the soothing presence of helper character KG, players are encouraged to pause, reflect, and regain balance, improving pacing, focus, and long-term engagement.

---

## Description

Introduce a **meditation screen** (`meditation.html`) that players can access as a moment of calm between battles. The helper character **KG** appears alongside a random wise quote (an excerpt from Aesop’s Fables), helping players reset their mindset and reflect. Inspired by real-life judo practice—where athletes take time to breathe and refocus—this moment of stillness encourages resilience and clarity.

---

## Problem Statement

Currently, there’s no structured moment for players to mentally reset between intense card battles. Without a calming intermission, the game may feel relentless or emotionally taxing. The meditation screen provides intentional space to pause, reflect, and regain balance. This emotional pacing enhances player experience and keeps engagement healthy and sustainable.

---

## Impact if Not Solved

Players may experience cognitive fatigue or emotional burnout from back-to-back matches, leading to reduced enjoyment and decreased long-term retention.

---

## Behavioral Insight

Players benefit from rhythm and pacing. Periods of calm after periods of intensity improve focus and enjoyment. Adding a reflective break strengthens overall game flow and user wellbeing.

---

## Goals

- Allow players to access this screen optionally by the main menu or main navigation bar.
- Maintain load time under 1 second.
- Ensure error-free quote display across landscape and portrait orientations.
- Give players a mindful moment to reset between matches.
- Offer an experience that aligns with judo’s real-world ethos of reflection.

---

## Non-Goals

- No guided meditation instruction, breathing audio, or meditation music.
- No translation of the entire UI into Japanese or other languages (quotes only).
- Not intended to replace existing downtime screens outside the Meditation feature.
- No scoring, competitive mechanics, or gamification within the meditation screen.

---

## User Stories

- As a player feeling overwhelmed after a tough battle, I want a calm screen so I can reset before the next match.
- As a player using a screen reader, I want the quote to be accessible so I don’t miss the reflection.
- As a mobile player, I want a clear, large “Continue” button so I can resume gameplay at my own pace.

---

## Functional Requirements

| Priority | Feature                                 | Description                                                             |
| :------: | :-------------------------------------- | :---------------------------------------------------------------------- |
|  **P1**  | KG Image & Random Quote Display         | Show KG character and random quote as a moment of calm reflection.      |
|  **P2**  | Quote Fallback & Load Time Optimization | Display default reflection message if data fails, ensure <1s load time. |
|  **P2**  | Fade-In Animation                       | Quote and image fade in once loaded (≤300ms).                           |
|  **P3**  | Dynamic Font Scaling                    | Quote text scales smoothly across breakpoints.                          |
|  **P3**  | Accessibility Support                   | Enable screen reader compatibility for quote text and toggle button.    |

---

## Acceptance Criteria

- **AC-1:** KG character appears on the meditation screen.
- **AC-2:** Random quote displayed from `aesopsFables.json` with metadata from `aesopsMeta.json`; fallback reflection quote appears if the datasets are unavailable.
- **AC-3:** Screen loads within 1 second.
- **AC-4:** Quote and KG image fade in within 300ms after assets load.
- **AC-5:** Quote text has ARIA markup, scales responsively across breakpoints, and maintains contrast ratio of at least **4.5:1** (tested in `meditationContrast.test.js`).
- **AC-6:** "Continue Your Journey" button uses `--radius-md`, stays ≥44px tall with tap target ≥44px × 44px, and is keyboard focusable. See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness).
- **AC-7:** Layout adapts to screen orientation (portrait/landscape) and all interactive elements remain keyboard accessible, including the language toggle which is announced when it becomes visible.

---

## Dependencies / Integrations

- Quote data from `aesopsFables.json` and `aesopsMeta.json`.
- KG character assets and image loader.
- Linked from the main navigation menu.

---

## Edge Cases / Failure States

- **Failure to load quote data:** Display a calming default message such as _“Take a breath. Even a still pond reflects the sky.”_
- **Offline mode:** Display fallback quote.

---

## Player Flow

1. Player selects Meditation from main menu or navigation bar.
2. Meditation screen loads in ≤1s (load time logged to console).
3. Skeleton loader appears if quote data is still fetching.
4. KG image and random quote fade in smoothly (**fade ≤300 ms**) once assets are ready.
5. Player reads quote → taps “Continue Your Journey” button.
6. Player returns to the main menu.

---

## Design and UX Considerations

- KG character is placed on the left side, taking approximately 1/8th of the screen.
- Quote occupies the right-hand side in desktop/landscape view and moves below the image on mobile/portrait.
- On large desktop screens (≥ `var(--breakpoint-lg)`), the quote heading and text expand to the full width of the container for comfortable reading.
- The "Continue Your Journey" button uses `var(--button-bg)` with `var(--button-text-color)` text and `--radius-md` corners.
- Background color comes from `var(--color-tertiary)` for a neutral tone.
- Quote text uses the base sans-serif font at 18px minimum.
- Quote text uses the base sans-serif font with `clamp()` for dynamic scaling across screen sizes (18px minimum).
- Includes a pseudo-Japanese quote toggle for immersive effect. See [PRD: Pseudo-Japanese Text Conversion Function](prdPseudoJapanese.md) for details.

| Meditation Screen Mockup A                          | Meditation Screen Mockup B                          |
| --------------------------------------------------- | --------------------------------------------------- |
| ![Mockup A](/design/mockups/mockupQuoteScreen3.png) | ![Mockup B](/design/mockups/mockupQuoteScreen4.png) |

---

### 1. Meditation Feedback Module

**Contents:**

- Soothing headline: _“Pause. Breathe. Reflect.”_
- KG image with open hand or seated meditative pose, visually leading into the quote

**Why:**

Sets the emotional tone. Not a reward, but a rest—balancing the intensity of gameplay with stillness.

---

### 2. Quote Display Module

**Contents:**

- Responsive quote text block with max-width control
- Dynamic font scaling for different screen sizes using CSS `clamp()`
- Skeleton loader animation while quote loads
- 200ms fade animation when language is toggled
- Typewriter animation code exists but is no longer used on this screen

**Why:**

Ensures readability while preventing jarring fallback errors, and enhances contextual clarity and smooth interaction (**UI responses <200 ms**), keeping actions tied to relevant content.

---

### 3. Action Button Module

**Contents:**

- Large, thumb-friendly button (min 44px height) with `--radius-md` corners
- Calming label: _“Continue Your Journey”_
- Uses `var(--button-bg)` and `var(--button-text-color)`
- Anchored close to the quote with clear margin spacing

**Why:**

Provides agency without pressure. Allows the player to re-enter gameplay at their own pace. And prevents accidental taps and creates distinct flow—finish reading before proceeding.

---

## Non-Functional Requirements

- Fetch quotes asynchronously with graceful error handling.
- Reuse existing HTML template and component structure.
- Loading spinner and CTA button use design tokens such as `var(--button-bg)` and `var(--button-hover-bg)`.
- Keep page weight minimal to meet the 1s load target.

---

## Dependencies and Integrations

- Quote data files: `aesopsFables.json` and `aesopsMeta.json`.
- KG character assets from the core game.
- Navigation system for entering and exiting the screen.
- Pseudo-Japanese Text Conversion Function for quote toggle ([prdPseudoJapanese.md](prdPseudoJapanese.md)).
- Typewriter effect module retained in codebase for potential reuse.

---

## Open Questions

- **Pending:** Decide whether players can disable the Meditation screen entirely.
- **Pending:** Determine if background audio will be added in a later version.
- **Pending:** Confirm translation requirements beyond English and Japanese.
- **Pending:** Decide whether quotes rotate automatically after a delay.
- **Pending:** Determine if players need a skip option to bypass the screen entirely.

---

## Tasks

- [x] **1.0 Implement Meditation Feedback Module**
  - [x] 1.1 Load and display KG character image.
  - [x] 1.2 Add calm headline (“Pause. Breathe. Reflect.”).
- [x] **2.0 Implement Quote Display Module**
  - [x] 2.1 Randomly select a quote from `aesopsFables.json` and merge metadata from `aesopsMeta.json`.
  - [x] 2.2 Display the quote with dynamic, responsive text scaling.
  - [x] 2.3 Implement skeleton loader while fetching quote using the existing loading spinner styled with `var(--button-bg)`.
  - [x] 2.4 Fallback to default calm message if quote data fails.
- [x] **3.0 Implement Action Button Module**
  - [x] 3.1 Add large, thumb-friendly CTA button ("Continue Your Journey").
  - [x] 3.2 Style CTA button with `var(--button-bg)` and `var(--button-hover-bg)`; ensure minimum 44px height and proper spacing (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- [x] **4.0 Accessibility**
  - [x] 4.1 Add ARIA tags for screen readers.
- [ ] **5.0 Performance & Load Time Optimization**
  - [ ] 5.1 Optimize image and text asset load times to under 1 second (preload KG sprite, cache quote JSON).
  - [ ] 5.2 Capture asset load times and log results to console for performance tracking.
  - [x] 5.3 Implement responsive grid and flexbox for various screen sizes (portrait/landscape).
- [ ] **6.0 Visual & Accessibility Polish**
  - [ ] 6.1 Use a `.fade-in` class so the KG image and quote block fade in within
        300ms once both assets load (class removed via JS).
  - [ ] 6.2 Ensure quote text scales smoothly across breakpoints and add unit
        test `meditationContrast.test.js` verifying quote text contrast ≥4.5.
  - [ ] 6.3 Announce language toggle with aria-live and shift focus when it becomes visible.

---

**See also:**

- [PRD: Pseudo-Japanese Text Conversion Function](prdPseudoJapanese.md)

[Back to Game Modes Overview](prdGameModes.md)
