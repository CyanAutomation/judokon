# PRD: Judoka Cards (JU-DO-KON!)

---

## TL;DR
This PRD describes the Judoka Card UI component for JU-DO-KON! It defines the structure, layout, and interactive features of a judoka card item, including how stats, portraits, rarity, and accessibility are presented. The scope covers the card's visual design, user interaction, and technical requirements for consistent gameplay and collection experiences.

Judoka cards are interactive virtual cards representing elite fighters in JU-DO-KON! They deepen player immersion through ownership, mastery, and strategic gameplay, with responsive animations, rarity systems, and accessible design — ensuring all players can engage with and feel connected to their judoka roster.

The main element of the JU-DO-KON! game is the use of **judoka cards**. These virtual cards show elite judoka along with their stats and form the core gameplay piece, giving players a sense of ownership, mastery, and strategic choice.

---

## Problem Statement

Players currently lack a tangible sense of progression and connection to elite judoka; without this, engagement drops significantly after initial matches. Judoka cards aim to **provide ownership, mastery, and strategic choice**, addressing the need for deeper attachment to in-game characters.

> Sota clicks "Draw!" on his draw pile. The pack shows a card with a slide animation, revealing a rare Judoka in shimmering red borders. Sota’s eyes light up. He reads the stats, and plans which stat to use — feeling mastery and excitement that keeps him coming back.

---

## Goals

- Provide a visually engaging, interactive card component that deepens player immersion and ownership.
- Ensure all card elements (stats, portrait, rarity, flag, signature move) are clear and accessible.
- Support strategic gameplay and collection features through consistent card design.
- Maintain accessibility and responsive design for all users and devices.

---

## User Stories

- As a player, I want judoka cards to look unique and reflect rarity so I feel excited to collect and use them.
- As a competitive player, I want to view stats easily so I can make strategic choices in matches.
- As a player with visual impairments, I want high-contrast text and alt text on portraits so I can understand card details.
- As a keyboard user, I want to navigate and interact with card elements using keyboard controls.

---

## Acceptance Criteria

- Given a player draws or browses a judoka card, when the card is displayed, then it shows the correct portrait, stats, nationality flag, rarity border, and signature move.
- Given a missing portrait, when the card loads, then a placeholder silhouette (judoka id=0) is shown.
- Given a player interacts with the card, when the slide/reveal animation starts, then it completes within 400ms using ease-out cubic-bezier timing.
- Given the card displays text, when viewed on any device, then text contrast ratio meets WCAG 2.1 AA (≥4.5:1).
- Given interactive elements (e.g., carousel arrows), when a player uses keyboard or touch input, then all elements are fully operable with proper focus states.

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
- Cards initially display `judokaPortrait-1.png` and lazy-load the real portrait when the card enters the viewport.
- The `renderJudokaCard` and `buildCardCarousel` helpers run `setupLazyPortraits()` automatically so the real portrait loads as soon as the card is visible.
- All judoka portraits and card sizing calculations must consistently maintain a **2:3 aspect ratio** to ensure visual uniformity and avoid layout shifts. Portraits should be pre-cropped as needed, and `.card-portrait` uses `object-fit: cover` to handle similarly shaped images. Card sizing calculations must account for screen aspect ratios and resolutions to preserve this ratio.
- Hover and focus scaling must stay at or below **1.05x** to prevent cards from being clipped inside scroll wrappers.

---

## Player Settings

No player-configurable display or animation settings are included at this time. Future updates may add a **“Reduce Motion”** option for players sensitive to animations.

---

## The Cards

Each card consists of elements stored in `judoka.json`:

- Judoka Name (first + surname)
- First and surname appear tightly spaced (line-height about 1) so there is breathing room above and below
- Nationality (depicted via flag)
- Weight class (one of the 14 official IJF classes: 7 male, 7 female)
- Portrait of the judoka’s likeness
- Stats (Power, Speed, Technique, Kumi-kata _grip fighting_, Ne-waza _ground grappling_) with 0–10 scale
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

