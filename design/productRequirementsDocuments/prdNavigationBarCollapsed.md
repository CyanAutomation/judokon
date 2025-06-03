---

## Description

The **ju-do-kon!** game features multiple game modes and screens. Players need easy, intuitive navigation to seamlessly transition between activities such as battles, judoka browsing, and training. When navigation is unclear, players experience increased cognitive load and frustration, breaking immersion and potentially leading to session drop-offs.

### Example Scenario

> Player finishes battle → confusion navigating back → flow disruption → early session exit.

Currently, the lack of a consistent navigation system leads to player disorientation post-activity. This PRD proposes a persistent bottom navigation bar to minimize friction, reduce cognitive load, and maintain gameplay flow.

---

## Goals

- Reduce navigation-related exits by **20%** within 30 days of implementation.
- Increase average session duration per player by **15%** within 30 days.
- Ensure **48px minimum** touch target size (per WCAG guidelines).
- Achieve **≥60fps** animation performance on standard mid-tier devices (2GB RAM).
- Guarantee fallback loading time of **<2 seconds** if `gameModes.json` fails.
- Meet a text contrast ratio of at least **4.5:1** against the navigation bar background.
- Reach a navigation task completion rate of **≥98%** in usability tests.

---

## How It Works

The bottom navigation bar appears consistently across all game screens, dynamically loading active game modes from `gameModes.json`.

### Collapsed Mode (Default View)

- Navigation links are laid out in a horizontal row.
- A bottom-left corner **ju-do-kon!** logo acts as an interactive button.
- Tapping the logo reveals a vertically unrolled text menu listing the available game modes (functions in both landscape and portrait orientation).
- Links and labels scale responsively with screen size.

### Portrait Mode

- In portrait orientation, the navigation collapses into just the logo.
- Tapping the logo reveals a vertically unrolled text menu listing the available game modes (functions in both landscape and portrait orientation).

---

## Wireframes / Visual Reference

- **Collapsed Mode**: Horizontal navigation bar with clickable links and a bottom-left corner ju-do-kon logo. A simplified vertical text list expands on logo tap. _(Visual reference to be attached.)_
- **Portrait Mode**: A simplified vertical text list expands on logo tap.

---

## Functional Requirements

| Priority | Feature                | Description                                                                                          |
| -------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| P1       | Collapsed Nav Bar      | Fixed horizontal navigation with scalable links and bottom-left corner logo.                         |
| P2       | Portrait Text Menu     | Text-based vertical menu expansion on logo click for portrait and landscape (collapsed) orientation. |
| P2       | Small Screens Support  | Adjust text menu for screens as small as 320px — scale font and spacing.                             |
| P2       | Visual Feedback        | Positive click/tap feedback animation for all links and buttons.                                     |
| P1       | Fallback Data Handling | Hardcoded default mode list if `gameModes.json` fails to load.                                       |

---

## Acceptance Criteria

- Touch targets maintain **≥48px** size across all device resolutions.
- Navigation is visible on **100%** of game screens.
- Collapsed nav bar displays active game modes loaded from `gameModes.json`.
- Portrait mode initially shows only the logo in the bottom left corner (no links in the navigation bar); tapping reveals a vertical list.
- The function of tapping the icon in the bottom left corner works in landscape or portrait mode.
- Clicking a link navigates successfully to the intended screen.
- Tapping the logo toggles expansion/collapse.
- If `gameModes.json` fails, load a hardcoded default list within **<2 seconds**.
- Show notification and auto-reload if mid-session loading fails.
- Smooth re-layout during device rotation mid-animation, with transition completion time **<500ms**.
- Text contrast meets WCAG **4.5:1**.
- Animations must run at **≥60fps**.
- Respect OS-level **reduced motion** settings for users preferring minimal animations.

---

## Edge Cases / Failure States

- **Data Source Failure**: If `gameModes.json` fails to load, fallback to a hardcoded list in under 2 seconds.
- **Menu Loading Failure Mid-Session**: Notify the user and trigger an automatic reload.
- **Device Rotation Mid-Animation**: Cancel or adjust the animation smoothly with re-layout.
- **Small Devices**: Text menu dynamically resizes for screens as narrow as 320px.

---

## Design and UX Considerations

![Wireframe of Navigation Bar Collapsed](/design/mockups/mockupFooterNavigationCollapsed1.png)

### Accessibility

- **48px+** touch targets.
- High-contrast text labels (WCAG 4.5:1).
- Screen reader support: all navigation elements properly labeled.
- Respect OS **reduced motion** settings.

### Responsiveness

- Layout adapts to screen widths from **320px to 2560px**.

### Interaction Feedback

- Tap animation on navigation interactions.
- Smooth slide-in/slide-out transitions (**<500ms**).
