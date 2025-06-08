# PRD: End Game Quote Screen from KG Character

---

## Description

Introduce a rewarding quote screen that appears when players achieve a perfect victory in team battle mode. Upon winning all six battles, the helper character KG appears alongside a random wise quote (an excerpt from Aesop’s fables). This lighthearted moment aims to reinforce a sense of achievement and motivate players to strive for excellence.

---

## Problem Statement

Currently, players completing a full sweep of team battles receive no special acknowledgment. Without a distinctive reward, players may lack the emotional closure and reinforcement that drives continued engagement. Providing a “quote reward” with KG taps into the human drive for mastery and recognition. By celebrating this achievement, we encourage players to replay and improve. There is a concern that any lack of reward for challenging play could lead to reduced play time or negative player feedback.

> Full sweeps—winning all matches in a team battle—are likely challenging, and it is estimated that only 20% of players achieve this.

---

## Impact if Not Solved

Missed opportunity for player satisfaction and retention for high achievers.

---

## Behavioral Insight

Players are motivated by meaningful, personalized rewards that mark major achievements.

---

## Goals

- Display a quote screen 100% of the time upon a full-sweep (all six wins) in a team battle match.
- Maintain load time for quote screen under 1 second.
- Ensure error-free quote display across landscape and portrait orientations.

---

## Functional Requirements

| Priority | Feature                             | Description                                                          |
|:--------:|:------------------------------------|:---------------------------------------------------------------------|
| **P1**   | KG Image & Random Quote Display      | Show KG character and random quote on perfect victory.              |
| **P2**   | Quote Fallback & Load Time Optimization | Display default message if data fails, ensure <1s load time, responsive design. |
| **P3**   | Accessibility Support                | Enable screen reader compatibility for quote text display.          |

---

## Acceptance Criteria

- KG character appears on victory screen.
- Random quote displayed from dataset.
- If dataset not available, fallback message appears.
- Screen loads within 1 second.
- Text is screen-reader accessible (ARIA tags).
- Layout adapts to screen orientation (portrait/landscape).
- No repeated quotes within a session.

---

## Edge Cases / Failure States

- **Failure to load quote data**: Display default congratulatory message.
- **App crash/restart mid-team battle**: Player progress persists; if victory conditions are met post-relaunch, quote screen appears.
- **Handle offline mode**: Display fallback quote.
- **1uote repetition**: As there are over 100 quotes in aesopsFables.json, it's unlikely that a player will see the same quote within a single session.

---

## Design and UX Considerations

- KG character is placed on the left side, taking approximately 1/8th of the screen.
- Quote occupies the right-hand side in desktop/landscape view.
- On mobile/portrait view, KG image is above the quote.
- Proceed button is consistently placed at the bottom of the screen.
- Background is neutral and matches the tone of the team battle mode.
- Quote text uses a legible, sans-serif font, sized 18px minimum.

| **Quote Screen Mockup 3**                                        |                                        **Quote Screen Mockup 4** |
| ---------------------------------------------------------------- | ---------------------------------------------------------------: |
| ![Quote Screen Mockup 3](/design/mockups/mockupQuoteScreen3.png) | ![Quote Screen Mockup 4](/design/mockups/mockupQuoteScreen4.png) |

### 1. Victory Feedback Module

**Contents:**

- Large celebratory headline: “Victory!” or “Full Sweep Achieved!”
- Trophy or confetti burst icon above quote block
- KG image with pointer leading visually into the quote

**Why:**  
Players need an unmistakable emotional payoff for their achievement—text alone is sterile.

---

### 2. Quote Display Module

**Contents:**

- Responsive quote text block with max-width control
- Dynamic font scaling for different screen sizes
- Skeleton loader animation while quote loads

**Why:**  
Maintains readability and handles loading/failure elegantly without a jarring fallback experience.

---

### 3. Action Button Module

**Contents:**

- Large, thumb-friendly button (min 48px height)
- Emotionally charged label: “Continue Your Journey” or “Claim Victory”
- Button anchored close to quote with clear margin spacing

**Why:**  
Makes the CTA compelling and touch-friendly, minimizing accidental mis-taps and reinforcing the accomplishment.

## Tasks

- [ ] 1.0 Implement Victory Feedback Module
  - [x] 1.1 Load and display KG character image.
  - [ ] 1.2 Add celebratory headline ("Victory!" or "Full Sweep Achieved!").

- [ ] 2.0 Implement Quote Display Module
  - [x] 2.1 Randomly select a quote from `aesopsFables.json`.
  - [ ] 2.2 Display the quote with dynamic, responsive text scaling.
  - [ ] 2.3 Implement skeleton loader while fetching quote.
  - [ ] 2.4 Fallback to default message if quote data fails.

- [ ] 3.0 Implement Action Button Module
  - [ ] 3.1 Add large, thumb-friendly CTA button ("Continue Your Journey" or "Claim Victory").
  - [ ] 3.2 Ensure CTA button has minimum 48px height and proper spacing.

- [ ] 4.0 Accessibility
  - [ ] 4.1 Add ARIA tags for screen readers.

- [ ] 5.0 Performance & Load Time Optimization
  - [ ] 5.1 Optimize image and text asset load times to under 1 second.
  - [ ] 5.2 Implement responsive grid and flexbox for various screen sizes (portrait/landscape).
