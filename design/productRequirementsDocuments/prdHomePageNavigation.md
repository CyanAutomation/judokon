# PRD: Home Page Main Navigation Menu

## 1. Overview

This document describes the **Home Page Main Navigation Menu** for the JU-DO-KON! web-based judo-themed card battle game.

The purpose of this menu is to allow players to access the core game modes quickly and intuitively. Poor navigation would impact player engagement and retention, as players might become confused while trying to figure out how to navigate around the game or to different game modes. Additionally, a navigation system that does not reflect the game's judo theme could reduce overall immersion and thematic consistency.

> **Player Feedback Example**: "I want to play the Team Battle, but I can't see the right button." — hypothetical playtest participant, age 10

A fast, accessible, and thematic navigation experience is crucial to ensure new players feel confident and engaged from their first visit.

---

## Goals

- Navigation menu loads within 2 seconds.
- Tile navigable via keyboard (Tab navigation, Enter/Space activation).
- Ensure all icons and text meet WCAG AA contrast ratio (minimum 4.5:1).
- SVG icons <50KB to optimize load times.
- Fallback icon (JU-DO-KON logo) displayed if SVG fails to load.

---

## 2. Functional Requirements

| Priority | Feature                     | Description                                                                    |
| -------- | --------------------------- | ------------------------------------------------------------------------------ |
| P1       | Grid Layout                 | 2x2 grid, responsive stacking on smaller screens.                              |
| P1       | Clickable Tile Area         | Entire tile area must be clickable, not just the label or icon.                |
| P1       | Mobile Tap Optimization     | Tap targets must be at least 48px for mobile compliance.                       |
| P2       | Tile Hover Effects          | Cursor change and visual feedback (150ms ease-in zoom effect) on hover.        |
| P2       | Keyboard Navigation Support | Tiles must be focusable and triggerable with keyboard navigation (Tab, Enter). |
| P3       | SVG Optimization            | Icons must be <50KB and optimized for fast loading.                            |
| P3       | Accessibility Compliance    | Text contrast ≥4.5:1 and screen-reader friendly (aria-labels, alt text).       |

### 2.1. Navigation Menu Layout

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

---

### 2.2. Tile Definitions

> _Note: Label text may vary slightly (e.g., “View” vs. “Browse”) to better suit audience understanding. Functionality must remain unchanged._

| Tile Label       | Destination URL                  | Function                                                                 |
|------------------|----------------------------------|--------------------------------------------------------------------------|
| Classic Battle    | `/pages/battleJudoka.html`        | Launches a **1v1 battle mode** with classic rules.                       |
| Team Battle       | `/pages/battleJudoka.html` *(placeholder)* | Launches a **multi-judoka team battle** mode. Distinct page planned.     |
| Update Judoka     | `/pages/updateJudoka.html`        | Allows user to **create or edit Judoka cards**.                          |
| Browse Judoka     | `/pages/carouselJudoka.html`      | Allows user to **view all Judoka cards** in a scrollable carousel.       |

> **Note:** Currently, "Battle Mode: Classic" and "Battle Mode: Team Battle" point to the same URL. Distinct functionality is expected to be developed later.

### 2.3. Behavior on Click

- Clicking a tile navigates to the corresponding page immediately.
- No page transition animation is required (standard browser navigation).
- JavaScript ensures the tile is clickable across the whole tile area.
- If the icon fails to load, a generic fallback icon (JU-DO-KON logo) must be displayed.

> **Note on Back-out Flow**: Once a tile is clicked and navigation begins, browser back button behavior will be standard, allowing users to return to the previous page if needed.

---

## 3. Wireframe Diagram

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

## 4. Acceptance Criteria

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

## 5. Non-Functional Requirements

### 5.1. Responsiveness

- The layout must adapt to different screen sizes:
  - **Desktop (>=1024px):** 2 columns, 2 rows.
  - **Tablet (>=768px and <1024px):** 2 columns, 2 rows.
  - **Mobile (<768px):** Single column layout; tiles stack vertically.

### 5.2. Accessibility

- Tiles must be:
  - Focusable via keyboard (`tabindex=0` if needed).
  - Activated via keyboard (`Enter` or `Space` key).
- Labels must be screen-reader friendly (e.g., via `aria-label`).
- SVG icons must have descriptive `title` or `aria-hidden="true"` if decorative.
- Tap targets must meet WCAG minimum sizing standards (48px x 48px).

### 5.3. Performance

- SVG icons must be **optimized** to minimize page load times (<50KB).
- Navigation interactions must be **instantaneous**, with interaction latency <100ms.
- Ensure fallback behavior if network fails to load SVGs.

---

## 6. Edge Cases / Failure States

- **Icon Load Failure**: Fall back to displaying a generic JU-DO-KON logo.
- **Slow Network**: Navigation tiles and fallback icons should still be accessible.
- **Broken Destination URL**: Log an error and redirect player to a default error page.
- **Device Rotation During Navigation**: Maintain consistent layout after orientation change.

---

## 7. Design and UX Considerations

- **Mockups**:
  - Annotated wireframes showcasing:
    - Grid layout with hover state visuals (cursor change, 150ms zoom effect).
    - Touch target sizing indicators.
- **Style Guidelines**:
  - Use consistent fonts and color palette from JU-DO-KON’s theme.
  - Ensure text labels and background colors have contrast ratio ≥4.5:1.
  - Consistent margin and padding for tile spacing.
  - Hover interaction: scale tile to 1.05 over 150ms with ease-in transition for visual feedback.

---

## Tasks

- [ ] 1.0 Create Navigation Tile Component

  - [ ] 1.1 Design tile structure with SVG icon and label.
  - [ ] 1.2 Ensure full-tile clickability via JS/CSS.
  - [ ] 1.3 Implement hover and click feedback (cursor pointer, 150ms slight zoom).

- [ ] 2.0 Implement Responsive Grid Layout

  - [ ] 2.1 Create 2x2 grid layout for desktop viewports.
  - [ ] 2.2 Implement 1-column stacking for mobile (<768px).
  - [ ] 2.3 Test layout on tablet and mobile orientations.

- [ ] 3.0 Add Accessibility Features

  - [x] 3.1 Add `aria-labels` to each tile.
  - [ ] 3.2 Ensure text contrast ratio ≥4.5:1.
  - [ ] 3.3 Make icons `aria-hidden` if decorative.
  - [ ] 3.4 Enable keyboard tabbing and activation via Enter/Space.

- [ ] 4.0 Optimize and Integrate SVG Icons

  - [ ] 4.1 Compress SVG icons to <50KB.
  - [x] 4.2 Add fallback icon logic for load failure.
  - [ ] 4.3 Verify all icons load under poor network conditions.

- [ ] 5.0 Implement Keyboard Navigation and Focus Management

  - [ ] 5.1 Add `tabindex` attributes for tiles.
  - [ ] 5.2 Handle keyboard activation events.
  - [ ] 5.3 Ensure visual focus indicators are clear and accessible.

- [ ] 6.0 Handle Edge Cases and Failure States
  - [ ] 6.1 Implement generic fallback icon on load failure.
  - [ ] 6.2 Redirect to default error page on broken link.
  - [ ] 6.3 Maintain layout stability during device rotation.
