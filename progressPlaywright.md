# Playwright test progress and recommendations

This document cleans and expands the earlier assessment of Playwright specs. It summarizes the highest-impact problem areas, gives actionable quick fixes, and provides a prioritized plan for improving test determinism, runtime, and signal quality.

## Executive summary

- Many high-value Playwright specs rely on brittle patterns: `page.waitForTimeout`, direct internal test hooks (e.g. `window.__test` / `__battleCLIinit`), and placeholder assertions like `expect(true).toBe(true)`.
- These anti-patterns make tests fast to write but poor at catching regressions and add unnecessary runtime. A focused effort (lint + small refactors) will significantly reduce flakiness and execution time.

## Top problem specs (high-level)

1. `playwright/hover-zoom.spec.js` — heavy sleeps + placeholder assertions; replace sleeps with semantic waits for `data-enlarged` or element size changes.
   - **Actions taken:** Replaced placeholder assertions `expect(true).toBe(true)` in the keyboard accessibility test with meaningful checks: hover first card to enlarge it, focus it, verify focus, tab to next element, and assert focus moved away from the first card.
   - **Outcome:** Test now passes and provides real signal for keyboard accessibility during hover. No sleeps were found in this file; the main issue was weak assertions. Runtime improved slightly (from ~2.9s to ~2.4s in this test).

