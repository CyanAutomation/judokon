# PRD: Home Page Main Navigation Menu

## Introduction

This document describes the **Home Page Main Navigation Menu** for the JU-DO-KON! web-based judo-themed card battle game.

> Imagine a new player, Ayumi, who’s just downloaded JU-DO-KON! after seeing a cool TikTok clip. She opens the game and instantly lands on a vibrant home screen where “Classic Battle” and “Team Battle” tiles stand side by side, each pulsing slightly when she hovers. The judo-inspired icons draw her in, and she feels like she’s stepping onto the tatami mat. She sees “Update Judoka” and “Browse Judoka” neatly below, feeling in control and excited. Within seconds, she launches into her first match, confident she’s chosen the right mode. She tells her friends how easy it was to start. That’s the experience we’re building: immediate clarity, thematic immersion, and frictionless engagement.

The purpose of this menu is to allow players to access the core game modes quickly and intuitively. New players struggle to find and understand game modes quickly, leading to frustration, early churn, and reduced engagement. A clear, immersive, and fast-loading navigation menu is needed to orient players instantly, maintain the judo theme, and ensure accessibility across devices.

> **Player Feedback Example**: "I want to play the Team Battle, but I can't see the right button." — hypothetical playtest participant, age 10

A fast, accessible, and thematic navigation experience is crucial to ensure new players feel confident and engaged from their first visit.

## Goals

- Navigation menu loads within 2 seconds.
- Tile navigable via keyboard (Tab navigation, Enter/Space activation).
- Ensure all icons and text meet WCAG AA contrast ratio (minimum 4.5:1).
- SVG icons <50KB to optimize load times.
- SVG icons use Material Symbols and require `viewBox="0 -960 960 960"` to render correctly.
- Fallback icon (JU-DO-KON logo) displayed if SVG fails to load.
- Quickly and confidently access desired game modes.
- Experience a navigation interface that feels consistent with the judo theme.
- Navigate easily regardless of device or ability.

## User Stories

- As a new player, I want to see all game modes clearly when I launch the game so that I don't get lost.
- As a player using keyboard-only navigation, I want to move between tiles using Tab and select using Enter/Space so that I can navigate without a mouse.
- As a visually impaired player, I want tile icons and labels with sufficient contrast and screen reader support so I can access the game.

---

## Functional Requirements

### Features

| Priority | Feature                     | Description                                                                    |
| -------- | --------------------------- | ------------------------------------------------------------------------------ |
| P1       | Grid Layout                 | 2x2 grid, responsive stacking on smaller screens.                              |
| P1       | Clickable Tile Area         | Entire tile area must be clickable, not just the label or icon.                |
| P1       | Mobile Tap Optimization     | Tap targets must be at least 48px for mobile compliance.                       |
| P2       | Tile Hover Effects          | Cursor change and visual feedback (150ms ease-in zoom effect) on hover.        |
| P2       | Keyboard Navigation Support | Tiles must be focusable and triggerable with keyboard navigation (Tab, Enter). |
| P3       | SVG Optimization            | Icons must be <50KB and optimized for fast loading.                            |
| P3       | Accessibility Compliance    | Text contrast ≥4.5:1 and screen-reader friendly (aria-labels, alt text).       |

### Navigation Menu Layout

- The main navigation is visually divided into **two thematic sections**, but **functionally structured as a 2×2 grid** for layout and responsiveness purposes.
- Sections:
  - **Battle Mode** — for core gameplay options.
  - **Manage Your Judoka** — for browsing or editing cards.
- Each section contains **two clickable tiles**, for a total of four.
- Each tile includes:
  - A **vector icon (SVG)** positioned **to the left** of the label, vertically centred.
  - A **text label** (e.g., “Classic Battle”), in sentence case.
- Tiles are **visually consistent**, equally sized, and arranged in:
  - **Desktop (≥1024px):** 2×2 grid layout.
  - **Tablet (768px–1023px):** 2×2 grid.
  - **Mobile (<768px):** Tiles stack in a **single column**.
- **Hover behavior**:
  - Cursor changes to pointer.
  - Tile scales to 1.05 over 150ms (ease-in transition).
- **Touch targets** must meet a minimum size of **48px × 48px** for mobile usability.

### Tile Definitions

> _Note: Label text may vary slightly (e.g., “View” vs. “Browse”) to better suit audience understanding. Functionality must remain unchanged._

| Tile Label     | Destination URL                            | Function                                                             |
| -------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Classic Battle | `/pages/battleJudoka.html`                 | Launches a **1v1 battle mode** with classic rules.                   |
| Team Battle    | `/pages/battleJudoka.html` _(placeholder)_ | Launches a **multi-judoka team battle** mode. Distinct page planned. |
| Update Judoka  | `/pages/updateJudoka.html`                 | Allows user to **create or edit Judoka cards**.                      |
| Browse Judoka  | `/pages/browseJudoka.html`                 | Allows user to **view all Judoka cards** in a scrollable carousel.   |

