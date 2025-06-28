# PRD: Meditation Screen

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

---

## Functional Requirements

| Priority | Feature                                 | Description                                                             |
| :------: | :-------------------------------------- | :---------------------------------------------------------------------- |
|  **P1**  | KG Image & Random Quote Display         | Show KG character and random quote as a moment of calm reflection.      |
|  **P2**  | Quote Fallback & Load Time Optimization | Display default reflection message if data fails, ensure <1s load time. |
|  **P3**  | Accessibility Support                   | Enable screen reader compatibility for quote text display.              |

---

## Acceptance Criteria

- KG character appears on the meditation screen.
- Random quote displayed from `aesopsFables.json`.
- If dataset not available, fallback reflection quote appears.
- Screen loads within 1 second.
- Text is screen-reader accessible (ARIA tags).
- Layout adapts to screen orientation (portrait/landscape).

---

## Edge Cases / Failure States

- **Failure to load quote data**: Display a calming default message such as _“Take a breath. Even a still pond reflects the sky.”_
- **Offline mode**: Display fallback quote.

---

## Design and UX Considerations

- KG character is placed on the left side, taking approximately 1/8th of the screen.
- Quote occupies the right-hand side in desktop/landscape view.
- On mobile/portrait view, KG image is above the quote.
- Proceed button is consistently placed at the bottom of the screen.
- Background is soft and neutral
- Quote text uses a legible, sans-serif font, sized 18px minimum.

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

- Large, thumb-friendly button (min 48px height)
- Calming label: _“Continue Your Journey”_
- Button anchored close to quote with clear margin spacing
- Clear visual separation from quote/toggle above

**Why:**  
Provides agency without pressure. Allows the player to re-enter gameplay at their own pace. And prevents accidental taps and creates distinct flow—finish reading before proceeding.

---

## Tasks

- [ ] **1.0 Implement Meditation Feedback Module**

  - [x] 1.1 Load and display KG character image.
  - [ ] 1.2 Add calm headline (“Pause. Breathe. Reflect.”).

- [ ] **2.0 Implement Quote Display Module**

  - [x] 2.1 Randomly select a quote from `aesopsFables.json`.
  - [ ] 2.2 Display the quote with dynamic, responsive text scaling.
  - [ ] 2.3 Implement skeleton loader while fetching quote.
  - [ ] 2.4 Fallback to default calm message if quote data fails.

- [ ] **3.0 Implement Action Button Module**

  - [ ] 3.1 Add large, thumb-friendly CTA button ("Continue When Ready").
  - [ ] 3.2 Ensure CTA button has minimum 48px height and proper spacing.

- [ ] **4.0 Accessibility**

  - [ ] 4.1 Add ARIA tags for screen readers.

- [ ] **5.0 Performance & Load Time Optimization**
  - [ ] 5.1 Optimize image and text asset load times to under 1 second.
  - [ ] 5.2 Implement responsive grid and flexbox for various screen sizes (portrait/landscape).