2. `playwright/battle-cli-play.spec.js` — uses internal helpers (not real UI flows); finish rounds through UI or deterministic public Test API and assert snackbar/scoreboard.
   - **Actions taken:** Replaced `window.__test.cli.resolveRound` with attempts to use public Test API: set opponent resolve delay to 0, clicked stat button, tried dispatching "statSelected" and "roundResolved" events, and used `expireSelectionTimer` to force resolution. Added assertions for scoreboard updates (#score-display, #cli-score attributes).
   - **Outcome:** Test still fails to resolve the round using public APIs; the Test API lacks a direct round resolution method, and event dispatching didn't trigger UI updates. The internal hook provides the only deterministic way to resolve rounds currently. Test runtime ~11s with timeouts. Requires adding a public `resolveRound` method to Test API or changing test to not expect round resolution (e.g., just assert stat selection UI changes).
3. `playwright/battle-cli-restart.spec.js` — ends match via internal hooks; use supported user flows or test APIs and assert reset behaviour.
   - **Actions taken:** Replaced `window.__test.handleMatchOver()` with `window.__TEST_API.state.dispatchBattleEvent("matchOver")` using the public Test API. Added wait for Test API availability.
   - **Outcome:** Test now passes and uses public API for match ending. Runtime improved to ~1.1s (from previous failure). Successfully asserts "Play Again" button visibility and stats reset after restart. No internal hooks needed; event dispatching works for this flow.
4. `playwright/battle-classic/opponent-reveal.spec.js` — stacked timeouts; wait for explicit snackbar/score state and split overlapping scenarios.
   - **Actions taken:** Removed explicit timeout from snackbar expect (was 1000ms) to rely on Playwright's default retry. The spec already uses semantic waits (waitForBattleState, waitForRoundsPlayed) instead of raw timeouts. Identified overlapping scenarios in tests like "opponent reveal integrates with battle flow" which tests stat selection, round completion, next button, and multi-round flow in one test. Considered splitting but tests are failing at startMatch step, indicating deeper initialization issues rather than wait problems.
   - **Outcome:** Tests use semantic waits but fail at battle initialization (startMatch waiting for data-battle-state). Runtime per test ~12s with failures. Requires fixing battle start logic or page setup before optimizing waits. Splitting overlapping tests would improve focus but needs stable base first.
5. `playwright/battle-classic/end-modal.spec.js` — sleeps after match end; await modal/end-game promises and assert dialog actions/content.
   - **Actions taken:** Added deterministic test mode with seed 5 for judoka selection. Modified the test to click the 'power' stat button instead of the first available. Added waits for the end modal (#match-end-modal) to appear after match completion, and assertions for the modal title ("Match Over"), and the presence of replay (#match-replay-button) and quit (#match-quit-button) buttons. Removed the __NEXT_ROUND_COOLDOWN_MS override as it was not the source of sleeps.
   - **Outcome:** Test fails because the end modal does not appear after the match completes (score updates to "You: 1 Opponent: 0"). The showEndModal function is called when matchEnded is true, but the modal is not visible in the DOM. Possible causes: modal not appended/opened in test environment, CSS visibility issues, or bug in modal display logic. The test now properly waits for semantic conditions instead of raw timeouts, but the modal absence blocks completion. Requires debugging why the end modal is not displayed despite match completion.
6. `playwright/cli.spec.mjs` (merged into `playwright/cli.spec.js`) — relies on DOM mutation helpers; drive the flow through public controls.
7. `playwright/cli-flows.spec.mjs` — keyflow checks assert only visibility; expand checks to assert help text, modals, or state changes.
8. `playwright/battle-next-skip.non-orchestrated.spec.js` — builds flow by injecting events; recreate via orchestrated flow and public events.
9. `playwright/cli.spec.js` — invoke accessible interactions instead of helper bootstraps so failures reflect user-visible regressions.
10. `playwright/battle-classic/timer.spec.js` — swaps `waitForTimeout` polls for expectations tied to countdown element / test API hooks.

## Common problems observed

- Use of `page.waitForTimeout` instead of waiting for semantic conditions (locator text, attributes, network/state events).
- Direct invocation of internal test helpers (e.g. `window.__test.handleRoundResolved`) instead of exercising the UI or deterministic public test APIs. This masks real regressions.
- Placeholder or trivial assertions like `expect(true).toBe(true)` provide no signal.
- Some spec files appear not to be executed (not present in JSON reports) and are likely dead/uncoupled from runner configuration.

## Quick wins (0.5–2 days)

1. Add a Playwright test lint rule / pre-commit grep to detect and fail on:
   - `waitForTimeout\(`
   - `expect(true).toBe(true)` and other placeholder assertions
   - direct accesses to `window.__test` / `__battleCLIinit`

2. Replace obvious sleeps in `hover-zoom.spec.js` and `timer.spec.js` with semantic locator waits:
   - `await expect(locator).toHaveAttribute('data-enlarged', 'true')` or `await expect(locator).toHaveCSS('width', /\d+/)`

3. Consolidate or remove duplicate/merged specs (e.g. ensure `cli.spec.mjs` -> `cli.spec.js` is the canonical file).

4. Add meaningful assertions in suites that currently assert only visibility.

## Medium-term work (2–5 days)

1. Refactor CLI and battle tests that call internal hooks to instead use one of:
   - the public deterministic Test API (if available), or
   - UI interactions (page.click, page.fill, keyboard events) combined with explicit waits for state changes.

2. Audit Playwright runner config so every spec is registered. Remove or archive dead files that are not included in the runner.

3. Add a small helper library for common, deterministic waiters (snackbar text, countdown completion, modal opened) to reduce duplicated code and mistakes.

## Long-term / architectural (1–2+ weeks)

1. Create CI gates for test-level metrics: per-spec runtime budget, flakiness threshold, and test coverage (report missing critical flows).
2. Add flaky-test tracking and alerts (use Playwright reporter integration or a simple artifact with failing-statistics over time).
3. Consider stricter test contracts: require a happy-path + one edge-case for each new spec and enforce via PR template / CI check.

## Opportunities / additional suggestions

- Replace raw timeouts with `page.waitForResponse` or test API event hooks when the UI triggers network requests.
- Centralize commonly used selectors in a `tests/selectors.js` to avoid fragile queries in many places.
- Use Testing Library or Playwright's `getByRole`/`getByText` for semantic queries where possible.
- Add `data-testid` attributes for fragile, implementation-specific selectors so tests assert behaviour, not structure.

## Suggested prioritized plan (concrete)

1. (Day 0–1) Add linter/grep checks to CI to block `waitForTimeout`, `expect(true).toBe(true)`, and `window.__test` usage. (Quick)
2. (Day 1–3) Implement common wait helpers (snackbar, modal, countdown) and replace sleeps in top 5 problem specs. (Medium)
3. (Day 3–7) Replace internal helper usage in CLI/battle specs with public flows; re-run Playwright suite and collect flake metrics. (Medium)
4. (Week 2+) Add CI metrics, flaky-tracking, and PR enforcement for test quality (Long).

## How to validate changes

- Run a targeted subset of Playwright specs after each change (quick smoke):

```bash
npx playwright test playwright/hover-zoom.spec.js -g "zoom" --reporter=list
```

- Grep for banned patterns locally:

```bash
rg "waitForTimeout|expect\(true\)\.toBe\(|window.__test|__battleCLIinit" playwright/ --hidden
```

- Use Playwright's HTML reporter to compare before/after runtimes and flakiness.

## Next steps (who/what)

1. Add the lint/grep checks to CI and fail the build on matches. (owner: test owner)
2. Replace obvious sleeps in `hover-zoom.spec.js`, `timer.spec.js`, and `end-modal.spec.js`. (owner: test author)
3. Re-audit the runner to ensure `battle-cli-play.spec.js` and `battle-cli-restart.spec.js` are either included in the runner or removed. (owner: infra)

---

If you want, I can:

- open a PR that implements the quick linter checks and replaces sleeps in `hover-zoom.spec.js` and `timer.spec.js` (I can prepare a focused change set), or
- produce the helper wait utilities and apply them to the top 3 specs.

Choose one and I'll mark the next todo in-progress and start implementing it.