> **Note:** Currently, "Battle Mode: Classic" and "Battle Mode: Team Battle" point to the same URL. Distinct functionality is expected to be developed later.

### Behavior on Click

- Clicking a tile navigates to the corresponding page immediately.
- No page transition animation is required (standard browser navigation).
- JavaScript ensures the tile is clickable across the whole tile area.
- If the icon fails to load, a generic fallback icon (JU-DO-KON logo) must be displayed.

> **Note on Back-out Flow**: Once a tile is clicked and navigation begins, browser back button behavior will be standard, allowing users to return to the previous page if needed.

---

### Wireframe Diagram

```
+----------------------------------------------------------+
|                       JU-DO-KON!                         |
|               [Game Logo + Title Area]                   |
|                                                          |
|   ------------------  ------------------                |
|   |  Classic Battle |  |   Team Battle  |    <-- Battle Mode section
|   ------------------  ------------------                |
|                                                          |
|   ------------------  ------------------                |
|   | Update Judoka   |  | Browse Judoka |    <-- Manage Your Judoka section
|   ------------------  ------------------                |
+----------------------------------------------------------+

Each tile contains:
- Icon (SVG vector graphic), left-aligned.
- Label in sentence case.
- Hover Effect: Slight zoom (scale 1.05) over 150ms; cursor pointer.
```

> **Visual Notes**:
>
> - Grid layout: 2 rows × 2 columns.
> - Even spacing and alignment between tiles.
> - Optimized for landscape desktop layout.
> - Tap target sizes specified for touch devices.

![Main Screen Game Modes Mockup](/design/mockups/mockupGameModes1.png)

---

## Acceptance Criteria

| ID   | Acceptance Criterion                                                                     |
| ---- | ---------------------------------------------------------------------------------------- |
| AC1  | Clicking on a tile navigates to the correct destination URL, interaction latency <100ms. |
| AC2  | The entire tile area is clickable, not just text or icon.                                |
| AC3  | Tiles have a hover state (cursor pointer, 150ms zoom-in effect).                         |
| AC4  | The grid should display 2x2 layout on desktop (>768px viewport width).                   |
| AC5  | On smaller screens (<768px), tiles stack responsively in a 1-column layout.              |
| AC6  | Icons and labels are properly aligned vertically within each tile.                       |
| AC7  | Tiles load quickly; icons must be optimized SVGs <50KB.                                  |
| AC8  | All text must be readable and pass WCAG AA contrast ratios (minimum 4.5:1).              |
| AC9  | Tiles must be navigable via keyboard (Tab to move focus; Enter/Space to activate).       |
| AC10 | Alt text or aria-labels must be provided for icons or tiles for screen readers.          |
| AC11 | Tap targets must be at least 48px x 48px on touch devices.                               |
| AC12 | Fallback to generic icon if SVG fails to load.                                           |
| AC13 | User can return to previous page via standard browser back navigation.                   |

---

## Non-Goals

- The home page will not expose account or profile management.
- Advanced battle or team composition settings are out of scope.

---

## Non-Functional Requirements

### Responsiveness

- The layout must adapt to different screen sizes:
  - **Desktop (>=1024px):** 2 columns, 2 rows.
  - **Tablet (>=768px and <1024px):** 2 columns, 2 rows.
  - **Mobile (<768px):** Single column layout; tiles stack vertically.

### Accessibility

- Tiles must be:
  - Focusable via keyboard (`tabindex=0` if needed).
  - Activated via keyboard (`Enter` or `Space` key).
- Labels must be screen-reader friendly (e.g., via `aria-label`).
- SVG icons must have descriptive `title` or `aria-hidden="true"` if decorative.
- Tap targets must meet WCAG minimum sizing standards (48px x 48px).

### Performance

- SVG icons must be **optimized** to minimize page load times (<50KB).
- Navigation interactions must be **instantaneous**, with interaction latency <100ms.
- Ensure fallback behavior if network fails to load SVGs.

---

## Edge Cases / Failure States

- **Icon Load Failure**: Fall back to displaying a generic JU-DO-KON logo.
- **Slow Network**: Navigation tiles and fallback icons should still be accessible.
- **Broken Destination URL**: Log an error and redirect player to a default error page.
- **Device Rotation During Navigation**: Maintain consistent layout after orientation change.

## Dependencies / Integrations

- Uses global CSS tokens (`--button-bg`, `--radius-md`, etc.) defined in `src/styles/base.css`.

---

## Design/UX Considerations

### Mockups

- Annotated wireframes showcasing:
  - Grid layout with hover state visuals (cursor change, 150ms zoom effect).
  - Touch target sizing indicators.

### Style Guidelines

- Use consistent fonts and color palette from JU-DO-KON’s theme.
- Tile backgrounds use `var(--button-bg)` and corners `var(--radius-md)`.
- Hover animation uses `var(--transition-fast)` to scale tiles to **1.05**.
- Ensure text labels and background colors have contrast ratio ≥4.5:1.
- Follow UI design tokens for fonts and color contrast as outlined in [codeUIDesignStandards.md](../codeStandards/codeUIDesignStandards.md).
- Consistent margin and padding for tile spacing.

