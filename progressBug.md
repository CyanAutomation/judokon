# Bug Investigation Report: Battle Logic Test Failures

## Executive Summary

**Original Issue:** Unit and integration tests that exercise the battle flow were timing out while waiting for state transitions, and the assertions that verified stat selection were observing the store only after the round had resolved.

**Root Cause Analysis:** The current codebase now protects against both failure modes that triggered the original regression.
1.  **Test Race Condition (resolved):** `performStatSelectionFlow()` captures the store and performs the assertions immediately after `selectStat()` is invoked but before awaiting the round-resolution promise. This guarantees the synchronous update is observed (see `tests/integration/battleClassic.integration.test.js:90` and `tests/integration/battleClassic.integration.test.js:105`).
2.  **Orchestrator Readiness (covered):** Every integration path waits for `waitingForPlayerAction` before interacting with stat buttons, either by using `state.waitForBattleState("waitingForPlayerAction", …)` or the `tests/classicBattle/uiEventBinding.test.js` click flow (`uiEventBinding.test.js:66`). The same helper also resets the orchestrator in `afterEach` (`tests/integration/battleClassic.integration.test.js:173`) so the state machine is always reinitialized, and `validateSelectionState()` (see `src/helpers/classicBattle/selectionHandler.js:257`) guards the synchronous dispatch to reject selections unless the state is `waitingForPlayerAction` or `roundDecision`.

**Solution Plan:** The existing tests verify the necessary behavior, so the focus shifts to keeping this coverage healthy and documenting the verification points.
1.  **Guard selection assertions:** Ensure `performStatSelectionFlow()` continues to assert the store immediately after `selectStat()` (see `tests/integration/battleClassic.integration.test.js:90` and `tests/integration/battleClassic.integration.test.js:107`).
2.  **Validate UI wiring:** Maintain the UI event binding test (`tests/classicBattle/uiEventBinding.test.js:62`) so clicks hit `selectStat` only after the orchestrator is ready.
3.  **Improve validation coverage:** Add a small unit test targeting `validateSelectionState()` (`src/helpers/classicBattle/selectionHandler.js:257`) to explicitly prove it rejects selections when the machine is still in `matchStart`, preventing regressions before new failsafe loops are added.

---

## Task Contract

```json
{
  "inputs": [
    "tests/integration/battleClassic.integration.test.js",
    "src/helpers/classicBattle/uiHelpers.js",
    "src/helpers/classicBattle/selectionHandler.js",
    "src/pages/battleClassic.init.js"
  ],
  "outputs": [
    "tests/integration/battleClassic.integration.test.js",
    "src/helpers/classicBattle/orchestrator.js",
    "tests/classicBattle/uiEventBinding.test.js"
  ],
  "success": [
    "eslint: PASS",
    "vitest: PASS (all battle logic unit/integration tests)",
    "jsdoc: PASS",
    "no_unsilenced_console_in_tests",
    "tests: happy + edge cases for UI event binding",
    "CI green"
  ],
  "errorMode": "ask_on_regression_failure"
}
```

---

## Investigation Details

### Task 1: Test Race Condition ✅ COMPLETE

*   **Finding:** The helper stopped waiting until after the round fully resolved, so assertions occasionally saw the cleared store.
*   **Resolution:** `performStatSelectionFlow()` now reads the store and asserts `selectionMade`/`playerChoice` immediately after `selectStat()` before awaiting the promise, preventing the timing window (see `tests/integration/battleClassic.integration.test.js:90` and `tests/integration/battleClassic.integration.test.js:105`).

### Task 2: Orchestrator Initialization Failure ✅ COMPLETE

*   **Finding:** The orchestrator state was sometimes still `matchStart` when `selectStat()` hit the guard, so the selection was rejected in JSDOM.
*   **Resolution:** Every integration scenario waits for the state machine to reach `waitingForPlayerAction` (see `tests/integration/battleClassic.integration.test.js:70` and `tests/classicBattle/uiEventBinding.test.js:66`), `resetOrchestratorForTest()` ensures a clean machine between runs (`tests/integration/battleClassic.integration.test.js:173`), and `validateSelectionState()` (`src/helpers/classicBattle/selectionHandler.js:257`) enforces that `selectStat()` can only succeed when the machine is in `waitingForPlayerAction` or `roundDecision`.

---

## Follow-up Suggestions

1.  **Keep the speedy store assertions:** Preserve the pattern where `performStatSelectionFlow()` reads the store right after `selectStat()` so any regression in the synchronous update fails fast (see `tests/integration/battleClassic.integration.test.js:90` and `tests/integration/battleClassic.integration.test.js:105`).
2.  **Maintain the UI event guard:** Retain the DOM-click regression captured in `tests/classicBattle/uiEventBinding.test.js:62` so interactions keep exercising the real wiring and the orchestrator is already in `waitingForPlayerAction` before the stat button click.
3.  **Surface validateSelectionState failures:** Add a synthetic unit test around `validateSelectionState()` (`src/helpers/classicBattle/selectionHandler.js:257`) that simulates being in `matchStart` and asserts the guard rejects the selection, and keep `window.__VALIDATE_SELECTION_DEBUG` data documented so future investigations can reproduce the skipped selection path.

---

## Revised Implementation Plan

1.  **Keep the integration helper assertions** in place so the store is read before the asynchronous resolution (no refactor required unless the flow changes).
2.  **Retain the UI event binding regression test** in `tests/classicBattle/uiEventBinding.test.js` to ensure DOM clicks reach `selectStat` only after the orchestrator has reached `waitingForPlayerAction`.
3.  **Add a small unit test** for `validateSelectionState()` (`src/helpers/classicBattle/selectionHandler.js:257`) that injects a fake state of `matchStart` and expects the function to reject the selection.
4.  **Continue running the targeted suites** listed in the verification checklist to guard the integration paths whenever coverage or feature flags change.

---

## Verification Checklist

After implementing all changes, run the following commands to verify the fix:

```bash
# 1. Run the updated battle logic integration tests.
# Expected: All tests in this suite should pass, with no timeouts.
npm run test:battles:classic

# 2. Run the newly created UI event binding unit tests.
# Expected: The new test should pass, confirming the UI wiring.
npx vitest run tests/classicBattle/uiEventBinding.test.js

# 3. Run essential code quality and data integrity checks.
# Expected: All checks should pass.
npx prettier . --check
npx eslint .
npm run check:jsdoc
npm run validate:data

# 4. Final check: Ensure the entire test suite passes.
# Expected: All CI checks should be green.
npm run test:ci
```
