# PRD: Navigation Bar

---

## TL;DR

This PRD defines a persistent, responsive bottom navigation bar for Ju-Do-Kon! to provide clear, consistent navigation across all screens. It improves player flow, reduces confusion, and increases session duration by offering quick access to core game modes (**navigation visible within 100 ms**) with accessible, high-performance interactions.

---

## Problem Statement

Players currently experience confusion and increased cognitive load when navigating between game screens due to the lack of a consistent, always-visible navigation system. This leads to flow disruption, frustration, and early session exits.

---

## Description

The **JU-DO-KON!** game features multiple game modes and screens. Players need easy, intuitive navigation to seamlessly transition between activities such as battles, judoka browsing, and training. When navigation is unclear, players experience increased cognitive load and frustration, breaking immersion and potentially leading to session drop-offs.

> After an intense battle, Kenta sees the familiar JU-DO-KON! logo in the bottom-left corner. He taps it, revealing a smooth, scrolling list of game modes (**scroll ≥60 fps**, expand <500 ms). In a couple of seconds, he’s exploring his Judoka roster without friction — he feels confident, immersed, and eager to keep playing.

### Example Scenario

> Player finishes battle → confusion navigating back → flow disruption → early session exit.

---

## User Stories

- As a new player, I want an always-visible navigation bar so I don’t get lost between screens.
- As a mobile user, I want touch-friendly buttons so I can navigate confidently with my thumb.
- As a player who uses screen readers, I want navigation elements to be labeled properly so I can move around the game without barriers.

---

## Goals

