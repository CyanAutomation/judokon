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

### Priority 1 (P1)

- Display KG character image and random quote when player wins all team battles.
- Randomly select and display a quote from `aesopsFables.json` dataset.

### Priority 2 (P2)

- If quote data fails to load, display default message: “Well done, congratulations!”
- Ensure quote screen loads within 1 second.
- Provide dynamic text formatting to adapt to various screen sizes (responsive design), especially portrait and landscape orientations. Design should use responsive grid and flexbox functionality, with text wrapping and image scaling. Quotes should reflow and resize appropriately on all major screen sizes (mobile, tablet, desktop).

### Priority 3 (P3)

- Future-proof for localization/multi-language support.
- Accessibility: Ensure screen reader compatibility for quotes by including ARIA tags and implementing accessibility unit tests.

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

| **Quote Screen Mockup 3** | **Quote Screen Mockup 4**                         |
|---|---:|
|![Quote Screen Mockup 3](/design/mockups/mockupQuoteScreen3.png)|![Quote Screen Mockup 4](/design/mockups/mockupQuoteScreen4.png)|

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

## Mockup

![End Game Quote Screen Mockup](/design/mockups/mockupQuoteScreen1.png)

This mockup illustrates the layout and design of the End Game Quote Screen, showcasing the placement of the KG character, the quote text, and the proceed button. It adheres to the described UX considerations for both landscape and portrait orientations.
