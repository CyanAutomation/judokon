# Footer Navigation: Expanded (Expanded Map View)

## Problem Statement

Players have reported that the current navigation menus feel disconnected from the Ju-Do-Kon! theme, which weakens immersion and reduces excitement when switching game modes. A 10-year-old playtester noted, *"The menu feels boring compared to the rest of the game — can it look more exciting? Maybe like a judo dojo or village?"*

Currently, the menu is purely functional but lacks the thematic cohesion that draws players deeper into the Ju-Do-Kon! world. Improving the navigation’s thematic fit is important now because new game modes have been added, and players are not easily discovering them through the existing menu.

## Player Actions & Flow

- **Trigger:** In landscape mode, tapping the bottom right corner map icon expands a "Judo Training Village" map from the footer with a smooth upward slide animation (<500ms).
- **Map Layout:** The map presents different game modes as a grid of image tiles representing village landmarks (Dojo, Budokan, Kodokan), with minimum 48px touch target size.
- **Navigation:** Tapping a tile smoothly transitions the player to the selected game mode.
- **Cancel/Back Out:** Tapping outside the map area or pressing the map icon button again collapses the map. If device orientation changes mid-animation, the expansion is canceled and reverts to the default footer state.
- **Fallback:** If the map fails to load, a simplified, high-contrast text menu appears instantly.
- **Responsiveness:** If viewport height <400px or width <640px, hide the map icon entirely. Map and tiles dynamically resize based on screen size and resolution. Animations must maintain 60fps on devices with 2GB RAM.

## Acceptance Criteria

1. **Given** the player is in `landscape` mode, **when** they tap the map icon in the bottom right corner, **then** the interactive village map slides up from the footer in under 500ms.
2. **Given** the village map is open, **when** the player taps a tile, **then** they are navigated to the corresponding game mode screen.
3. **Given** a tile exists, **then** its touch/click target must be ≥48px and accessible via keyboard navigation with visible focus indicators.
4. **Given** the map assets fail to load, **then** fallback to a default text-based menu within 1 second.
5. **Given** the player rotates their device during map expansion, **then** the map closes and the footer returns to its default state without freezing.
6. **Given** accessibility needs, **then** all tiles must have descriptive alt text and support screen readers.

### Edge Cases
- **Double-clicking the map icon:** Only one map expansion allowed at a time; ignore second tap.
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

## Accessibility Checklist

- [ ] Keyboard navigation and visible focus indicators for all tiles.
- [ ] Alt text and screen reader support for all tiles.
- [ ] Verify all text labels meet WCAG 2.1 AA contrast standards (≥4.5:1).

## Tasks

- [ ] **1.0 Design Village Map Navigation**
  - [ ] 1.1 Create updated wireframes for collapsed and expanded footer views.
  - [ ] 1.2 Design tile positions on the village map grid with 48px+ targets (Dojo, Budokan, Kodokan).
  - [ ] 1.3 Specify hover/tap animations for tiles (bounce effect).

- [ ] **2.0 Implement Footer Map Expansion**
  - [ ] 2.1 Code smooth slide-up animation (<500ms, `ease-out` easing).
  - [ ] 2.2 Implement tap-outside-to-close and back-button collapse behaviors.
  - [ ] 2.3 Add logic to prevent double-tap expansion issues.

- [ ] **3.0 Integrate Fallback Menu**
  - [ ] 3.1 Detect map asset load failures.
  - [ ] 3.2 Implement high-contrast text menu fallback that appears in under 1 second.

- [ ] **4.0 Ensure Accessibility & Performance**
  - [ ] 5.1 Add keyboard navigation and visible focus indicators for all tiles.
  - [ ] 5.2 Provide alt text and screen reader support for all tiles.
  - [ ] 5.3 Test animation performance on devices to ensure ≥60fps.
  - [ ] 5.4 Verify all text labels meet WCAG 2.1 AA contrast standards (≥4.5:1).
     
- [ ] **5.0 Add "Simple Menu Mode" toggle to settings**
