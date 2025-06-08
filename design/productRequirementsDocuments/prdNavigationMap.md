# PRD: Navigation Map (Expanded Map View)

## Problem Statement

Players have reported that the current navigation menus feel disconnected from the Ju-Do-Kon! theme, which weakens immersion and reduces excitement when switching game modes. A theoretical 10-year-old playtester noted,

> _"The menu feels boring compared to the rest of the game — can it look more exciting? Maybe like a judo dojo or village?"_

Currently, the menu is purely functional but lacks the thematic cohesion that draws players deeper into the Ju-Do-Kon! world. Additionally, important new modes are hard to find because the plain menu structure buries them below a list format, making discovery harder for players. Improving the navigation’s thematic fit is important now because new game modes have been added, and players are not easily discovering them through the existing menu.

## Player Actions & Flow

- **Trigger:** In landscape mode, tapping the bottom right corner map icon expands a "Judo Training Village" map from the footer with a smooth upward slide animation (<500ms).
- **Map Layout:** The map presents different game modes as a grid of image tiles representing village landmarks (Dojo, Budokan, Kodokan), with minimum 48px touch target size.
- **Navigation:** Tapping a tile smoothly transitions the player to the selected game mode.
- **Cancel/Back Out:** Tapping outside the map area or pressing the map icon button again collapses the map. If device orientation changes mid-animation, the expansion is canceled and reverts to the default footer state.
- **Fallback:** If the map fails to load, a simplified, high-contrast text menu appears instantly.
- **Responsiveness:** If viewport height <400px or width <640px, hide the map icon entirely. Map and tiles dynamically resize based on screen size and resolution. Animations must maintain 60fps on devices.

## Prioritized Functional Requirements

| Priority | Feature                                   | Description                                                                     |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| **P1**   | Implement Map Expansion            | Smooth slide-up animation, toggle behavior, and orientation handling.           |
| **P2**   | Integrate Fallback Menu                   | High-contrast text fallback menu that loads within 1 second if assets fail.     |
| **P2**   | Ensure Accessibility & Performance        | Keyboard navigation, screen reader support, 60fps performance, WCAG compliance. |
| **P3**   | Add "Simple Menu Mode" Toggle to Settings | Optional toggle to disable map and simplify navigation.                         |

## Acceptance Criteria

1. **Given** the player is in `landscape` mode, **when** they tap the map icon in the bottom right corner, **then** the interactive village map slides up from the footer in under 500ms.
2. **Given** the village map is open, **when** the player taps a tile, **then** they are navigated to the corresponding game mode screen.
3. **Given** a tile exists, **then** its touch/click target must be ≥48px and accessible via keyboard navigation with visible focus indicators.
4. **Given** the map assets fail to load, **then** fallback to a default text-based menu within 1 second.
5. **Given** the player rotates their device during map expansion, **then** the map closes and the footer returns to its default state without freezing.
6. **Given** accessibility needs, **then** all tiles must have descriptive alt text and support screen readers.

### Edge Cases

- **Slow connections:** Graceful fallback to text menu without freezing or partial load.

## Player Settings (Optional)

- **Simple Menu Mode:** In settings, players can toggle "Simple Menu Mode" ON, which hides the map icon and corresponding functionality. Default is OFF.
- **Toggle Behavior:** If "Simple Menu Mode" is toggled ON or OFF mid-session, the footer immediately updates to reflect the selected mode without requiring a page reload.

## Visuals & UX Reference

- **Wireframe Description:**
  - **Collapsed Footer:** Shows map icon in bottom right hand corner.
  - **Expanded Map View:** Grid of image tiles representing:
    - **Dojo:** Leads to Training Mode.
    - **Budokan:** Leads to Battle Mode.
    - **Kodokan:** Leads to Browse Mode.
  - Tiles must be ≥48px with generous padding (≥8px).
- **Animation:** Slide-up animation easing (`ease-out`) and bounce effect on tile hover/tap.
- **Touch Areas:** All tiles ≥48px.
- **Contrast:** Text labels must meet WCAG 2.1 AA contrast ratio (≥4.5:1).
- **Performance:** Maintain ≥60fps animations on mid-tier devices.
- **Responsiveness:** If viewport height <400px or width <640px, hide the map icon and corresponding functionality.

| **Navigation Map Mockup 1**                                          |                                          **Navigation Map Mockup 2** |
| -------------------------------------------------------------------- | -------------------------------------------------------------------: |
| ![Navigation Map Mockup 1](/design/mockups/mockupNavigationMap2.png) | ![Navigation Map Mockup 2](/design/mockups/mockupNavigationMap3.png) |

## Accessibility Checklist

- [ ] Keyboard navigation and visible focus indicators for all tiles.
- [ ] Alt text and screen reader support for all tiles.
- [ ] Verify all text labels meet WCAG 2.1 AA contrast standards (≥4.5:1).

## Tasks

- [ ] **1.0 Design Village Map Navigation (P1)**

  - [ ] 1.1 Design tile positions on the village map grid with 48px+ targets (Dojo, Budokan, Kodokan).

- [ ] **2.0 Implement Footer Map Expansion (P1)**

  - [ ] 2.1 Code smooth slide-up animation (<500ms, `ease-out` easing).
  - [ ] 2.2 Implement tap-outside-to-close and map icon toggle behavior.
  - [ ] 2.3 Handle device orientation changes mid-animation.

- [ ] **3.0 Integrate Fallback Menu (P2)**

  - [ ] 3.1 Detect if village map assets fail to load
  - [ ] 3.2 Implement a high-contrast, text-only fallback menu.
  - [ ] 3.3 Ensure fallback loads within 1 second.

- [ ] **4.0 Ensure Accessibility & Performance (P2)**
  - [ ] 5.1 Add keyboard navigation and visible focus indicators for all tiles.
  - [ ] 5.2 Provide alt text and screen reader support for all tiles.
  - [ ] 5.3 Test animation performance on devices to ensure ≥60fps.
  - [ ] 5.4 Verify all text labels meet WCAG 2.1 AA contrast standards (≥4.5:1).
- [ ] **5.0 Add "Simple Menu Mode" toggle to settings (P3)**
