# PRD: Judoka Cards (JU-DO-KON!)

## TL;DR

Judoka cards are interactive virtual cards representing elite fighters in JU-DO-KON! They deepen player immersion through ownership, mastery, and strategic gameplay, with responsive animations, rarity systems, and accessible design — ensuring all players can engage with and feel connected to their judoka roster.
The main element of the JU-DO-KON! game is the use of **judoka cards**. These virtual cards show elite judoka along with their stats and form the core gameplay piece, giving players a sense of ownership, mastery, and strategic choice.

---

## Problem Statement

Players currently lack a tangible sense of progression and connection to elite judoka; without this, engagement drops significantly after initial matches. Judoka cards aim to **provide ownership, mastery, and strategic choice**, addressing the need for deeper attachment to in-game characters.

> Sota clicks "Draw!" on his draw pile. The pack shows a card with a slide animation, revealing a rare Judoka in shimmering red borders. Sota’s eyes light up. He reads the stats, and plans which stat to use — feeling mastery and excitement that keeps him coming back.

---

## Goals

- Increase average match duration by **15%** through deeper strategic card use.
- Ensure card stat balance leads to **<5% match outcome variance attributed to chance**.
- Enable deeper strategic choices when selecting judoka for matches.

---

## User Stories

- As a player who loves browsing cards, I want judoka cards that look unique and reflect rarity.
- As a competitive player, I want to view stats easily so I can build select the right stat in a match.
- As a player with visual impairments, I want high-contrast text and alt text on portraits so I can understand card details.

---

## Acceptance Criteria

- **Given** a player draws a card, or browses the JU-DO-KON! collection,  
  **When** they view a judoka card,  
  **Then** the card displays the correct portrait, stats, nationality flag, and signature move.

- **Given** a judoka portrait is missing,  
  **When** the card loads,  
  **Then** a placeholde silhouette (judoka id=0) placeholder is displayed.

- **Given** a player taps the draw button,  
  **When** the card reveal (slide) animation starts,  
  **Then** it completes within **400ms** using ease-out cubic-bezier timing.

- **Given** the card displays text,  
  **When** viewed on any device,  
  **Then** text contrast ratio must meet **WCAG 2.1 AA (≥4.5:1)**.

- **Given** the card’s interactive elements (e.g., carousel arrows),  
  **When** a player uses keyboard or touch input,  
  **Then** all elements are fully operable with proper focus states.

---

## Edge Cases / Failure States

- **Missing Portrait →** Show silhouette fallback image (judoka id=0).
- **Corrupted Stats Data →** Hide stats and display error message “Stats unavailable”.
- **Unsupported Weight Class →** Default to “Unknown” label.
- **Stats Exceed Expected Range →** Cap displayed stats at 10.
- **Failed Asset Load →** Use fallback fonts, generic flag, and placeholder visuals.

---

## Technical Considerations

- Portrait images should use optimized formats (e.g., WebP) to balance quality and performance.
- Card slide/reveal animations must use hardware-accelerated CSS transforms for smooth performance (**≥60 fps**).
- Placeholder assets for missing portraits/flags should be bundled with the client for offline scenarios.
- Ensure card sizing calculations consistently maintain 2:3 ratio on all screen aspect ratios and resolutions.
- Hover and focus scaling must stay at or below **1.05x** to prevent cards from
  being clipped inside scroll wrappers.

---

## Player Settings

No player-configurable display or animation settings are included at this time. Future updates may add a **“Reduce Motion”** option for players sensitive to animations.

---

## The Cards

Each card consists of elements stored in `judoka.json`:

- Judoka Name (first + surname)
- Nationality (depicted via flag)
- Weight class (one of the 14 official IJF classes: 7 male, 7 female)
- Portrait of the judoka’s likeness
- Stats (Power, Speed, Technique, Kumi-kata, Ne-waza) with 0–10 scale
- Signature Move

The weight class badge appears in the top-right corner of the portrait with a transparent background and white text for readability.

Cards maintain a **2:3 ratio with a border** and display rarity-based coloring:

- **Common**: Blue
- **Rare**: Red
- **Legendary**: Gold

The design must be attractive and **minimize cognitive load**—presenting stats clearly without clutter.

---

## Prioritized Functional Requirements

