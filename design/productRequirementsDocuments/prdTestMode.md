## Test Mode PRD

### Overview

Test Mode is a deterministic mode for JU-DO-KON! that enables predictable, repeatable game behavior for testing and debugging. When enabled, all randomization (e.g., card draws, stat selection) uses a seeded pseudo-random number generator, ensuring the same sequence of outcomes for a given seed. Test Mode is toggled via the Settings page and is visually indicated in the UI.

### Problem Statement

Developers and testers need a way to reproduce game scenarios reliably, especially for debugging, automated testing, and visual regression checks. Without deterministic behavior, it is difficult to verify that changes do not introduce regressions or to reproduce specific bugs.

### Goals / Success Metrics

- Enable deterministic, repeatable game sessions for debugging and automated tests
- Allow toggling Test Mode via the Settings UI
- Clearly indicate when Test Mode is active
- Ensure all randomization in supported game modes is controlled by the seeded generator

### User Stories

- As a developer, I want to enable Test Mode so that I can reproduce the same game flow for debugging.
- As a QA engineer, I want to run automated tests with predictable outcomes.
- As a user, I want to know when Test Mode is active so I am not confused by non-random behavior.

### Prioritized Functional Requirements

| Priority | Feature                        | Description                                                             |
| -------- | ------------------------------ | ----------------------------------------------------------------------- |
| P1       | Test Mode Toggle in Settings   | Add a switch in the Settings page to enable/disable Test Mode.          |
| P1       | Deterministic Random Generator | When Test Mode is enabled, all randomization uses a seeded generator.   |
| P1       | Test Mode Banner               | Display a visible banner or indicator when Test Mode is active.         |
| P2       | Seed Management                | Allow setting or displaying the current seed value for reproducibility. |
| P2       | Storage/Sync                   | Persist Test Mode state in settings and update UI on storage changes.   |

### Acceptance Criteria

- Test Mode can be enabled/disabled via the Settings page toggle.
- When enabled, all randomization in Classic Battle uses the seeded generator.
- A visible banner or indicator appears when Test Mode is active.
- The Test Mode state persists across page reloads and updates in real time if changed in another tab.
- (P2) The current seed value can be queried by helpers or displayed in the UI.
- Disabling Test Mode restores normal randomization.

### Non-Functional Requirements / Design Considerations

- Test Mode must not affect normal gameplay when disabled.
- Banner/indicator must be accessible and clearly visible.
- All code must be covered by unit and UI tests.
- No performance degradation in normal or test mode.

### Dependencies and Open Questions

- Depends on settings storage and feature flag infrastructure.
- Relies on all randomization in supported modes being routed through the seeded generator.
- (Open) UI for setting custom seed value is not yet implemented.
