<!-- Removed duplicate title block -->

# QA Report: `battleClassic.html` Review (revised)

This document is an audited and updated QA report for `battleClassic.html` (Classic Battle). It verifies the original findings, corrects the diagnosis where necessary, and provides a prioritized remediation and verification plan. Apply the fixes in small steps and re-run the verification checklist after each change.

## Short summary

- Primary symptom: the Classic Battle flow does not progress after the match-length modal—scoreboard shows "Waiting… Round 0", no cards or stat buttons render, and the **Next** button stays disabled.
- Root cause (most likely): engine/bootstrap failures during page init that are silently swallowed; cascading UI state that depends on a successfully exposed engine/store.
- Immediate goal: stop swallowing init errors, surface them to QA/UI, add deterministic test hooks, and restore the core loop so UX/accessibility fixes can be validated.

## Verified findings (accuracy and evidence)

1. Battle never starts — stuck at "Waiting…"
   - Accuracy: confirmed. The bootstrap sequence in `src/pages/battleClassic.init.js` calls `createBattleEngine()` and attaches adapters; if these steps fail the UI remains in a pre-init state.
   - Evidence: tests and Playwright specs wait for `window.battleStore` and `#stat-buttons` population; when those are missing the tests time out.

2. Clickable area mis-targets
   - Accuracy: plausible and likely. The modal overlay / backdrop insertion or removal is fragile; if the overlay isn't positioned or sized properly underlying anchors (or previously injected debug links) may receive clicks.
   - Evidence: intermittent navigation to raw `judoka.json` observed by QA; reproduce with devtools to confirm overlay bounds and event capture.

3. Keyboard selection does not work
   - Accuracy: confirmed in current pages. The modal is shown but focus and key handlers are not reliably wired or focusable elements are not focused on open.

4. Missing stat buttons and card visuals
   - Accuracy: confirmed. `#stat-buttons` stays empty because rendering depends on engine-provided stat metadata and the engine isn't available when bootstrap silently fails.

5. Scoreboard timer never displays
   - Accuracy: confirmed — timers are wired to the engine/adapter lifecycle; if init doesn't complete, timers never start.

6. No opponent action feedback and Quit flow unreachable
   - Accuracy: these are downstream symptoms of failed initialization.

7. Footer navigation accessible but breakable
   - Accuracy: confirmed. The nav bar remains active during battle; PRD requires interception or confirmation on navigation during match.

Files examined (for cross-checking):

- `src/pages/battleClassic.init.js` — entrypoint and bootstrap wiring
- `src/helpers/battleEngineFacade.js` — engine creation and adapters
- `src/helpers/classicBattle.js` — battle helpers and binding utilities
- Playwright tests: `playwright/battle-classic/*` — expected init/test hooks
- Tests/helpers: `tests/helpers/initClassicBattleTest.js`

## Root-cause analysis (concise)

1. Silent error handling: critical bootstrap steps are wrapped in `try/catch` blocks that swallow exceptions or only do a no-op. That prevents diagnostics and recovery.
2. Tight coupling: multiple UI pieces (stat buttons, timer, scoreboard) assume the engine/store is ready at specific points without explicit handshake events.
3. Modal/backdrop race: modal lifecycle and overlay insertion/removal are brittle and can leak pointer events to underlying elements.
4. Tests make optimistic assumptions: many tests wait implicitly instead of asserting the engine/store readiness via a single deterministic hook (`window.battleStore` or an `init-complete` event).

## Priority fixes (short list)

Priority 1 — Stabilize bootstrap and surface fatal errors

- Replace silent `catch {}` blocks around engine creation and event bridging with error logging and a visible UI recovery path (snackbar/error panel with "Retry").
- Expose `window.battleStore` (or an explicit `window.__battleInitComplete = true`) only after successful initialization so tests and UI can reliably wait.

Priority 2 — Make tests deterministic

- Document and standardize test hooks: `initClassicBattleTest({ afterMock: true })` and `window.__FF_OVERRIDES` usage. Add a short integration test asserting `init()` succeeds and `window.battleStore` exists.

Priority 3 — Fix modal accessibility & click-target issues

- Ensure the match-length modal focuses the first button on open and handles `keydown` for Arrow keys and `1`/`2`/`3` number keys.
- Ensure the modal overlay consumes pointer events (CSS `pointer-events` on overlay) and the overlay z-index is above all interactive content.

Priority 4 — UI/accessibility improvements

- Add `aria-describedby` to stat buttons created by `renderStatButtons`, and mark `data-buttons-ready="true"` only after DOM insertion and a short microtask tick.
- Provide visible highlight feedback for stat selection and announce selection in scoreboard text for screen readers (aria-live region).

Priority 5 — Prevent accidental navigation

- Disable/hide footer nav once a match is in progress or intercept the navigation attempt and show a confirmation modal.

## Minimal patch plan (dev-friendly steps)

1. Add robust error handling in `src/pages/battleClassic.init.js`
   - Surround `createBattleEngine()` and `bridgeEngineEvents()` with try/catch that calls a small helper `showFatalInitError(err)` and `console.error(...)` with context.
   - `showFatalInitError` should show a persistent snackbar with a "Retry" action which re-runs the bootstrap (or reloads the page).

2. Expose deterministic test hook after init
   - After successful engine creation, set `window.battleStore = store` (if not already) and `window.__battleInitComplete = true` then dispatch `document.dispatchEvent(new Event('battle:init-complete'))`.

