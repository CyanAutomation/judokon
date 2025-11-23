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

---

## Debugging Guide: Reading window.__VALIDATE_SELECTION_DEBUG

When investigating why a stat selection was rejected or why tests are failing with selection issues, use the `window.__VALIDATE_SELECTION_DEBUG` array and `window.__VALIDATE_SELECTION_LAST` object to understand what happened.

### Overview

* **`window.__VALIDATE_SELECTION_DEBUG`**: An array of debug entries, one for each time `validateSelectionState()` was called. Each entry logs validation details.
* **`window.__VALIDATE_SELECTION_LAST`**: The most recent debug entry (useful for quick inspection).
* **Populated by**: `validateSelectionState()` in `src/helpers/classicBattle/selectionHandler.js:257`
* **Available in**: Test environments (JSDOM, Vitest)

### Debug Entry Structure

Each entry in `window.__VALIDATE_SELECTION_DEBUG` is an object with:

```javascript
{
  timestamp: number,              // Unix timestamp when validation occurred
  selectionMade: boolean,         // Was store.selectionMade already true?
  current: string | null,         // Current battle state (e.g., "matchStart")
  allowed: boolean                // Was selection allowed (true) or rejected (false)?
}
```

### Example Usage in Tests

```javascript
// In a test, after calling selectStat()
console.log("Debug history:", window.__VALIDATE_SELECTION_DEBUG);
console.log("Last validation:", window.__VALIDATE_SELECTION_LAST);

// Inspect why a selection was rejected
const lastValidation = window.__VALIDATE_SELECTION_LAST;
if (!lastValidation.allowed) {
  if (lastValidation.selectionMade) {
    console.log("Rejected: Selection already made");
  } else {
    console.log(`Rejected: Invalid state '${lastValidation.current}'`);
  }
}
```

### Common Debug Scenarios

#### Scenario 1: Selection rejected due to early state

**Symptom**: Test times out or assertion fails with `store.selectionMade` still `false`.

**Investigation**:

```javascript
const history = window.__VALIDATE_SELECTION_DEBUG;
const rejections = history.filter(entry => !entry.allowed);
rejections.forEach(entry => {
  console.log(`State: ${entry.current}, Reason:`, 
    entry.selectionMade ? "duplicate" : "invalid state");
});
```

**Solution**: Ensure test waits for `waitingForPlayerAction` state before calling `selectStat()`:

```javascript
await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
```

#### Scenario 2: Duplicate selection detected

**Symptom**: Second stat selection in the same test fails.

**Investigation**:

```javascript
const entries = window.__VALIDATE_SELECTION_DEBUG;
const lastReject = entries.reverse().find(e => !e.allowed);
console.log("Was this a duplicate?", lastReject?.selectionMade === true);
```

**Solution**: Tests should not attempt multiple selections in one round. Use `resetOrchestratorForTest()` and state machine transitions to start fresh rounds.

#### Scenario 3: Understanding validation order

**Symptom**: Need to verify validation logic order (duplicate check before state check).

**Investigation**:

```javascript
// Duplicate selection check runs FIRST - before state is even read
const firstCall = window.__VALIDATE_SELECTION_DEBUG[0];
if (firstCall.selectionMade) {
  console.log("✓ Duplicate check occurred first (selectionMade was true)");
  // State value might be null/undefined if check returned early
  console.log("Current state:", firstCall.current); 
}
```

### Programmatic Access Pattern

For advanced debugging in tests:

```javascript
function getSelectionValidationHistory(filter = {}) {
  const history = window.__VALIDATE_SELECTION_DEBUG || [];
  
  if (filter.allowed !== undefined) {
    return history.filter(e => e.allowed === filter.allowed);
  }
  
  if (filter.state) {
    return history.filter(e => e.current === filter.state);
  }
  
  return history;
}

// Usage
const invalidSelections = getSelectionValidationHistory({ allowed: false });
const matchStartRejections = getSelectionValidationHistory({ state: "matchStart" });
```

### Integration with performStatSelectionFlow()

The `performStatSelectionFlow()` helper in `tests/integration/battleClassic.integration.test.js` validates selection immediately after `selectStat()` is called. If this assertion fails, check the debug history:

```javascript
// In failing test
try {
  store = ensureStore();
  expect(store.selectionMade).toBe(true); // <- Failed here?
} catch (e) {
  // Investigate why validation was rejected
  const validation = window.__VALIDATE_SELECTION_LAST;
  console.error("Validation result:", validation);
  throw new Error(`Selection was rejected. History: ${JSON.stringify(
    window.__VALIDATE_SELECTION_DEBUG
  )}`);
}
```

### Clearing Debug History

Debug history persists for the lifetime of the test. Tests automatically clear it via `resetOrchestratorForTest()` in the `afterEach` hook, but you can manually clear if needed:

```javascript
delete window.__VALIDATE_SELECTION_DEBUG;
delete window.__VALIDATE_SELECTION_LAST;
```

---

## Verification Checklist

After implementing all changes, run the following commands to verify the fix:

```bash
# 1. Run the updated battle logic integration tests.
# Expected: All tests in this suite should pass, with no timeouts.
npm run test:battles:classic

# 2. Run the newly created validateSelectionState unit tests.
# Expected: Tests verify guard path (matchStart rejection) and valid states.
npx vitest run tests/classicBattle/validateSelectionState.test.js

# 3. Run the UI event binding unit tests.
# Expected: The test should pass, confirming the UI wiring.
npx vitest run tests/classicBattle/uiEventBinding.test.js

# 4. Run essential code quality and data integrity checks.
# Expected: All checks should pass.
npx prettier . --check
npx eslint .
npm run check:jsdoc
npm run validate:data

# 5. Final check: Ensure the entire test suite passes.
# Expected: All CI checks should be green.
npm run test:ci
```
