# PRD: Judoka Cards (JU-DO-KON!)

## TL;DR

Judoka cards are collectible, interactive virtual cards representing elite fighters in JU-DO-KON! They deepen player immersion through ownership, mastery, and strategic gameplay, with responsive animations, rarity systems, and accessible design — ensuring all players can engage with and feel connected to their judoka roster.
The main element of the JU-DO-KON! game is the use of **judoka cards**. These virtual cards show elite judoka along with their stats and form the core gameplay piece, giving players a sense of ownership, mastery, and strategic choice.

---

## Problem Statement

Players currently lack a tangible sense of progression and connection to elite judoka; without this, engagement drops significantly after initial matches. Judoka cards aim to **provide ownership, mastery, and strategic choice**, addressing the need for deeper attachment to in-game characters.

> Sota opens a new card pack. The pack explodes with a satisfying flip animation, revealing a rare Judoka in shimmering red borders. Sota’s eyes light up. He reads the stats, flips the card to see achievements, and adds it to his lineup — feeling mastery and excitement that keeps him coming back.

---

## Player Flow

- **Acquisition:** After completing a match or purchasing a card pack, players receive new Judoka Cards.
- **Opening:** Players navigate to the “Card Pack” screen and tap a pack → triggers flip/reveal animation → reveals new card(s).
- **Collection:** Cards are stored in the player’s collection, where they can view, compare, or select cards.
- **Selection:** Players select cards for use in matches; selected cards appear in the pre-match screen. Card added to collection → displayed with rarity border, stats, portrait.
- **Interaction:** Players can flip cards to view stats or tap the info icon for more details on the judoka’s achievements. Player browses collection → flips cards for stats, taps info for achievements.
- **Cancellation:** At any point in the collection or selection screens, players can press the back button to return to the previous menu. Player selects cards for match roster → selection reflected on pre-match screen

---

## Goals

- Increase average match duration by **15%** through deeper strategic card use.
- Achieve **80% of players collecting at least one rare card within the first week**.
- Ensure card stat balance leads to **<5% match outcome variance attributed to chance**.
- Give players a sense of ownership and pride in their collection.
- Enable deeper strategic choices when selecting judoka for matches.

---

## User Stories

- As a player who loves collecting, I want judoka cards that look unique and reflect rarity so I can show them off.
- As a competitive player, I want to view stats easily so I can build the best team.
- As a player with visual impairments, I want high-contrast text and alt text on portraits so I can understand card details.

---

## Acceptance Criteria

- **Given** a player opens their collection,  
  **When** they view a judoka card,  
  **Then** the card displays the correct portrait, stats, nationality flag, and signature move.

- **Given** a judoka portrait is missing,  
  **When** the card loads,  
  **Then** a silhouette placeholder is displayed.

- **Given** backend stats change,  
  **When** the player is viewing their collection,  
  **Then** the card stats update in real time without requiring a reload.

- **Given** a player taps the flip button,  
  **When** the card flip animation starts,  
  **Then** it completes within **400ms** using ease-out cubic-bezier timing, and cancels if the player taps again quickly.

- **Given** the card displays text,  
  **When** viewed on any device,  
  **Then** text contrast ratio must meet **WCAG 2.1 AA (≥4.5:1)**.

- **Given** the card’s interactive elements (e.g., carousel arrows),  
  **When** a player uses keyboard or touch input,  
  **Then** all elements are fully operable with proper focus states.

---

## Edge Cases / Failure States

- **Missing Portrait →** Show silhouette placeholder image.
- **Corrupted Stats Data →** Hide stats and display error message “Stats unavailable”.
- **Unsupported Weight Class →** Default to “Unknown” label.
- **Stats Exceed Expected Range →** Cap displayed stats at 10 and log error for review.
- **Failed Asset Load →** Use fallback fonts, generic flag, and placeholder visuals.

---

## Technical Considerations

- Portrait images should use optimized formats (e.g., WebP) to balance quality and performance.
- Card flip animations must use hardware-accelerated CSS transforms for smooth performance.
- Stats updates should subscribe to real-time backend events to avoid polling.
- Placeholder assets for missing portraits/flags should be bundled with the client for offline scenarios.
- Ensure card sizing calculations consistently maintain 2:3 ratio on all screen aspect ratios and resolutions.

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
| **P3**   | Animations             | Smooth, cancellable flip/reveal animations within **400ms** duration.        |
| **P3**   | Accessibility Features | Implement alt text, WCAG contrast, keyboard/touch navigation.                |

---

## Accessibility Considerations

- Text contrast must meet **WCAG 2.1 AA** (contrast ratio ≥4.5:1).
- All judoka portraits must have descriptive alternative text.
- Interactive elements (e.g., attribute selection, carousel arrows) must be fully operable via keyboard and screen readers.
- Maintain **≥48px touch target** size for all clickable areas to meet WCAG guidelines.

---

## UI Design

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

- **Flip Button:** Player taps/clicks → triggers 400ms card flip animation revealing card back or additional details.
- **Info Icon:** Opens modal with expanded description of judoka’s achievements or lore.
- **Card Area:** Entire card reacts to hover/tap with a subtle scaling effect (max 1.05x) to show it’s interactive.
- **Error States:** If portrait fails, replace image with a centered silhouette icon + “Portrait unavailable” text.

### Layout & Design Notes

- **Aspect Ratio:** Card must strictly maintain **2:3 ratio**, adjusting internal elements responsively.
- **Rarity Border Colors:**
  - Common → Blue (#337AFF)
  - Rare → Red (#FF3333)
  - Legendary → Gold (#FFD700)
- **Stats Area:** Align stat labels and numbers in a grid with consistent spacing to reduce clutter.
- **Contrast & Fonts:**
  - Text must achieve ≥4.5:1 contrast ratio.
  - Use rounded sans-serif fonts (e.g., Nunito or Comic Neue) for child-friendly aesthetic.
- **Interactive Elements:** Carousel arrows or selectors outside the card must have ≥48px tap targets.

### Responsiveness

- **Portrait Priority:** On narrow devices, prioritize portrait and name placement; wrap stats below if needed.
- **Text Scaling:** Allow dynamic font sizing to avoid clipping on smaller screens.

---

## Tasks

- [ ] 1.0 Implement Card Acquisition Flow

  - [ ] 1.1 Trigger card reward after match completion or pack purchase.
  - [ ] 1.2 Navigate player to Card Pack screen.
  - [ ] 1.3 Animate card pack opening with 400ms flip animation.

- [ ] 2.0 Build Card Collection Interface

  - [ ] 2.1 Display card list/grid maintaining 2:3 ratio.
  - [ ] 2.2 Implement card flipping interaction.
  - [ ] 2.3 Add info button opening achievement modal.

- [ ] 3.0 Integrate Real-Time Stats Updates

  - [ ] 3.1 Subscribe to backend stat updates.
  - [ ] 3.2 Update card UI instantly without reload.

- [ ] 4.0 Handle Edge Cases

  - [ ] 4.1 Show silhouette placeholder for missing portraits.
  - [ ] 4.2 Cap extreme stats and log errors.
  - [ ] 4.3 Display error messages for corrupted data.

- [ ] 5.0 Implement Accessibility Features
  - [ ] 5.1 Add alt text for portraits.
  - [ ] 5.2 Ensure text contrast ratio ≥4.5:1.
  - [ ] 5.3 Support keyboard and screen reader navigation.
  - [ ] 5.4 Ensure ≥48px touch targets for interactive elements.