3. Modal improvements
   - Update `initRoundSelectModal` (or the modal module) to:
     - Focus the first button on open.
     - Add scoped keydown handlers for Arrow keys and number keys.
     - Ensure overlay has `pointer-events: auto` and a z-index above page content.

4. Stat buttons & aria
   - Update `renderStatButtons` to set `aria-describedby` on each button and set `data-buttons-ready="true"` after DOM insertion and a requestAnimationFrame tick.

5. Footer nav protection
   - When match starts (after `battle:init-complete`), add a `data-battle-active="true"` attribute to the body and disable footer nav by CSS or intercept clicks to show confirmation.

Files likely to change (small, focused edits):

- `src/pages/battleClassic.init.js` (bootstrap/wiring)
- `src/helpers/classicBattle/uiHelpers.js` (new helper for snackbar) OR add helper in the page module
- `src/components/modalRoundSelect.js` (or wherever modal is implemented) — focus/key handling
- `src/pages/battleClassic.init.js` — `renderStatButtons` accessibility additions

## Verification checklist (QA steps)

1. Lint & tests (developer):

   - npx prettier . --check
   - npx eslint .
   - npm run check:jsdoc
   - npx vitest run

2. Unit / integration tests to add/verify:

   - New test asserting `init()` resolves and `window.battleStore` and `window.__battleInitComplete` are present.
   - Test for `renderStatButtons` that `#stat-buttons` contains the expected number of buttons and `data-buttons-ready="true"` is set.
   - Modal keyboard test simulating Arrow keys and `1`/`2`/`3` keys.

3. Playwright/E2E:

   - Re-run `playwright/battle-classic/end-modal.spec.js` and `playwright/battle-classic/*` smoke tests.
   - Confirm no `pageerror` console logs and the match progresses to at least one round.

4. QA manual checks:

   - Open `battleClassic.html` locally, select match length using keyboard (`1`, arrow keys) and mouse.
   - Confirm `#stat-buttons` appear, timers show, opponent chooses and round resolves.
   - Try clicking footer nav mid-match and confirm confirmation or disabled nav.

## Risk assessment & rollback

- Risk: surfacing errors may cause CI to fail on unrelated tests that previously hid faults. Mitigation: add the new error-handling as opt-in behind a feature flag initially (`window.__BATTLE_DEBUG_SHOW_ERRORS=true`).
- Rollback: revert only the bootstrap error handling changes if regressions are found; keep tests that assert the previous behavior so regressions are caught.

## Tasks & owners (suggested)

- Developer (1 day): implement defensive init + `showFatalInitError` + test hook exposure — edit `src/pages/battleClassic.init.js`.
- Developer (0.5 day): modal focus & keyboard handlers, aria updates for stat buttons.
- QA (0.5 day): run E2E/playwright tests and manual accessibility checks.

## Short-term mitigations for QA

- While fixes are rolled, QA can set `window.__FF_OVERRIDES = { showRoundSelectModal: true }` in browser console (many Playwright tests use similar overrides) and run `initClassicBattleTest({ afterMock: true })` to ensure bindings are reset for deterministic runs.
- Use `localStorage.setItem('battle.pointsToWin', '1')` to create short matches for faster validation.

## Conclusion

The original QA report was accurate: the game fails to progress because the engine/bootstrap sequence is not completing and errors are hidden. The priority is to make initialization resilient and observable, then restore the core UI flows so keyboard, accessibility, and navigation fixes can be validated. The patch plan above is intentionally small and testable; implement the bootstrap fixes first, verify, then apply the accessibility/nav changes.

## Identified issues and reproduction

Below are the primary issues observed during QA with concise reproduction steps and impact.

1. Battle never starts — stuck at "Waiting…"
   - Repro steps:
     1. Open `battleClassic.html`.
     2. Select a match length (Quick / Medium / Long) via mouse or keyboard.
     3. Modal closes; scoreboard shows "Waiting… Round 0" and the Next button is disabled; no cards or stat buttons render.
   - Impact: blocks all verification of the core loop (stat selection, scoring, timers, AI behaviour).

2. Clickable area mis-targets
   - Repro steps: interact with the match-length modal; clicks near the bottom of a button sometimes trigger navigation to unexpected targets (observed earlier as a raw `judoka.json` load).
   - Impact: accidental navigation and a fragile modal overlay/backdrop that may not fully capture pointer events.

3. Keyboard selection does not work
   - Repro steps: with the modal open, press `1`, `2`, `3`, or arrow keys — no selection occurs; only mouse click dismisses the modal.
   - Impact: fails PRD accessibility requirements for keyboard navigation.

4. Missing stat buttons and card visuals
   - Repro steps: after modal close the `#stat-buttons` container is empty and `data-buttons-ready` is not set.
   - Impact: players cannot choose stats; screen readers cannot describe choices.

5. Scoreboard timer never displays
   - Repro steps: observe `#next-round-timer` while a match is expected to start — it remains blank and no countdown runs.
   - Impact: auto-select/timeouts cannot be tested.

6. No opponent action feedback & Quit flow unreachable
   - Repro steps: rounds never reach opponent choice or reveal; quit confirmation flow does not present.
   - Impact: opponent behaviour and quit UX cannot be validated.

7. Footer navigation accessible but breakable
   - Repro steps: click bottom nav during a (supposed) match — navigation occurs without confirmation.
   - Impact: players can accidentally leave a match; PRD requires confirmation.
