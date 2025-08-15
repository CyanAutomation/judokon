# Battle Debug Panel PRD

## Overview (TL;DR)

The Battle Debug Panel is a developer/tester-facing overlay in JU-DO-KON!'s Classic Battle mode. It displays real-time game state (scores, timer, match status, and test mode seed) to aid debugging, test automation, and QA. The panel is toggled via a switch in the Settings page and is hidden from regular players by default.

## Problem Statement / Why It Matters

Developers and testers need a way to observe internal game state (e.g., scores, timers, match end, test mode seed) during Classic Battle rounds for debugging, test automation, and rapid QA. Without a debug panel, verifying state transitions and diagnosing issues is slow and error-prone.

## Goals / Success Metrics

- Enable developers/testers to view up-to-date battle state at a glance
- Accelerate debugging and test script development
- Ensure the panel is never visible to regular players unless explicitly enabled

## User Stories

- As a developer, I want to see the current scores, timer, and match state during a battle so I can verify logic and debug issues.
- As a tester, I want to enable a debug overlay from Settings so I can observe state changes while running manual or automated tests.
- As a player, I never see the debug panel unless I opt in via Settings (or a debug flag is set).

## Terminology / Definitions

- **Debug Panel Toggle**: A switch in the Settings page that enables or disables the debug panel overlay.
- **Debug Panel Flag**: A configuration value (e.g., `DEBUG_LOGGING=true`) that forces the panel to be visible for development or testing purposes.
- **Test Mode Seed**: A value used to initialize the game state for reproducible test scenarios.

## Prioritized Functional Requirements

| Priority | Feature                       | Description                                                                                 |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| P1       | Debug Panel Toggle            | Add a toggle in Settings to enable/disable the debug panel overlay in battle mode           |
| P1       | Real-Time State Display       | Show current player/computer scores, timer state, match end status, and (if test mode) seed |
| P1       | Persistent Panel Placement    | Panel appears in the battle UI, does not overlap controls, and remains visible when enabled |
| P2       | Accessibility Compliance      | Panel uses semantic markup (e.g., <pre>, aria-live) for screen reader compatibility         |
| P3       | Hide in Production by Default | Panel is hidden unless explicitly enabled (or DEBUG_LOGGING=true)                           |

## Acceptance Criteria

- Debug panel is hidden by default for all users
- Enabling the toggle in Settings immediately shows the debug panel in Classic Battle
- Panel displays a JSON-formatted object with: playerScore, computerScore, timer, matchEnded, and seed (if test mode)
- Panel updates in real time after each round, stat selection, and timer event
- Panel uses <pre> and aria-live attributes for accessibility
- Disabling the toggle hides the panel immediately
- Panel does not interfere with normal gameplay controls or layout

## Non-Functional Requirements / Design Considerations

- Panel must not degrade performance or cause layout shifts
- Panel content must be readable and not overlap critical UI elements
- Panel must be accessible to screen readers

## Dependencies and Open Questions

- Depends on battle state APIs (getScores, getTimerState, isMatchEnded, getCurrentSeed)
- Relies on Settings page infrastructure for feature flag
- Open: Should the panel be available in all battle modes or only Classic?
