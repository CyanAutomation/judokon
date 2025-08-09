# PRD: Viewport Simulation

## Overview (TL;DR)

Viewport Simulation allows users and testers to preview the JU-DO-KON! interface as it would appear on a mobile device by toggling a simulated viewport width. This is primarily used for UI testing, visual regression, and accessibility validation.

## Problem Statement / Why It Matters

Developers and testers need a reliable, efficient way to verify the game's layout and behavior on mobile-sized screens without resizing the browser window or relying on external tools. Manual resizing is error-prone and inconsistent, often leading to undetected UI bugs, misaligned components, or inaccessible layouts. This impacts the reliability of visual and accessibility testing across devices and screen sizes.

## Goals / Success Metrics

- Enable one-click simulation of a mobile viewport (375px wide) to improve layout validation speed
- Reduce average time spent on manual viewport adjustments by **at least 30%** during UI QA sessions
- Ensure screenshot and accessibility tests execute in a **stable, controlled viewport** across **100%** of test cases using the simulation mode
- Achieve **100% keyboard navigability** and screen reader compatibility for the toggle control

## User Stories

- As a developer, I want to toggle a simulated mobile viewport so I can quickly check responsive layouts.
- As a tester, I want to enable viewport simulation to run screenshot and accessibility tests in a consistent environment.
- As a designer, I want to preview the game as it appears on mobile without using browser dev tools.

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                                 |
| -------- | --------------------------- | --------------------------------------------------------------------------- |
| P1       | Viewport Simulation Toggle  | Add a switch in Settings to enable/disable simulated mobile viewport width. |
| P1       | Simulated Viewport Styling  | When enabled, apply a fixed width (375px) and center the game UI.           |
| P2       | Persistent State (Optional) | Remember the toggle state across page reloads using the storage utility.    |

## Acceptance Criteria

- Toggling the switch in Settings immediately applies or removes the simulated viewport (375px wide, centered).
- The `<body>` element receives the `.simulate-viewport` class when simulation is enabled, and it is removed when disabled.
- The UI is visually constrained and centered when simulation is active.
- No errors occur if the toggle is used before the DOM is fully loaded (e.g., via `DOMContentLoaded` check).
- (Optional) The simulation state is saved to and restored from persistent storage after reload.
- The toggle is accessible via keyboard and announced correctly by screen readers.
- The simulation does not interfere with navigation, gameplay, or existing responsive breakpoints.

## Edge Cases / Failure States

- The toggle is clicked before DOM is ready → simulation should defer class application until DOMContentLoaded.
- CSS file fails to load → fallback styles ensure UI remains functional.
- The screen is resized while simulation is active → layout remains constrained unless toggled off.
- Simulation conflicts with developer tools or test automation → add override flag for test environments.

## Non-Functional Requirements / Design Considerations

- The simulation must not interfere with gameplay, navigation, or other layout-dependent scripts.
- Toggle UI must comply with WCAG guidelines: fully keyboard-accessible and labeled for screen readers.
- Simulation styles must be encapsulated within the `.simulate-viewport` class to avoid style leaks.
- No impact on users who do not engage the simulation feature.

## Dependencies and Open Questions

- Depends on: `src/helpers/viewportDebug.js`, `src/styles/settings.css`, and Settings page UI components.
- Open: Should a visual indicator (e.g., label or border) show that simulation mode is active?

---

## Tasks

- [ ] 1.0 Add Viewport Simulation Toggle

  - [ ] 1.1 Add toggle switch to Settings panel
  - [ ] 1.2 Ensure toggle is accessible via keyboard and screen reader
  - [ ] 1.3 Apply/remove `.simulate-viewport` class to `<body>` on toggle

- [ ] 2.0 Apply Simulated Viewport Styling

  - [ ] 2.1 Add CSS rules to `.simulate-viewport` class for 375px width
  - [ ] 2.2 Center UI within the constrained width
  - [ ] 2.3 Test styles for responsiveness and visual alignment

- [ ] 3.0 Ensure Toggle Safety on Load

  - [ ] 3.1 Prevent errors if toggle is used before DOM is fully ready
  - [ ] 3.2 Add load state checks before applying class

- [ ] 4.0 Optional: Implement Persistent Toggle State

  - [ ] 4.1 Store toggle state using the storage utility
  - [ ] 4.2 On page load, read and re-apply state if stored

- [ ] 5.0 Accessibility Validation
  - [ ] 5.1 Confirm keyboard tab/focus support
  - [ ] 5.2 Ensure screen reader label is present
  - [ ] 5.3 Verify no interference with other accessibility tools
