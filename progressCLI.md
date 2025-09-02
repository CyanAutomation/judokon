## Battle CLI — progress and plan

This file documents the current implementation status for the Classic Battle CLI and the next actions to bring the codebase in line with the PRD.

Summary

- Source UI: `src/pages/battleCLI.html` and logic in `src/pages/battleCLI.js` and `src/pages/battleCLI.init.js` are implemented and wired to the Classic Battle engine.
- Several P1 items are implemented; a few UX/robustness items remain (visibility/timer resume, explicit Next button, input debounce guard, muted logger routing for tests).

Approach

- Keep changes small, low-risk, and testable. Implement missing features in priority order: timers/visibility handlers, input debounce, explicit Next control, retro toggle and feature-flag wiring, then muted logger routing and tests.

- Checklist (next actions)
- [x] Add visibilitychange/pageshow handlers to call `pauseTimers()`/`resumeTimers()` (file: `src/pages/battleCLI.js`). <!-- done -->
  - Note: handlers added to `init()` to call `pauseTimers()` on `pagehide`/`visibilitychange` and `resumeTimers()` on `pageshow`/visibility restore to avoid double-firing timers when the tab is hidden or restored.
- [ ] Add local debounce guard to `selectStat()` and central key handler to reject input while a selection is resolving.
- [ ] Add local debounce guard to `selectStat()` and central key handler to reject input while a selection is resolving.
- [x] Add an explicit, focusable "Next" button for pointer users in `handleBattleState` when `roundOver` (id: `next-round-button`). <!-- done -->
  - Note: `handleBattleState` now creates a focusable `#next-round-button` when `roundOver` and removes it on other state transitions; clicking triggers a `continue` dispatch and clears the bottom hint.
- [ ] Route verbose logs through the project's muted logger helper (or add a small wrapper) so CI tests remain quiet when verbose mode is enabled.
- [ ] Add Playwright/Vitest checks for visibility/timer resume, input debounce, and Next button behavior.

Notes / Assumptions

- The engine and orchestrator are statically imported and already wired; changes will not alter engine semantics.
- I will keep feature-flag guards consistent with `initFeatureFlags()` usage already present.

If you want, I can implement the highest-priority fixes now (visibility handlers, debounce, Next button). Tell me which to prioritize or approve the full list and I'll apply the changes and run quick tests.
