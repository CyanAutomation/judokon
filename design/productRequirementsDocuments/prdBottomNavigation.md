# PRD: Bottom Navigation

## Description

The ju-do-kon! game features multiple game modes and screens. Players need easy, intuitive navigation to move between different game modes such as battles, judoka browsing, and more.

Without a bottom navigation bar, players may become confused post-activity, disrupting their gameplay flow. For example:

- Player finishes battle → confusion navigating back → flow disruption → session drop-off.

This PRD proposes a persistent bottom navigation system to minimize user friction, aiming to:

- Reduce navigation-related exits by 20%.
- Increase session duration per player by 15%.

---

## How It Works

The bottom navigation appears consistently across all screens, dynamically loading active game modes from `gameModes.json`. It has three display modes:

### 1. Collapsed Mode (Default View)

- Navigation links are laid out in a horizontal row.
- A centered ju-do-kon logo acts as an interactive button.
- Links and labels scale responsively with screen size.

### 2. Expanded Mode (Landscape)

- Clicking the logo triggers an upward slide expansion.
- A “Judo Training Village” style map appears with clickable tiles, representing different game modes.

### 3. Portrait Mode

- In portrait orientation, the navigation collapses into just the logo.
- Clicking the logo reveals a vertically unrolled text menu listing the available game modes.

---

## Wireframes / Visual Reference

### Collapsed Mode (Default)

Horizontal navigation bar with clickable links and center logo.

---

### Expanded Mode (Landscape)

Expanded map view with clickable tiles for different game modes.

---

*(For Portrait Mode, a vertical text list expansion would resemble the expanded view but simplified for vertical screens — no image was attached but a note here can clarify for the dev team.)*

---

## Aims (Goals)

- **48px minimum touch target size** (WCAG guidelines).
- **Visible 50% screen coverage**: The nav bar must be accessible on at least half of user active playtime.
- **Navigation expansion/collapse animations** must complete in <500ms.
- **Maintain ≥60fps animation performance** on standard mid-tier devices (≥2GB RAM).
- **Load fallback data** in <2 seconds if `gameModes.json` fails.
- **Text labels** must have a contrast ratio of at least 4.5:1 against the navigation bar background.
- **Navigation task completion rate ≥98%.**

---

## Functional Requirements

| Priority | Feature              | Description                                                                 |
|----------|----------------------|-----------------------------------------------------------------------------|
| P1       | Collapsed Nav Bar    | Fixed horizontal navigation with scalable links and central logo.           |
| P2       | Expanded Map View    | Slide-up game map with clickable tiles in landscape orientation.            |
| P3       | Portrait Text Menu   | Text-based vertical menu expansion on logo click for portrait orientation.  |

- **Small Screens Support**: Adjust text menu for screens as small as 320px width — scale font and spacing.
- **Dark/Light Theme Adaptability**: Support both themes.
- **Touch Feedback**: All links and buttons must have a ripple/tap feedback animation.

---

## Acceptance Criteria

- Touch targets maintain ≥48px size across all device resolutions.
- Navigation is visible on 100% of game screens.
- Collapsed nav bar displays active game modes loaded from `gameModes.json`.
- Portrait mode initially shows only the logo; tapping reveals a vertical list.
- Landscape expanded mode shows a game map with clickable tiles.
- Clicking on a link/tile navigates successfully to the intended screen.
- Tapping the logo toggles expansion/collapse.
- If `gameModes.json` fails, load a default mode list in <2 seconds.
- Show notification and reload on mid-session load failure.
- Smooth re-layout during device rotation mid-animation.
- Text contrast must meet WCAG 4.5:1.
- Animations must run at ≥60fps.

---

## Edge Cases / Failure States

- **Data Source Failure**: If `gameModes.json` fails to load, default to a hardcoded game mode list in under 2 seconds.
- **Menu Loading Failure Mid-Session**: Notify the user and trigger an automatic reload.
- **Device Rotation**: Mid-animation rotation cancels/adjusts the animation smoothly.
- **Small Devices**: Text menu dynamically resizes for screens as narrow as 320px.

---

## Design and UX Considerations

### Accessibility

- 48px+ touch targets.
- High contrast text labels.
- Support for screen readers: navigation elements must be properly labeled.

### Responsiveness

- Responsive layouts supporting screen widths from 320px to 2560px.

### Interaction Feedback

- Ripple/tap animation on navigation interactions.
- Smooth slide-in/slide-out transitions.

### Themes

- Support for dark and light mode.

![Bottom Navigation Expanded](/design/mockups/mockupBottomNavigation1.png)

![Bottom Navigation Mobile](/design/mockups/mockupBottomNavigation2.png)