| Priority | Feature                | Description                                                                  |
| -------- | ---------------------- | ---------------------------------------------------------------------------- |
| **P1**   | Core Card Elements     | Judoka name, portrait, stats, nationality flag, signature move.              |
| **P1**   | Edge Case Handling     | Display silhouette, error messages, or fallbacks for missing/corrupted data. |
| **P1**   | Real-time Stats Update | Ensure UI reflects backend stat changes instantly.                           |
| **P2**   | Rarity Coloring        | Apply blue/red/gold coloring based on rarity.                                |
| **P2**   | Card Aspect Ratio      | Maintain **2:3 ratio** on all devices.                                       |
| **P3**   | Animations             | Smooth, cancellable slide/reveal animations within **400ms** duration.       |
| **P3**   | Accessibility Features | Implement alt text, WCAG contrast, keyboard/touch navigation.                |

---

## Accessibility Considerations

- Text contrast must meet **WCAG 2.1 AA** (contrast ratio ≥4.5:1).
- All judoka portraits must have descriptive alternative text.
- Interactive elements (e.g., attribute selection, carousel arrows) must be fully operable via keyboard and screen readers.
- Card elements must use `role="button"` and include descriptive `aria-label` attributes.
- Provide a visible focus style via `.judoka-card:focus-visible` so keyboard users can easily track focus.
- Maintain **≥44px touch target** size for all clickable areas to meet WCAG guidelines. See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness).

---

## UI Design

+------------------------------------------------+
| [ RARITY BORDER COLOR: Blue/Red/Gold ] |
| |
| +----------------------------+ |
| | JUDOKA PORTRAIT | |
| | (high-res img) | |
| +----------------------------+ |
| |
| [ NATIONALITY FLAG ] [ WEIGHT CLASS LABEL ] |
| |
| JUDOKA NAME (First Last) |
| |
| Signature Move: [Text of move name] |
| |
| Stats: |
| Power: [0-10] Speed: [0-10] |
| Technique: [0-10] Kumi-kata: [0-10] |
| Ne-waza: [0-10] |
| |
| [ FLIP BUTTON ] [ INFO ICON ] |
|------------------------------------------------|

### Interactive Elements

- **Draw Button:** Player taps/clicks → triggers 400ms card slide/reveal animation revealing the card.
- **Info Icon:** Opens modal with expanded description of judoka’s achievements or lore.
- **Card Area:** Entire card reacts to hover/tap with a subtle scaling effect (max 1.05x) to show it’s interactive.
- **Error States:** If portrait fails, replace image with a centered silhouette icon + “Portrait unavailable” text.

### Layout & Design Notes

- **Aspect Ratio:** Card must strictly maintain **2:3 ratio**, adjusting internal elements responsively.
- **Vertical Proportions:** With a card width of 300px (height 450px), allocate roughly 14% (63px) for the name and flag bar, 42% (189px) for the portrait, 34% (153px) for stats, and 10% (45px) for the signature move section.
- Portrait images should fill the portrait area using `object-fit: cover` so no whitespace appears.
- **Portrait Container:** `.card-portrait` now uses `width: 100%` and `height: 42%` so it matches its flex-basis and keeps the aspect ratio consistent.
- **Stats Container:** `.card-stats` uses `height: 34%` to align with the vertical proportions.
- **Signature Move Band:** `height: max(10%, var(--touch-target-size))` keeps the 44px tap target while maintaining the card's 2:3 ratio.
- **Padding Adjustments:** Section heights use `calc()` to subtract vertical padding so the total fits within the card's 2:3 ratio.
- **Rarity Border Colors:**
  - Common → Blue (#337AFF)
  - Rare → Red (#FF3333)
  - Legendary → Gold (#FFD700)
- **Stats Area:** Align stat labels and numbers in a grid with consistent spacing to reduce clutter.
- **Contrast & Fonts:**
  - Text must achieve ≥4.5:1 contrast ratio.
  - Use **Open Sans** for body text to match the UI design standards.
- **Interactive Elements:** Carousel arrows or selectors outside the card must have ≥44px tap targets.

### Responsiveness

- **Portrait Priority:** On narrow devices, prioritize portrait and name placement; wrap stats below if needed.
- **Text Scaling:** Allow dynamic font sizing to avoid clipping on smaller screens.

---

## Tasks

- [ ] 4.0 Handle Edge Cases

  - [ ] 4.1 Show silhouette placeholder for missing portraits.
  - [ ] 4.2 Cap extreme stats and log errors.
  - [ ] 4.3 Display error messages for corrupted data.

- [ ] 5.0 Implement Accessibility Features
  - [ ] 5.1 Add alt text for portraits.
  - [ ] 5.2 Ensure text contrast ratio ≥4.5:1.
  - [ ] 5.3 Support keyboard and screen reader navigation.
  - [ ] 5.4 Ensure ≥44px touch targets for interactive elements (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
  - [ ] 5.5 Add `role="button"` with `aria-label` to card elements and style focus via `.judoka-card:focus-visible`.
