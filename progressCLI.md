# QA Report — `src/pages/battleCLI.html`

This document contains a reviewed and reformatted QA report for the Classic Battle CLI interface. For each issue I include: a short description, reproduction steps (as reported), my verification status, feasibility of the proposed fix, and an actionable plan. At the end you'll find cross-cutting opportunities for improvement and recommended next steps.

## Summary of issues

| # | Issue | Impact |
|---:|------|--------|
| 1 | Unintuitive Match Start | Poor discoverability; keyboard-only users may be confused or blocked. |
| 2 | Missing "3-Point" Match Length | Divergence from PRD; players cannot select a 3-point quick match. |
| 3 | Unreliable Seed Determinism | Violates deterministic seed requirement; undermines repeatability for QA and automation. |
| 4 | Incomplete Settings Persistence | Settings reset on reload; tests and users can't rely on stored preferences. |
| 5 | Timer Doesn't Pause on Tab Hide | Players can lose time while the tab is hidden. |
| 6 | Confusing Dual Timers | Redundant, inconsistent timer displays confuse players and assistive tech. |
| 7 | Unclear Verbose Mode | Verbose log is not visible/obvious — reduces observability. |
| 8 | Round Counter Glitch on Quit | UI briefly shows previous match state — minor UX confusion. |
| 9 | Incorrect Keyboard Shortcut State | Number keys may change settings unexpectedly. |

---

## Per-issue verification, feasibility, and plan

Notes on verification terminology:

- Confirmed — I inspected the code and the behavior is supported by the implementation.
- Partially confirmed — code shows signs of the issue but further runtime checks are advised.
- Not reproduced — code review didn't show a clear reproduction; runtime logging/tests recommended.

### 1) Unintuitive Match Start

- Verification: Confirmed — `renderStartButton` is a fallback and the main flow uses an initialization modal which hides a clear start control.
- Fix feasibility: Easy — UI and tabindex changes only.
- Plan:
  - Always show a prominent, accessible "Start Match" button on the initial screen.
  - Ensure it is the first focusable control and that Enter activates it.
  - Keep the existing modal behavior as an alternative but not the only entry point.

### 2) Missing "3-Point" Match Length

- Verification: Confirmed — `POINTS_TO_WIN_OPTIONS` in `src/config/battleDefaults.js` currently lists `[5,10,15]`.
- Fix feasibility: Easy — change config and update the `<select>` default.
- Plan:
  - Update `src/config/battleDefaults.js` to `[3,5,10]`.
  - Update `src/pages/battleCLI.html` `<select>` options to match and set default to 5.
  - Add a small unit/integration test that asserts available options.

### 3) Unreliable Seed Determinism

- Verification: Confirmed — `initSeed()` runs on page load but `resetMatch()` doesn't re-run it, so seeds aren't applied consistently when restarting matches.
- Fix feasibility: Moderate — small code change but needs tests to validate determinism across full match lifecycle.
- Plan:
  - Call `initSeed()` (or central seed-apply logic) from `resetMatch()` so the engine receives the seed on each new match.
  - Add a deterministic test (seed n => first-round stats stable) to `tests/`.

### 4) Incomplete Settings Persistence

- Verification: Partially confirmed — there is existing `localStorage` wiring, but the seed/win-target application path is buggy.
- Fix feasibility: Moderate — ensure storage reads/writes map to applied engine state.
- Plan:
  - Make `initSeed()` apply stored seed to the engine via `setTestMode()` (not just place in an input field).
  - Fix `restorePointsToWin` so it reliably reads/writes to `localStorage` and updates the UI and engine.
  - Add tests that simulate reloads and assert persisted state.

### 5) Timer Doesn't Pause on Tab Hide

- Verification: Partially confirmed — there is a `visibilitychange` handler, but a subtle bug (e.g., missed pausing of some timers or multiple timer sources) is likely.
- Fix feasibility: Moderate — needs careful tracing and tests using fake timers.
- Plan:
  - Add diagnostic logging to `pauseTimers`/`resumeTimers` to confirm invocation.
  - Audit all timer uses and ensure each timer id is paused/resumed (selection, cooldown, main countdown).
  - Add unit tests using fake timers that simulate visibility changes.

### 6) Confusing Dual Timers

- Verification: Confirmed — two different timer displays are updated from different code paths and the legacy timer hide logic is fragile.
- Fix feasibility: Moderate — refactor display logic and remove legacy code.
- Plan:
  - Consolidate the timer display to one canonical element.
  - Remove/update legacy timer code and any CSS that references it.
  - Add a small visual smoke test to confirm single consistent update source.

### 7) Unclear Verbose Mode

- Verification: Partially confirmed — verbose UI exists but reveal logic may not be triggered or CSS may hide it.
- Fix feasibility: Easy–Moderate — UI reveal + focus/auto-scroll behavior.
- Plan:
  - Ensure `setupFlags()` properly toggles the verbose log container class/aria attributes.
  - Auto-scroll logs and set focus when verbose is enabled.
  - Add a test that toggles verbose and asserts the log container is visible and receives focus.

### 8) Round Counter Glitch on Quit

- Verification: Likely — race condition in `resetMatch()` where UI updates are not applied synchronously before async operations.
- Fix feasibility: Easy — ensure synchronous DOM update order.
- Plan:
  - Update `resetMatch()` to synchronously set the round counter to 0 and flush UI updates before starting async teardown/initialization.
  - Add a test that rapidly quits and re-enters and asserts UI shows `Round 0` immediately.

### 9) Incorrect Keyboard Shortcut State

- Verification: Not reproduced from code review — `onKeyDown` appears to gate keys by state, but a runtime condition or focus target could bypass it.
- Fix feasibility: Moderate — requires runtime tracing.
- Plan:
  - Add logging to `onKeyDown` in `src/pages/battleCLI/events.js` to capture the currently focused element and state when numeric keys are pressed.
  - If reproduced, tighten `shouldProcessKey` or `routeKeyByState` logic to ignore numeric keys when not in-match.

---

## Opportunities for improvement (cross-cutting)

- Add automated tests for each behavioral requirement: seed determinism, settings persistence, timer pause/resume, verbose log visibility, and keyboard shortcut state. Prefer unit tests with fake timers + small integration tests.
- Centralize feature flags and UI wiring: ensure that toggles like "Verbose" only change the presentation layer through a single well-tested API.
- Introduce short smoke/e2e tests (Playwright) for the CLI flows to catch regressions (start match, restart, quit, visibility change).
- Add `data-testid` attributes to key UI elements (start button, timer, verbose log) to make tests robust.
- Consider adding a simple visual regression snapshot test for the initial page layout to detect missing elements like the Start button.

## Next steps and acceptance criteria

Recommended next actions:
1. Implement the easy fixes first: (1) Start button visibility and accessibility, (2) update win-target options to include 3, (3) immediate UI fix for round counter.
2. Add unit tests for seed determinism and settings persistence before changing engine wiring.
3. Instrument timers with logging and write fake-timer tests for visibility behavior.
4. After changes, run the project's validation checklist (prettier, eslint, vitest, Playwright) and include results in the PR body.

Acceptance criteria for this work:

- Start button is visible, keyboard-accessible, and triggers a match start.
- Win-target options include [3,5,10] and default to 5.
- Seed determinism is reproducible: same seed → same first-round stats across fresh matches.
- Settings persist across reloads and are applied to the engine.
- Timers pause on tab hide and resume accurately.

## What I changed in this document

- Reformatted the QA report with headings and a summary table.
- Added explicit verification status and feasibility for each issue.
- Expanded the fix plan into actionable steps and added cross-cutting opportunities.

---

