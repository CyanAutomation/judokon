
## Plan

1. Add ASCII separators and retro theme styles to `battleCLI.html`.
2. Provide skeleton stat rows and expose init helpers for deterministic layout/testing (`battleCLI.init.js`).
3. Wire init helpers into `battleCLI.js` to use atomic countdown updates and clear skeletons when real stats render.
4. Add Playwright smoke test to assert skeleton, countdown attribute, and focus helpers.

## Progress

- [x] Step 1: ASCII separators and retro CSS added to `battleCLI.html`.
- [x] Step 2: `battleCLI.init.js` added and exposes helpers (`renderSkeletonStats`, `clearSkeletonStats`, `setCountdown`, `focusStats`, `focusNextHint`, `applyRetroTheme`).
- [x] Step 3: `battleCLI.js` updated to call `setCountdown` and `clearSkeletonStats` when available.
- [x] Step 4: Playwright smoke test `playwright/cli.spec.js` added.
- [x] Subtask: Dedicated header `#retro-toggle` added and wired to `cliRetro` feature flag.

Next milestones:
- Add Playwright keyboard/mouse/timer specs (stat selection, next/skip, quit modal, help toggle).
- Add an integration test to simulate a single round end-to-end (engine may be mocked).
- Add README snippet documenting `window.__battleCLIinit` helpers and test hooks.

Next: run the Playwright test and iterate if failures occur. After the test passes, consider adding more Playwright assertions for keyboard flows and full-round simulation.