### Battle Mode Section

- **Contents**:

  - Header: “Battle Mode” with clear divider or label.
  - Tile 1: “Classic Battle” — icon left, label centered vertically.
  - Tile 2: “Team Battle” — same size and visual weight as Classic.
  - “Classic Battle” and “Team Battle” use identical tile formats
  - Match icon styles and ensure equal visual weight
  - Add subtext beneath labels for quick description (e.g., “1v1 classic rules” / “3v3 team showdown”)

- **Why**: Re-establishes semantic clarity between gameplay options and restores equal prominence to two core actions. Without this, Team Battle feels like a weak afterthought. As well as Prevents one mode from visually dominating the other and helps new users instantly understand what each mode means without clicking

### Responsive Tile Stack Module

- **Contents**:

  - Implement column-stacking at <768px with equal vertical spacing.
  - Ensure each tile remains fully visible without scroll.
  - Tile container should use Flex/Grid with breakpoint control.
  - Single-column layout for mobile view (portrait resolution)
  - Tiles stretch to 100% width with top and bottom padding
  - Tap targets clearly bounded with shadow or color background
  - Include visible focus outline for keyboard navigation

- **Why**: Mobile-friendliness must be structural, not decorative. “View Judoka” disappearing into the footer is a catastrophic failure for tablet/mobile users.

### Judoka Management Module

- **Contents**:

  - One large tile labeled “Manage Judoka”
  - On click, expands or opens modal with:
    - Create Judoka
    - Edit Judoka

- **Why**: Reduces visual clutter, eliminates duplicate tiles, and provides a single intuitive access point to all Judoka-related actions—grouped by function, not guesswork.

## Technical Considerations

### Responsiveness

- The layout must adapt to different screen sizes:
  - **Desktop (>=1024px):** 2 columns, 2 rows.
  - **Tablet (>=768px and <1024px):** 2 columns, 2 rows.
  - **Mobile (<768px):** Single column layout; tiles stack vertically.

### Accessibility

- Tiles must be:
  - Focusable via keyboard (`tabindex=0` if needed).
  - Activated via keyboard (`Enter` or `Space` key).
- Labels must be screen-reader friendly (e.g., via `aria-label`).
- SVG icons must have descriptive `title` or `aria-hidden="true"` if decorative.
- Tap targets must meet WCAG minimum sizing standards (48px x 48px).

### Performance

- SVG icons must be **optimized** to minimize page load times (<50KB).
- Navigation interactions must be **instantaneous**, with interaction latency <100ms.
- Ensure fallback behavior if network fails to load SVGs.

---

## Dependencies/Integrations

- Uses Material Symbols icon set for tile icons.
- Relies on routes defined in `judoka.json` for navigation targets.

## Edge Cases

- **Icon Load Failure**: Fall back to displaying a generic JU-DO-KON logo.
- **Slow Network**: Navigation tiles and fallback icons should still be accessible.
- **Broken Destination URL**: Log an error and redirect player to a default error page.
- **Device Rotation During Navigation**: Maintain consistent layout after orientation change.

## Open Questions

- Should Team Battle get its own dedicated URL before launch?

## Metadata

- Author: Game Design Team
- Last Edited: 2024-05-01

---

## Tasks

- [ ] **Create Navigation Tile Component**
  - [ ] Design tile structure with SVG icon and label.
  - [ ] Ensure full-tile clickability via JS/CSS.
  - [ ] Implement hover and click feedback (cursor pointer, 150ms slight zoom).
- [ ] **Implement Responsive Grid Layout**

  - [ ] Create 2x2 grid layout for desktop viewports.
  - [ ] Implement 1-column stacking for mobile (<768px).
  - [ ] Test layout on tablet and mobile orientations.

- [ ] **Add Accessibility Features**

  - [ ] Add `aria-labels` to each tile.
  - [ ] Ensure text contrast ratio ≥4.5:1.
  - [ ] Make icons `aria-hidden` if decorative.
  - [ ] Enable keyboard tabbing and activation via Enter/Space.

- [ ] **Optimize and Integrate SVG Icons**
  - [ ] Compress SVG icons to <50KB.
  - [ ] Use Material Symbols inline with `viewBox="0 -960 960 960"`.
  - [ ] Add fallback icon logic for load failure.
  - [ ] Verify all icons load under poor network conditions.
- [ ] **Implement Keyboard Navigation and Focus Management**

  - [ ] Add `tabindex` attributes for tiles.
  - [ ] Handle keyboard activation events.
  - [ ] Ensure visual focus indicators are clear and accessible.

- [ ] **Handle Edge Cases and Failure States**
  - [ ] Implement generic fallback icon on load failure.
  - [ ] Redirect to default error page on broken link.
  - [ ] Maintain layout stability during device rotation.

---
  [Back to Game Modes Overview](prdGameModes.md)
