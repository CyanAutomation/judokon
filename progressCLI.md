# CLI Battle Mode QA Report (revised)

## Overview

This document reviews the current CLI Battle Mode QA findings, validates the accuracy and feasibility of the originally-documented fixes, and expands each item with concrete, testable remediation steps, validation gates, and risk notes. The goal is to make the ticketing and implementation process straightforward for engineers.

## Assumptions

- The repository exposes the helper and component paths mentioned below (for example `src/helpers/battleEngineFacade.js`, `src/components/StatDisplay.js`).
- The CLI Battle Mode shares the same event and state patterns used elsewhere in the codebase (see `AGENTS.md` guidance about hot-path static imports, scheduler usage, and no dynamic imports in hot paths).
- Tests use Vitest (repository contains `vitest.config.js`) and Playwright for end-to-end flows.

## Mini Contract (per issue)

- Inputs: current runtime state during a battle, component props, and events emitted by the battle engine.
- Outputs: deterministic UI that reflects actual game state, reliable timers, correct post-round summaries, and sub-100ms reaction to input in typical scenarios.
- Success criteria: Reproducibility decreases to ≤1/10 for intermittent issues, and all high-impact issues show reproducible fixes with accompanying unit + integration tests.

## Key Findings (validated + expanded)

### 1) Stat Selection Display Issues

- Description: During stat selection the displayed stat values can become out-of-sync with the true Judoka data. Symptoms point to stale reads or inconsistent subscriptions to the authoritative state.
- Impact: High — incorrect information changes player decisions.
- Reproducibility: High (9/10 in QA runs).

- Root-cause hypotheses:

  - `battleEngineFacade` may be serving cached or shallow-copied objects that are mutated elsewhere.
  - `StatDisplay` may read props once and not subscribe to state/event updates.

- Concrete fix plan (feasible steps):

  1. Inspect `src/helpers/battleEngineFacade.js` for public accessors (e.g., getCurrentStats, subscribe). If these do not exist, add a minimal, well-documented API: getCurrentStats(), on(event, cb), off(event, cb).
  2. Ensure the facade returns immutable snapshots (Object.freeze or shallow clone) or uses an event to broadcast updates after mutation.
  3. Update `src/components/StatDisplay.js` to subscribe to the facade's update events during mount and unsubscribe during teardown. Avoid reading values only from initial props.
  4. Add a small integration test `tests/cli/statDisplay.spec.js` that:

     - Boots a minimal battle state, emits a stat change, and asserts the DOM output updates within a short timeout.
  5. Add unit tests that verify facade's getCurrentStats returns a stable snapshot and that mutations only happen through explicit API calls.

- Tests & validation:

  - Unit: Vitest tests for facade API (happy + mutation edge-case).
  - Integration: Lightweight DOM test (vitest + jsdom or Playwright) that simulates a stat change and asserts UI update.
  - Quality gate: lint, vitest run, and a short Playwright smoke spec for stat selection.

- Risk & notes:

  - Changing data access patterns may touch hot-path code; avoid adding heavy dependencies. Prefer small event emitters or simple publish/subscribe pattern aligned with existing code.
  - Follow the project's no-dynamic-imports-in-hot-paths rule.

### 2) Countdown Timer Inconsistencies

- Description: The CLI countdown occasionally skips or shows incorrect values under load.
- Impact: Medium — affects perceived responsiveness.
- Reproducibility: Intermittent (6/10).

- Root-cause hypotheses:

  - Use of setInterval/setTimeout for UI rendering under variable CPU load.
  - Timer logic and display updates running on different clocks or threads.

- Concrete fix plan (feasible steps):

  1. Inspect `src/helpers/countdownTimer.js` and identify if it's using native timers for rendering.
  2. For UI updates, prefer `requestAnimationFrame` / `scheduler.onFrame()` for smooth rendering and avoid coupling game logic ticks to render ticks.
  3. Introduce a single authoritative game clock for logic (e.g., `GameClock` in `src/helpers/gameClock.js`) which exposes the current logical time and emits `tick` events. The countdown should derive from this clock.
  4. Throttle or debounce non-essential UI updates; keep game-decisions driven by deterministic logical ticks.
  5. Add tests:

     - Unit test for countdown math (time left calculation under artificial clock advances).
     - Integration test that simulates rapid user input during countdown and asserts expected outcomes.

