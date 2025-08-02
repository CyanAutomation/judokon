# PRD: Viewport Simulation

## Overview (TL;DR)

Viewport Simulation allows users and testers to preview the JU-DO-KON! interface as it would appear on a mobile device by toggling a simulated viewport width. This is primarily used for UI testing, visual regression, and accessibility validation.

## Problem Statement / Why It Matters

Developers and testers need a quick way to verify the game's layout and behavior on mobile-sized screens without resizing the browser window or using external tools. Manual resizing is error-prone and inconsistent, making it difficult to ensure UI correctness and accessibility across devices.

## Goals / Success Metrics

- Enable one-click simulation of a mobile viewport (375px wide) for rapid UI checks
- Reduce time spent on manual browser resizing during development and testing
- Ensure screenshot and accessibility tests can be run in a consistent simulated mobile environment

## User Stories

- As a developer, I want to toggle a simulated mobile viewport so I can quickly check responsive layouts.
- As a tester, I want to enable viewport simulation to run screenshot and accessibility tests in a consistent environment.
- As a designer, I want to preview the game as it appears on mobile without using browser dev tools.

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                                 |
| -------- | --------------------------- | --------------------------------------------------------------------------- |
| P1       | Viewport Simulation Toggle  | Add a switch in Settings to enable/disable simulated mobile viewport width. |
| P1       | Simulated Viewport Styling  | When enabled, apply a fixed width (375px) and center the game UI.           |
| P2       | Persistent State (Optional) | Remember the toggle state across page reloads.                              |

## Acceptance Criteria

- Toggling the switch in Settings immediately applies or removes the simulated viewport (375px wide, centered).
- The body receives the `.simulate-viewport` class when simulation is enabled, and it is removed when disabled.
- The UI is visually constrained and centered when simulation is active.
- No errors occur if the toggle is used before the DOM is fully loaded.
- (Optional) The simulation state persists after page reload (if implemented).

## Non-Functional Requirements / Design Considerations

- The simulation must not interfere with normal gameplay or navigation.
- The feature should be accessible (toggle is keyboard and screen reader friendly).
- The implementation must not affect users who do not enable the simulation.
- The CSS for simulation should be isolated to the `.simulate-viewport` class.

## Dependencies and Open Questions

- Depends on: `src/helpers/viewportDebug.js`, `src/styles/settings.css`, and the Settings page UI.
- Open: Should the simulation state persist across sessions? (Currently not implemented.)

---