- Reduce navigation-related exits by **20%**.
- Increase average session duration per player by **15%**.
- Ensure **44px minimum** touch target size (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- Achieve **≥60fps** animation performance on standard mid-tier devices.
- Guarantee fallback application time of **<2 seconds** if `navigationItems.json` fails.
- Meet a text contrast ratio of at least **4.5:1** against the navigation bar background.
- Allow players to confidently navigate between modes without frustration.
- Ensure a consistent, easy-to-use navigation experience across devices.

---

## Non-Goals

- Custom color themes or advanced 3D animations.
- Offline caching beyond the default fallback list.

---

## How It Works

The bottom navigation bar appears consistently across all game screens, populated with pre-seeded links whose visibility and order are driven by `navigationItems.json` via CSS. Each item references an entry in `gameModes.json` via its `id` so mode names and descriptions remain consistent.

### Standard Mode (Default View)

- Navigation links are laid out in a horizontal row.
- Each navigation item occupies **equal width**, keeping touch targets balanced across the bar.
- A bottom-left corner **ju-do-kon!** logo acts as an interactive button.
- Tapping the logo reveals a vertically unrolled text menu listing the available game modes (functions in both landscape and portrait orientation).
- Links and labels scale responsively with screen size.

### Portrait Mode

- In portrait orientation, or on screens narrower than **480px**, the horizontal row collapses into a **hamburger button** in the bottom left corner.
- Tapping the hamburger reveals a vertically unrolled text menu listing the available game modes (functions in both landscape and portrait orientation).

### Flow

- After any activity, the persistent nav bar is visible.
- On small screens or portrait orientation, only the hamburger button shows; tapping it expands the text list.
- Player selects a mode and is taken to that screen.
- If `navigationItems.json` fails, revert to a default order and auto-reload.

### Technical Considerations

- Use `navigationItems.json` to drive CSS classes that control which pre-seeded links are visible and in what order; fallback to defaults on failure.
- Cache loaded mode list to avoid redundant fetches across sessions.
- Use hardware-accelerated CSS transforms for nav animations (e.g., `translate3d`).
- Optimize for devices as small as 320px width (typical of older low-end Android devices).
- Listen for device orientation events to trigger smooth re-layout without stutter (**re-layout <500 ms**).

### Dependencies / Integrations

- `gameModes.json` defines the available modes.
- `navigationItems.json` references those modes by `id` and controls navigation order and visibility.
- CSS variables `--color-secondary` and `--button-text-color` for styling.
- Existing footer layout modules.

---

## Wireframes / Visual Reference

- **Default Mode**: Horizontal navigation bar with clickable links and a bottom-left corner ju-do-kon logo. A simplified vertical text list expands on logo tap. _(Visual reference to be attached.)_
- **Portrait Mode**: A hamburger button in the bottom left expands a simplified vertical text list.

---

## Functional Requirements

| Priority | Feature                | Description                                                                                                                      |
| :------: | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
|  **P1**  | Standard Nav Bar       | Fixed horizontal navigation pinned to the bottom of the viewport with scalable, equal-width links and a bottom-left corner logo. |
|  **P2**  | Portrait Text Menu     | Text-based vertical menu expansion on button click for portrait and landscape (collapsed) orientation.                           |
|  **P2**  | Small Screens Support  | Row collapses to a hamburger menu and adjusts for screens as small as 320px — scale font and spacing.                            |
|  **P2**  | Visual Feedback        | Positive click/tap feedback animation for all links and buttons.                                                                 |
|  **P1**  | Hover & Active States  | Distinct hover feedback and a persistent active state indicate the current screen.                                               |
|  **P1**  | Fallback Data Handling | Hardcoded default order and visibility if `navigationItems.json` fails to load.                                                  |

---

## Acceptance Criteria

- Touch targets maintain **≥44px** size across all device resolutions (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- Navigation is visible on **100%** of game screens.
- Standard nav bar shows pre-seeded links whose visibility and order are driven by `navigationItems.json` via CSS.
- Each link in the horizontal layout spans equal width to keep the bar balanced.
- Each navigation button shows a distinct hover state on pointer devices.
- The navigation button for the current screen remains visibly active.
- On screens <**480px** the bar collapses into a hamburger button; tapping reveals a vertical list.
- The function of tapping the icon in the bottom left corner works in landscape or portrait mode.
- Clicking a link navigates successfully to the intended screen.
- Tapping the bottom-left button toggles expansion/collapse.
- If `navigationItems.json` fails, apply a hardcoded default order within **<2 seconds**.
- Show notification and auto-reload if mid-session loading fails.
- Smooth re-layout during device rotation mid-animation, with transition completion time **<500ms**.
- Text contrast meets WCAG **4.5:1**.
- Animations must run at **≥60fps**.
- Respect OS-level **reduced motion** settings for users preferring minimal animations.

---

## Edge Cases / Failure States

- Data source fails → load default list in <2s.
- Menu fails mid-session → notify user and auto-reload.
- Device rotates mid-animation → cancel and re-layout.
- Small devices (<320px) → menu scales to fit.

---

## Design and UX Considerations

The standard navbar uses `--color-secondary` for its background and `--button-text-color` for text.

![Collapsed navigation bar mockup: shows the JU-DO-KON! logo in the bottom-left and a horizontal row of navigation links. The collapsed state displays only the logo, which expands to a vertical menu on tap.](/design/mockups/mockupFooterNavigationCollapsed1.png)

### Accessibility

- **44px+** touch targets (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness)).
- High-contrast text labels (WCAG 4.5:1).
- Screen reader support: all navigation elements properly labeled.
- Respect OS **reduced motion** settings.

### Responsiveness

- Layout adapts to screen widths from **320px to 2560px**.
- Equal-width links ensure buttons remain evenly spaced at all sizes.
- Below **480px**, the row collapses into a hamburger button to conserve space.

### Interaction Feedback

- Tap animation on navigation interactions.
- Smooth slide-in/slide-out transitions (**<500ms**).

---

## Open Questions

- **Pending:** Decide if the bar should auto-hide after a period of inactivity.
- **Pending:** Identify which screens, if any, should suppress the nav bar entirely.

---

[Back to Game Modes Overview](prdGameModes.md)