- Tests & validation:

  - Verify that under accelerated clock advancement, the displayed countdown remains consistent with logical time.
  - Run browser performance profiling during Playwright runs for the countdown page to capture frame drops.

- Risk & notes:

  - Introducing a `GameClock` module is a small refactor but improves determinism and testability. Keep implementation lightweight and static-imported into hot paths.

### 3) Post-Round Summary Glitches

- Description: Summary sometimes displays stale winner/loser or mixes previous-round data.
- Impact: Medium.
- Reproducibility: Intermittent (5/10).

- Root-cause hypotheses:

  - Missing cleanup of component-local state between rounds.
  - Race between round-end event and summary rendering.

- Concrete fix plan (feasible steps):

  1. Add an explicit `roundReset` lifecycle event emitted by the battle orchestrator (`src/helpers/battleEvents.js`).
  2. Ensure `src/components/RoundSummary.js` listens for `roundReset` and clears any local caches, timers, and DOM fragments.
  3. Add defensive code in `RoundSummary` to always derive winners/losers from the authoritative source (facade/getRoundResult) on render, not from stale props.
  4. Add tests:

     - Integration test that runs two quick rounds and asserts the second summary is correct.

- Tests & validation:

  - Add Vitest integration tests and a Playwright smoke test that plays two fast rounds and checks the summary text.

### 4) Input Handling Delays

- Description: Selecting stats or confirming actions sometimes lags, producing a sluggish UI.
- Impact: High.
- Reproducibility: High (8/10).

- Root-cause hypotheses:

  - Synchronous heavy work in input handlers.
  - Main thread contention from expensive synchronous tasks.

- Concrete fix plan (feasible steps):

  1. Audit `src/helpers/inputHandler.js` to find long synchronous operations inside event callbacks.
  2. Move heavy computations off the main thread (Web Worker) or break them into smaller async chunks using `setTimeout(..., 0)` / microtasks if appropriate.
  3. Use `requestIdleCallback` for low-priority background work and `passive` listeners for scroll/gesture handlers if used.
  4. Ensure handlers return quickly and that UI feedback (pressed state) is shown immediately while work continues in the background.
  5. Add tests:

     - Unit tests asserting handlers return within a short time budget (mocking heavy ops).
     - E2E test simulating rapid input and asserting no missed events.

- Tests & validation:

  - Performance budget: aim for handler latency < 100ms under test harness conditions.

## General Recommendations (expanded)

- Focused code review on the identified modules and their immediate dependencies.
- Increase unit and integration test coverage for state transitions (facade, GameClock, RoundSummary, StatDisplay).
- Add tiny, focused Playwright smoke specs for each high-impact flow (stat selection, countdown, round summary, rapid input).
- Performance profiling: Run Playwright with --trace or use browser devtools during reproduction to capture stacks for slow handlers.

## Validation / Quality Gates

- Pre-merge checks: npx prettier . --check && npx eslint . && npm run check:jsdoc (if present) && npx vitest run --run.
- Post-fix verification: run affected Playwright specs (or the small smoke tests added in the repo) and validate no unsuppressed console errors (follow `AGENTS.md` guidance to use `withMutedConsole` in tests where warnings are expected).

## Edge cases to test

- Very fast consecutive rounds (to expose race conditions).
- Simulated CPU load (to reproduce timer skips).
- Rapid input bursts (to reproduce input lag).

## Suggested Test Names and Locations

- `tests/cli/statDisplay.spec.js` — integration test for stat update propagation.
- `tests/helpers/countdown.spec.js` — unit tests for countdown arithmetic and tick derivation.
- `tests/components/roundSummary.spec.js` — integration test covering multi-round rendering.
- `playwright/countdown.spec.js` — small E2E smoke test for countdown under interaction.

## Next steps (detailed)

1. Triage and prioritize: fix order recommended — StatDisplay (High), InputHandler (High), Countdown (Medium), RoundSummary (Medium).
2. Create small PRs each containing one focused change and accompanying unit + integration tests.
3. Run lint, vitest, and Playwright smoke tests locally before merge; add CI jobs if not present.
4. Re-run QA scenarios and close issues once reproducibility drops to ≤1/10 for intermittent bugs.

## Completion summary

What changed in this document:

- Validated original findings and expanded each with concrete, implementable steps, tests, validation gates, and risk notes.
- Added assumptions, a mini-contract, test names, and a prioritized next-steps list to make handoff to engineers simple.
