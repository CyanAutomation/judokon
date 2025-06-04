---

# JU-DO-KON! Home Page Main Navigation Menu – Product Requirements Document (PRD)

## 1. Overview

This document describes the **Home Page Main Navigation Menu** for the JU-DO-KON! web-based judo-themed card battle game.

The purpose of this menu is to allow players to access the core game modes quickly and intuitively. The navigation is presented as a grid of clickable tiles, each leading to a different game mode or utility.

---

## 2. Functional Requirements

### 2.1. Navigation Menu Layout

* The main navigation is a **grid** layout containing **four clickable tiles**.
* Each tile consists of:

  * A **vector icon** (SVG).
  * A **tile label** (textual title of the game mode).
* Tiles are **visually consistent** and equally sized.
* Tile hover and click behavior must be clearly indicated (e.g., hover effects, cursor change).

### 2.2. Tile Definitions

| Tile Label               | Destination URL                                   | Function                                                                     |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Battle Mode: Classic     | `/pages/battleJudoka.html`                        | Launches a **1v1 battle mode** with classic single-player rules.             |
| Battle Mode: Team Battle | `/pages/battleJudoka.html` (Future: distinct URL) | Launches a **team battle mode** (multi-judoka vs multi-judoka).              |
| View Judoka              | `/pages/carouselJudoka.html`                      | Allows user to **browse all available Judoka cards**.                        |
| Update Judoka            | `/pages/updateJudoka.html`                        | Allows user to **create or edit Judoka cards** (admin/editor functionality). |

> **Note:** Currently, "Battle Mode: Classic" and "Battle Mode: Team Battle" point to the same URL. Distinct functionality is expected to be developed later.

### 2.3. Behavior on Click

* Clicking a tile navigates to the corresponding page immediately.
* No page transition animation is required (standard browser navigation).
* JavaScript should ensure that the tile is clickable across the whole tile area, not just the label or icon.

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
> * Grid layout: 2 rows × 2 columns.
> * Even spacing and alignment between tiles.
> * Optimized for landscape desktop layout.

---

## 4. Acceptance Criteria

| ID   | Acceptance Criterion                                                                  |
| ---- | ------------------------------------------------------------------------------------- |
| AC1  | Clicking on a tile navigates to the correct destination URL.                          |
| AC2  | The entire tile area is clickable, not just text or icon.                             |
| AC3  | Tiles have a hover state (e.g., cursor pointer, slight highlight or zoom).            |
| AC4  | The grid should display 2x2 layout on desktop (>768px viewport width).                |
| AC5  | On smaller screens (<768px), tiles should stack responsively (e.g., 1 column layout). |
| AC6  | Icons and labels are properly aligned vertically within each tile.                    |
| AC7  | Tiles load quickly; icons must be optimized SVGs.                                     |
| AC8  | All text must be readable and pass WCAG AA contrast ratios (minimum 4.5:1).           |
| AC9  | Tiles should be navigable via keyboard (Tab to move focus; Enter/Space to activate).  |
| AC10 | Alt text or aria-labels must be provided for icons or tiles for screen readers.       |

---

## 5. Non-Functional Requirements

### 5.1. Responsiveness

* The layout must adapt to different screen sizes:

  * **Desktop (>=1024px):** 2 columns, 2 rows.
  * **Tablet (>=768px and <1024px):** 2 columns, 2 rows.
  * **Mobile (<768px):** Single column layout; tiles stack vertically.

### 5.2. Accessibility

* Tiles must be:

  * Focusable via keyboard (`tabindex=0` if needed).
  * Activated via keyboard (`Enter` or `Space` key).
* Labels must be screen-reader friendly (e.g., via `aria-label`).
* SVG icons must have descriptive `title` or `aria-hidden="true"` if decorative.

### 5.3. Performance

* SVG icons must be **optimized** to minimize page load times.
* Navigation interactions must be **instantaneous**, without unnecessary delays.

### 5.4. SEO (Optional)

* Include proper `alt` text or `aria-labels` to enhance accessibility and SEO.

---

## 6. Future Considerations

* Separate `battleJudoka.html` into distinct endpoints for **Classic** and **Team Battle** modes.
* Consider animated transitions or micro-interactions to enhance user engagement.
* Potential for internationalization (i18n) if supporting multiple languages in the future.

---
