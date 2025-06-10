# PRD: Navigation Map (Kodokan Interior Map)

## Problem Statement

Players have reported that the current navigation menus feel disconnected from the Ju-Do-Kon! theme, which weakens immersion and reduces excitement when switching game modes. A theoretical 10-year-old playtester noted,

> _"The menu feels boring compared to the rest of the game — can it look more exciting? Maybe like a judo dojo or village?"_

The current menu is purely functional but lacks the thematic cohesion that draws players into the world of Ju-Do-Kon! With new game modes added, discoverability and immersion must both improve. Replacing the abstract menu with a **room-based interior map of the Kodokan** introduces a thematic and intuitive way to navigate core game features.

---

## Player Actions & Flow

- **Trigger:** In landscape mode, tapping the bottom right map icon expands a **Kodokan building map** from the footer with a smooth upward slide animation (<500ms).
- **Map Layout:** The map presents a layout of **rooms inside the Kodokan**, each representing a core game mode. Each tile must be at least 48px in size.
- **Navigation:** Tapping a room tile transitions the player to the corresponding game mode screen.
- **Cancel/Back Out:** Tapping outside the map or re-tapping the icon collapses the map. Rotation during animation cancels expansion and returns to footer.
- **Fallback:** If assets fail to load, fallback to a text-only high-contrast menu.
- **Responsiveness:** Below 400px height or 640px width, hide map icon entirely. Map and rooms resize responsively. Animations must maintain 60fps.

---

## Room-to-Mode Mapping

| Kodokan Room       | Game Mode             | Description                                              |
|--------------------|-----------------------|----------------------------------------------------------|
| **Main Dojo Hall** | Classic Battle        | 1v1 card battles with standard rules.                    |
| **Team Training Room** | Team Battle       | Multi-judoka team battle mode.                           |
| **Judoka Workshop** | Update Judoka         | Create or edit custom Judoka cards.                      |
| **Hall of Records** | Browse Judoka         | Scrollable archive to view all Judoka cards.            |

---

## Prioritized Functional Requirements

| Priority | Feature                                   | Description                                                                     |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| **P1**   | Implement Map Expansion                    | Smooth slide-up animation, toggle behavior, and orientation handling.           |
| **P2**   | Integrate Fallback Menu                   | High-contrast text fallback menu that loads within 1 second if assets fail.     |
| **P2**   | Ensure Accessibility & Performance        | Keyboard navigation, screen reader support, 60fps performance, WCAG compliance. |
| **P3**   | Add "Simple Menu Mode" Toggle to Settings | Optional toggle to disable map and simplify navigation.                         |

---

## Acceptance Criteria

1. **Given** the player is in landscape mode, **when** they tap the map icon, **then** the Kodokan interior map slides up in under 500ms.
2. **Given** the map is open, **when** the player taps a room tile, **then** they are navigated to the correct game mode.
3. All room tiles must be ≥48px and accessible via keyboard with visible focus indicators.
4. Fallback text menu must appear within 1 second if assets fail to load.
5. Orientation changes mid-animation must cancel expansion without freezing.
6. All tiles must include descriptive alt text for screen readers.

---

## Visual & UX Reference

- **Collapsed Footer:** Shows map icon in bottom right.
- **Expanded Kodokan View:** Grid of illustrated rooms representing:

  - 🥋 **Main Dojo Hall** → *Classic Battle*
  - 🤝 **Team Training Room** → *Team Battle*
  - 🛠 **Judoka Workshop** → *Update Judoka*
  - 📚 **Hall of Records** → *Browse Judoka*

- **Wireframe Grid (Landscape):**

- **Wireframe Description:**
  - **Collapsed Footer:** Shows map icon in bottom right hand corner.
  - **Expanded Map View:** Grid of image tiles representing areas inside the Kodokan:
    - **Main Dojo Hall:** Leads to Training Mode.
    - **Competition Hall:** Leads to Battle Mode.
    - **Archives Room:** Leads to Browse Mode.
  - Tiles must be ≥48px with generous padding (≥8px).
- **Animation:** Slide-up animation easing (`ease-out`) and bounce effect on tile hover/tap.
- **Touch Areas:** All tiles ≥48px.
- **Contrast:** Text labels must meet WCAG 2.1 AA contrast ratio (≥4.5:1).
- **Performance:** Maintain ≥60fps animations on mid-tier devices.
- **Responsiveness:** If viewport height <400px or width <640px, hide the map icon and corresponding functionality.

| **Kodokan Map Mockup 1**                                          |                                          **Kodokan Map Mockup 2** |
| ----------------------------------------------------------------- | ----------------------------------------------------------------: |
| ![Mockup 1](/design/mockups/mockupNavigationMap2.png)             | ![Mockup 2](/design/mockups/mockupNavigationMap3.png)             |

---

## Accessibility Checklist

- [ ] Keyboard navigation and visible focus indicators for all tiles.
- [ ] Alt text and screen reader support for each room.
- [ ] Text and tile labels meet contrast requirements.

---

## Tasks

- [ ] **1.0 Design Kodokan Map Navigation (P1)**
  - [ ] 1.1 Define tile layout and iconography for: Main Dojo Hall, Team Training Room, Judoka Workshop, Hall of Records.

- [ ] **2.0 Implement Footer Map Expansion (P1)**
  - [ ] 2.1 Code slide-up animation (<500ms).
  - [ ] 2.2 Add toggle and tap-outside-to-close behavior.
  - [ ] 2.3 Handle orientation change rollback.

- [ ] **3.0 Integrate Fallback Menu (P2)**
  - [ ] 3.1 Detect asset load failure.
  - [ ] 3.2 Show high-contrast text fallback menu within 1 second.

- [ ] **4.0 Ensure Accessibility & Performance (P2)**
  - [ ] 4.1 Keyboard navigation, visible focus indicators.
  - [ ] 4.2 Add alt text and screen reader compatibility.
  - [ ] 4.3 Ensure animations maintain 60fps.
  - [ ] 4.4 Verify contrast ratio compliance.

- [ ] **5.0 Add Simple Menu Mode (P3)**
  - [ ] 5.1 Toggle setting hides map icon and collapses view in real-time.