# JU-DO-KON! Home Page Main Navigation Menu – Product Requirements Document (PRD)

## 1. Overview

This document describes the **Home Page Main Navigation Menu** for the JU-DO-KON! web-based judo-themed card battle game.

The purpose of this menu is to allow players to access the core game modes quickly and intuitively. Poor navigation would impact player engagement and retention, as players might become confused while trying to figure out how to navigate around the game or to different game modes. Additionally, a navigation system that does not reflect the game's judo theme could reduce overall immersion and thematic consistency.

## Goals

- Navigation menu loads within 2 seconds on standard 3G connections.
- Tile navigable via keyboard (Tab navigation, Enter/Space activation).
- Ensure all icons and text meet WCAG AA contrast ratio (minimum 4.5:1).
- SVG icons <50KB to optimize load times.
- Fallback icon (JU-DO-KON logo) displayed if SVG fails to load.
- Achieve a navigation task success rate of ≥98%.

---

## 2. Functional Requirements

| Priority | Feature                     | Description                                                                    |
| -------- | --------------------------- | ------------------------------------------------------------------------------ |
| P1       | Grid Layout                 | 2x2 grid, responsive stacking on smaller screens.                              |
| P1       | Clickable Tile Area         | Entire tile area must be clickable, not just the label or icon.                |
| P1       | Mobile Tap Optimization     | Tap targets must be at least 48px for mobile compliance.                       |
| P2       | Tile Hover Effects          | Cursor change and visual feedback on hover for desktop interactions.           |
| P2       | Keyboard Navigation Support | Tiles must be focusable and triggerable with keyboard navigation (Tab, Enter). |
| P3       | SVG Optimization            | Icons must be <50KB and optimized for fast loading.                            |
| P3       | Accessibility Compliance    | Text contrast ≥4.5:1 and screen-reader friendly (aria-labels, alt text).       |

### 2.1. Navigation Menu Layout

- The main navigation is a **grid** layout containing **four clickable tiles**.
- Each tile consists of:

  - A **vector icon** (SVG).
  - A **tile label** (textual title of the game mode).

- Tiles are **visually consistent** and equally sized.
- Hover and click behavior must be clearly indicated (hover effects, cursor change).
- Tap targets must be at least 48px x 48px on touch devices.

### 2.2. Tile Definitions

| Tile Label               | Destination URL                                   | Function                                                                     |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Battle Mode: Classic     | `/pages/battleJudoka.html`                        | Launches a **1v1 battle mode** with classic single-player rules.             |
| Battle Mode: Team Battle | `/pages/battleJudoka.html` (Future: distinct URL) | Launches a **team battle mode** (multi-judoka vs multi-judoka).              |
| View Judoka              | `/pages/carouselJudoka.html`                      | Allows user to **browse all available Judoka cards**.                        |
| Update Judoka            | `/pages/updateJudoka.html`                        | Allows user to **create or edit Judoka cards** (admin/editor functionality). |

> **Note:** Currently, "Battle Mode: Classic" and "Battle Mode: Team Battle" point to the same URL. Distinct functionality is expected to be developed later.

### 2.3. Behavior on Click

- Clicking a tile navigates to the corresponding page immediately.
- No page transition animation is required (standard browser navigation).
- JavaScript should ensure that the tile is clickable across the whole tile area.
- If the icon fails to load, a generic fallback icon (JU-DO-KON logo) must be displayed.

---

## 3. Wireframe Diagram

```
+------------------------------------------------------+
|                                                      |
|    +----------------+  +----------------+            |
|    | Battle Mode:    |  | Battle Mode:    |            |
|    | Classic         |  | Team Battle     |            |
|    +----------------+  +----------------+            |
|                                                      |
|    +----------------+  +----------------+            |
|    | View Judoka     |  | Update Judoka   |            |
|    +----------------+  +----------------+            |
|                                                      |
+------------------------------------------------------+

Each tile contains:
- Icon (SVG vector graphic)
- Label (e.g., "Battle Mode: Classic")
```

> **Visual Notes**:
>
> - Grid layout: 2 rows × 2 columns.
> - Even spacing and alignment between tiles.
> - Optimized for landscape desktop layout.
> - Tap target sizes specified for touch devices.

---

## 4. Acceptance Criteria

| ID   | Acceptance Criterion                                                                     |
| ---- | ---------------------------------------------------------------------------------------- |
| AC1  | Clicking on a tile navigates to the correct destination URL, interaction latency <100ms. |
| AC2  | The entire tile area is clickable, not just text or icon.                                |
| AC3  | Tiles have a hover state (cursor pointer, slight highlight or zoom).                     |
| AC4  | The grid should display 2x2 layout on desktop (>768px viewport width).                   |
| AC5  | On smaller screens (<768px), tiles stack responsively in a 1-column layout.              |
| AC6  | Icons and labels are properly aligned vertically within each tile.                       |
| AC7  | Tiles load quickly; icons must be optimized SVGs <50KB.                                  |
| AC8  | All text must be readable and pass WCAG AA contrast ratios (minimum 4.5:1).              |
| AC9  | Tiles must be navigable via keyboard (Tab to move focus; Enter/Space to activate).       |
| AC10 | Alt text or aria-labels must be provided for icons or tiles for screen readers.          |
| AC11 | Tap targets must be at least 48px x 48px on touch devices.                               |
| AC12 | Fallback to generic icon if SVG fails to load.                                           |

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

## 6. Edge Cases / Failure States

- **Icon Load Failure**: Fall back to displaying a generic JU-DO-KON logo.
- **Slow Network**: Navigation tiles and fallback icons should still be accessible.
- **Broken Destination URL**: Log an error and redirect player to a default error page.
- **Device Rotation During Navigation**: Maintain consistent layout after orientation change.

## 7. Design and UX Considerations

- **Mockups**:

  - Annotated wireframes showcasing:

    - Grid layout with hover state visuals (cursor change, highlight effect).
    - Touch target sizing indicators.

- **Style Guidelines**:

  - Use consistent fonts and color palette from JU-DO-KON’s theme.
  - Ensure text labels and background colors have contrast ratio ≥4.5:1.
  - Consistent margin and padding for tile spacing.