```
+------------------------------------------------+
| [ RARITY BORDER COLOR: Blue/Red/Gold ]         |
|                                                |
| +----------------------------+                 |
| |      JUDOKA PORTRAIT       |                 |
| |      (high-res img)        |                 |
| +----------------------------+                 |
|                                                |
| [ NATIONALITY FLAG ] [ WEIGHT CLASS LABEL ]     |
|                                                |
| JUDOKA NAME (First Last)                        |
|                                                |
| Signature Move: [Text of move name]            |
|                                                |
| Stats:                                         |
| Power: [0-10]   Speed: [0-10]                  |
| Technique: [0-10]   Kumi-kata (grip fighting): [0-10]          |
| Ne-waza (ground grappling): [0-10]                                |
|                                                |
| [ FLIP BUTTON ] [ INFO ICON ]                  |
+------------------------------------------------+
```

### Interactive Elements

- **Draw Button:** Player taps/clicks → triggers 400ms card slide/reveal animation revealing the card.
- **Info Icon:** Opens modal with expanded description of judoka’s achievements or lore.
- **Card Area:** Entire card reacts to hover/tap with a subtle scaling effect (max 1.05x) to show it’s interactive.
- **Error States:** If portrait fails, replace image with a centered silhouette icon + “Portrait unavailable” text.

### Layout & Design Notes

- **Aspect Ratio:** Card must strictly maintain **2:3 ratio**, adjusting internal elements responsively.
- **Safari ≤15 Fallback:** `.judoka-card` sets `height: calc(var(--card-width) * 1.5)` because these versions do not treat `aspect-ratio` as a definite height. `.card-top-bar` uses `calc(var(--card-width) * 0.14)` so the header stays the same height across browsers.
  - **Vertical Proportions:** With a card width of 260px (height 390px), allocate roughly 14% (55px) for the name and flag bar, 42% (164px) for the portrait, 34% (133px) for stats, and 10% (39px) for the signature move section.
- Portrait images should fill the portrait area using `object-fit: cover` so no whitespace appears.
- **Portrait Container:** `.card-portrait` now uses `width: 100%` and `height: 42%` so it matches its flex-basis and keeps the aspect ratio consistent.
- **Stats Container:** `.card-stats` uses `height: 34%` to align with the vertical proportions.
- **Stats Padding & Typography:**
  - Horizontal padding should be minimal (use `var(--space-small)`).
  - Stats text uses `--font-medium` and line-height `1.2` to remain legible without increasing panel height.
- **Signature Move Band (special stat bar):** `height: max(10%, var(--touch-target-size))` keeps the 44px tap target while maintaining the card's 2:3 ratio.
- The label and value are centered vertically within that band.
  - `.judoka-card` overrides `--touch-target-size` to `44px` so the band stays 39px tall on a 260×390 card without leaving gaps above or below it.
- **Padding Adjustments:** Section percentages already account for vertical padding because `.judoka-card` uses `box-sizing: border-box`. No `calc()` subtraction is necessary.
- **Rarity Border Colors:**
  - Common → Blue (#337AFF)
  - Rare → Red (#FF3333)
  - Legendary → Gold (#FFD700)
- **Stats Area:** The stats list uses a flex column layout to evenly distribute the stat rows while keeping labels and values aligned.
- **Contrast & Fonts:**
  - Text must achieve ≥4.5:1 contrast ratio.
  - Use **Open Sans** for body text to match the UI design standards.
- **Interactive Elements:** Carousel arrows or selectors outside the card must have ≥44px tap targets.

### Responsiveness

- **Portrait Priority:** On narrow devices, prioritize portrait and name placement; wrap stats below if needed.
- **Text Scaling:** Allow dynamic font sizing to avoid clipping on smaller screens.

---

## Integration Notes

Carousels displaying judoka cards **must not** add horizontal padding around each card. Any spacing between cards should rely on the `gap` property defined in the [carousel CSS](../../src/styles/carousel.css). This ensures consistent card widths across screens and matches the rule introduced in the stylesheet.

---

## Tasks

- [x] 1.1 Show silhouette placeholder for missing portraits.
- [ ] 1.2 Cap extreme stats and log errors.
- [ ] 1.3 Display error messages for corrupted data.
- [x] 2.1 Add alt text for portraits.
- [ ] 2.2 Ensure text contrast ratio ≥4.5:1.
- [ ] 2.3 Support keyboard and screen reader navigation.
- [ ] 2.4 Ensure ≥44px touch targets for interactive elements (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- [x] 2.5 Add `role="button"` with `aria-label` to card elements and style focus via `.judoka-card:focus-visible`.

[Back to Game Modes Overview](prdGameModes.md)
