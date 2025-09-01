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

- [x] Responsive tuning: header wrapping, control spacing, and narrow-width rules added to `battleCLI.html`.
- [x] Move header controls into an in-main, less-prominent settings section (`cli-settings`) and make `.cli-main` span full viewport width.
- [x] Collapsible settings panel (`#cli-settings-toggle` / `#cli-settings-body`) implemented with persistence in localStorage.

- [x] Expose programmatic settings helper on `window.__battleCLIinit.setSettingsCollapsed`.
- [x] Add Playwright countdown timing test (`playwright/countdown.spec.js`) which verifies `setCountdown` updates `data-remaining-time` atomically.
- [x] Add `src/pages/battleCLI.README.md` documenting exposed test helpers.
  - [x] Verified countdown test locally against dev server.

Next milestones:

- Add Playwright keyboard/mouse/timer specs (stat selection, next/skip, quit modal, help toggle).
- Add an integration test to simulate a single round end-to-end (engine may be mocked).
- Add README snippet documenting `window.__battleCLIinit` helpers and test hooks.

Next: implement the keyboard/mouse/timer Playwright specs (covered by the plan above) and add a small visual assertion test for header layout across viewports.

Next immediate: add Playwright visual assertions to confirm settings collapse behavior and the presence of `#cli-settings-body` and `#cli-settings-toggle` attributes across viewports.

Next: add keyboard/mouse/timer specs (stat selection, next/skip, quit modal) and a simple end-to-end match simulation test using mocked orchestrator/debug hooks.

Next: run the Playwright test and iterate if failures occur. After the test passes, consider adding more Playwright assertions for keyboard flows and full-round simulation.

Update: Center `#cli-round` in the header

- [x] Add CSS to center `#cli-round` in the header on wide viewports and fall back to normal flow on narrow viewports.

Update: Make `#cli-shortcuts` an in-flow collapsible panel

- [x] Convert `#cli-shortcuts` from a fixed floating panel to a collapsible block that uses the same `.cli-block` styling and `hidden` attribute for visibility.

Update: Ensure `#cli-shortcuts` has `.cli-block` class in markup

- [x] Verified `#cli-shortcuts` element already includes `class="cli-block"` in the HTML; no markup change required.


