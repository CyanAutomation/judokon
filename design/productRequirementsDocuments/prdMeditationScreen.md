# PRD: Meditation Screen

---

## TL;DR

This PRD defines a Meditation Screen for Ju-Do-Kon! to provide a moment of calm between intense battles. By combining a wise quote with the soothing presence of helper character KG, players are encouraged to pause, reflect, and regain balance, improving pacing, focus, and long-term engagement.

---

## Description

Introduce a **meditation screen** (meditation.html) that players can access as a moment of calm between battles. The helper character **KG** appears alongside a random wise quote (an excerpt from Aesop’s Fables), helping players reset their mindset and reflect. Inspired by real-life judo practice—where athletes take time to breathe and refocus—this moment of stillness encourages resilience and clarity.

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

- Allow players to access this screen optionally by the main menu or main navigation bar
- Maintain load time under 1 second.
- Ensure error-free quote display across landscape and portrait orientations.
- Give players a mindful moment to reset between matches.
- Offer an experience that aligns with judo’s real-world ethos of reflection.

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
|  **P3**  | Accessibility Support                   | Enable screen reader compatibility for quote text display.              |

---

## Acceptance Criteria

- AC-1 KG character appears on the meditation screen.
- AC-2 Random quote displayed from `aesopsFables.json`; fallback reflection quote appears if the dataset is unavailable.
- AC-3 Screen loads within 1 second.
- AC-4 Quote text has ARIA markup and maintains contrast ratio of at least **4.5:1**.
- AC-5 "Continue Your Journey" button uses `--radius-md`, stays ≥48px tall with tap target ≥44px × 44px, and is keyboard focusable.
- AC-6 Layout adapts to screen orientation (portrait/landscape) and all interactive elements remain keyboard accessible.

---

## Non-Goals

- Provide detailed meditation instruction or audio guidance.
- Translate the entire UI into Japanese.

## Dependencies / Integrations

- Quote data from `aesopsFables.json`.
- KG character assets and image loader.
- Linked from the main navigation menu.

## Open Questions

- Should quotes rotate automatically after a delay?
- Do players need a skip option to bypass the screen entirely?

---

## Edge Cases / Failure States

- **Failure to load quote data**: Display a calming default message such as _“Take a breath. Even a still pond reflects the sky.”_
- **Offline mode**: Display fallback quote.

---

## Player Flow

- Player selects Meditation from main menu or navigation bar.
- Meditation screen loads in ≤1s.
- Skeleton loader appears if quote data is still fetching.
- KG image and random quote fade in smoothly.
- Player reads quote → taps “Continue Your Journey” button.
- Player returns to main menu or resumes gameplay.

---

## Design and UX Considerations

- KG character is placed on the left side, taking approximately 1/8th of the screen.
- Quote occupies the right-hand side in desktop/landscape view and moves below the image on mobile/portrait.
- The "Continue Your Journey" button uses `var(--button-bg)` with `var(--button-text-color)` text and `--radius-md` corners.
- Background color comes from `var(--color-tertiary)` for a neutral tone.
- Quote text uses the base sans-serif font at 18px minimum.

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
- Dynamic font scaling for different screen sizes
- Skeleton loader animation while quote loads
- - 200ms fade animation when language is toggled

**Why:**  
Ensures readability while preventing jarring fallback errors, and enhances contextual clarity and smooth interaction, keeping actions tied to relevant content.

---

### 3. Action Button Module

**Contents:**

- Large, thumb-friendly button (min 48px height) with `--radius-md` corners
- Calming label: _“Continue Your Journey”_
- Uses `var(--button-bg)` and `var(--button-text-color)`
- Anchored close to the quote with clear margin spacing

**Why:**  
Provides agency without pressure. Allows the player to re-enter gameplay at their own pace. And prevents accidental taps and creates distinct flow—finish reading before proceeding.

---
## 6. Non-Goals

- Provide guided breathing audio or meditation music.
- Introduce scoring or competitive mechanics.
- Replace existing downtime screens outside the Meditation feature.

## 7. Technical Considerations

- Fetch quotes asynchronously with graceful error handling.
- Reuse existing HTML template and component structure.
- Loading spinner and CTA button use design tokens such as `var(--button-bg)` and `var(--button-hover-bg)`.
- Keep page weight minimal to meet the 1s load target.

## 8. Dependencies and Integrations

- Quote data file: `aesopsFables.json`.
- KG character assets from the core game.
- Navigation system for entering and exiting the screen.

## 9. Open Questions

- Should players be able to disable the Meditation screen entirely?
- Will background audio be added in a later version?
- Are translations needed beyond English and Japanese?

---
## Tasks

- [ ] **1.0 Implement Meditation Feedback Module**

  - [x] 1.1 Load and display KG character image.
  - [ ] 1.2 Add calm headline (“Pause. Breathe. Reflect.”).

- [ ] **2.0 Implement Quote Display Module**

  - [x] 2.1 Randomly select a quote from `aesopsFables.json`.
  - [ ] 2.2 Display the quote with dynamic, responsive text scaling.
  - [ ] 2.3 Implement skeleton loader while fetching quote using the existing loading spinner styled with `var(--button-bg)`.
  - [ ] 2.4 Fallback to default calm message if quote data fails.

- [ ] **3.0 Implement Action Button Module**

  - [ ] 3.1 Add large, thumb-friendly CTA button ("Continue When Ready").
  - [ ] 3.2 Style CTA button with `var(--button-bg)` and `var(--button-hover-bg)`; ensure minimum 48px height and proper spacing.

- [ ] **4.0 Accessibility**

  - [ ] 4.1 Add ARIA tags for screen readers.

- [ ] **5.0 Performance & Load Time Optimization**
  - [ ] 5.1 Optimize image and text asset load times to under 1 second.
  - [ ] 5.2 Implement responsive grid and flexbox for various screen sizes (portrait/landscape).

---

  [Back to Game Modes Overview](prdGameModes.md)
