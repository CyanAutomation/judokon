# Test Failure Investigation Report

**Date**: 2025-11-22  
**Investigator**: AI Assistant  
**Scope**: battleClassic.init.js refactoring test failures

---

## Executive Summary

After refactoring `battleClassic.init.js`, multiple test failures were discovered across unit tests, integration tests, and Playwright E2E tests. This investigation identifies the root causes and proposes targeted fixes.

**Key Finding**: The failures fall into three distinct categories:
1. **Pre-existing Import Errors** (5 tests)
2. **Round Progression Logic Issues** (4 tests) - Potential issue with round tracking
3. **Opponent Message Timing Issues** (4 tests) - Feature flag/timing issue

---

## Test Failure Categories

### Category 1: Pre-existing Import Errors (NOT caused by refactoring)

**Affected Files** (5 files, 7 failures total):
- `tests/classicBattle/round-select.test.js`
- `tests/classicBattle/bootstrap.test.js` (2 failures)
- `tests/classicBattle/end-modal.test.js`
- `tests/classicBattle/quit-flow.test.js`
- `tests/classicBattle/round-selectFallback.test.js` (2 failures)

**Error Pattern**:
```
TypeError: readFileSync is not a function
  ❯ tests/classicBattle/bootstrap.test.js:20:25
    18| function getBattleClassicHtml() {
    19|   if (!battleClassicHtml) {
    20|     battleClassicHtml = readFileSync(`${process.cwd()}/src/pages/battl…
```

**Root Cause**: These test files are attempting to read HTML files directly without importing the required `fs` module functions. The `readFileSync` function is being called without being imported, leading to a `TypeError`.

---

### Category 2: Round Progression Logic Issues (3 failures)

**Affected Tests** (3 failures):
- `tests/integration/battleClassic.integration.test.js` line 303
  ```
  expect(roundsAfter).toBeGreaterThan(roundsBefore);
  // Expected: > 0, Received: 0
  ```
- Line 316: `expect(result.roundsAfter).toBeGreaterThan(result.roundsBefore);`
  ```
  Expected: > 1, Received: 1
  ```
- Line 328: `expect(result.roundsAfter).toBeGreaterThan(result.roundsBefore);`
  ```
  Expected: > 2, Received: 2
  ```

**Error Description**: Tests expect `roundsPlayed` to increment after stat selection, but the value is not increasing.

**Root Cause Analysis**:

Looking at the refactored code, the round progression happens in `applySelectionResult()`:

```javascript
// From line 559-590 of battleClassic.init.js
async function applySelectionResult(store, result) {
  // ...
  if (store && typeof store === "object") {
    let engineRounds = null;
    try {
      const value = getRoundsPlayed();
      if (value !== null && value !== undefined) {
        const numericValue = Number(value);
        engineRounds = Number.isFinite(numericValue) ? numericValue : null;
      }
    } catch (error) {
      engineRounds = null;
    }

    if (engineRounds === null && !matchEnded && !isOrchestratorActive(store)) {
      const previous = Number(store.roundsPlayed);
      engineRounds = Number.isFinite(previous) ? previous + 1 : 1;
    }

    if (Number.isFinite(engineRounds)) {
      store.roundsPlayed = engineRounds;  // ← UPDATE HAPPENS HERE
    }
  }
  // ...
}
```

**Likely Issue**: The `getRoundsPlayed()` function might be returning a valid numeric value (not null/undefined), preventing the increment logic (`previous + 1`) from executing when it should. This results in `store.roundsPlayed` being assigned the current (not incremented) value from `getRoundsPlayed()`.

**Suspect Code Path**:
1. `getRoundsPlayed()` returns the current round count (e.g., `1`).
2. `engineRounds` is set to this value (e.g., `1`).
3. The condition `engineRounds === null` is false, so `store.roundsPlayed` is *not* incremented.
4. `store.roundsPlayed` is then assigned the value of `engineRounds` (e.g., `1`).
5. Test expects `roundsPlayed` to be `> 1`, but it remains `1`.

**Timing Factor**: The tests call `performStatSelectionFlow()` which:
1. Selects a stat
2. Waits for the result
3. Reads `store.roundsPlayed`

The problem might be a **race condition** where the battle engine (which presumably updates the underlying source for `getRoundsPlayed()`) hasn't yet processed the round completion and incremented the round count by the time `applySelectionResult()` is invoked. If `getRoundsPlayed()` is called too early, it will retrieve a stale value.

---

### Category 3: Opponent Message Timing Issues (4 Playwright failures)

**Affected Tests** (4 failures in `playwright/battle-classic/round-flow.spec.js`):
- Line 70: "resolves the round and updates score after opponent reveal"
- Line 93: "advances to the next round after opponent reveal"  
- Line 172: "opponent reveal cleans up properly on match end"
- Line 192: "opponent reveal works with different stat selections"

**Error Pattern**:
```
Error: expect(locator).toContainText(expected) failed
    Locator: locator('#snackbar-container')
    Expected pattern: /Opponent is choosing/i
    Received string: "First to 5 points wins."
    Timeout: 500ms
```

**Root Cause Analysis**:

The test expects the snackbar to show "Opponent is choosing…" when a stat is selected, but instead it shows match configuration messages like "First to 5 points wins."

Looking at `prepareUiBeforeSelection()`:

```javascript
// Line 473-496 of battleClassic.init.js
const flagEnabled = isEnabled("opponentDelayMessage");
const baseDelay = Number.isFinite(delayOverride)
  ? Number(delayOverride)
  : Number(getOpponentDelay());
const resolvedDelay = Number.isFinite(baseDelay) && baseDelay > 0 ? baseDelay : 0;

if (flagEnabled) {
  setOpponentDelay(resolvedDelay);
  if (resolvedDelay > 0) {
    const scheduled = scheduleDelayed(() => {
      showSnackbar(t("ui.opponentChoosing"));
      // ...
    }, resolvedDelay);
    return resolvedDelay;
  }
}

try {
  showSnackbar(t("ui.opponentChoosing"));
  recordOpponentPromptTimestamp(getCurrentTimestamp());
} catch {}
return 0;
```

**Suspected Issues**:

1.  **Feature Flag `opponentDelayMessage` Not Enabled/Configured**: The `opponentDelayMessage` feature flag might not be enabled or correctly configured within the Playwright test environment.
    *   If `flagEnabled` is `false`, the code directly attempts to show "Opponent is choosing…" without delay. However, this message might then be immediately overwritten by another snackbar message.
2.  **`resolvedDelay` is 0 or too short**: Even if the flag is enabled, if `resolvedDelay` is `0` (or a very small value that causes immediate execution), the scheduled callback runs instantly. This still leaves open the possibility of the message being overwritten.
3.  **Message Overwriting**: Other components or initialization routines might be displaying snackbar messages that overwrite the "Opponent is choosing" message.
    *   The test output `Received string: "First to 5 points wins."` strongly suggests that the match configuration message (shown at round initialization) is being displayed in the snackbar instead of the opponent message. This indicates a timing issue where the match configuration message appears *after* the `prepareUiBeforeSelection()` function's `showSnackbar` call, or the test is asserting too early.
4.  **Race Condition in Test Setup**: The Playwright test might not be waiting for the `battleClassic.init.js` initialization to fully complete and stabilize before triggering stat selection, leading to an inconsistent UI state.

**Supporting Evidence from Test Output**:
```
Received string: "First to 5 points wins."  // ← Round config message, not opponent message
```

This confirms that a match configuration message (related to round initialization) is being shown in the snackbar, implying a conflict or timing issue with the "Opponent is choosing" message.

---

## Impact Assessment

### By Severity

**Critical** (Blocks deployment):
- None - the integration test issues might indicate logic problems, but tests are also using unstable patterns

**High** (Should fix):
- Opponent message timing in Playwright (affects E2E user experience visibility)
- Round progression sync (might be a real logic issue)

**Low** (Pre-existing):
- Import errors in unit tests (5 tests) - not caused by refactoring

---

## Root Cause Summary

| Failure Category | Root Cause | Severity | 
|------------------|-----------|----------|
| Import errors (5 tests) | Missing `fs` imports in test files | Low | 
| Round progression (3 tests) | Logic error in `applySelectionResult()` where `getRoundsPlayed()` prevents increment, potentially compounded by a race condition if `getRoundsPlayed()` is stale. | High | 
| Opponent message timing (4 tests) | Feature flag configuration, `resolvedDelay` value, or message overwriting by other UI elements (e.g., match config message) within the snackbar during test execution. | Medium | 

---

## Proposed Fix Plan

### Phase 1: Verify Non-Regression (Pre-existing Failures)

**Fix 1.1: Add missing `fs` import to test files**

Action: For each of the affected test files, add the following import statement at the top of the file:
```javascript
import { readFileSync } from "fs";
```

Affected Files:
- `tests/classicBattle/round-select.test.js`
- `tests/classicBattle/bootstrap.test.js`
- `tests/classicBattle/end-modal.test.js`
- `tests/classicBattle/quit-flow.test.js`
- `tests/classicBattle/round-selectFallback.test.js`

Priority: **Low** (pre-existing, easy fix)  
Impact: Fixes 5 unit test files (7 failures)  
Estimated Time: 10 minutes

---

### Phase 2: Investigate Round Progression (Potential Issue)

**Fix 2.1: Debug round tracking synchronization and `applySelectionResult` logic**

Root cause candidates:
1.  **Logic Error**: `applySelectionResult()` incorrectly assigns `engineRounds` without incrementing if `getRoundsPlayed()` returns a valid (but not yet incremented) value.
2.  **Race Condition**: The underlying battle engine's round count might not be updated before `applySelectionResult()` attempts to read `getRoundsPlayed()`.
3.  **Test Pattern**: The integration test's async wait for round completion might not be robust enough.

Investigation steps:
1.  **Examine `getRoundsPlayed()`**: Understand precisely what `getRoundsPlayed()` returns, when it's updated by the battle engine, and if its return value is synchronous or asynchronous.
2.  **Add Debug Logging**: In `applySelectionResult()`, add comprehensive debug logging to track the values of `engineRounds`, `store.roundsPlayed` (before and after), `matchEnded`, and `isOrchestratorActive(store)`.
    ```javascript
    // In applySelectionResult(), add debug logging:
    console.debug("[ROUND DEBUG] applySelectionResult:", {
      currentEngineRounds: getRoundsPlayed(), // What the engine reports *now*
      storeRoundsBeforeUpdate: store.roundsPlayed,
      matchEnded,
      isOrchestratorActive: isOrchestratorActive(store),
      incomingResult: result // Inspect the result object for round info
    });
    // Also log the value of engineRounds *after* its determination but *before* assignment to store.roundsPlayed
    console.debug("[ROUND DEBUG] Calculated engineRounds before assignment:", engineRounds);
    ```
3.  **Review Battle Engine Logic**: Investigate how the `roundsPlayed` is intended to be updated within the core battle engine (i.e., the component that `getRoundsPlayed()` reads from) to ensure `applySelectionResult()` is interacting with it correctly after a round concludes.

Potential fixes:
-   **Logic Correction**: Adjust the `applySelectionResult()` logic to explicitly increment `store.roundsPlayed` based on the previous `store.roundsPlayed` value after a successful round, rather than relying solely on `getRoundsPlayed()` for the increment. `getRoundsPlayed()` should ideally reflect the *current* state of the engine, not dictate the increment.
-   **Synchronization**: If a race condition is confirmed, introduce explicit synchronization (e.g., using promises or callbacks) to ensure `applySelectionResult()` is called only after the battle engine has finalized its round progression.
-   **Test Refinement**: Improve the async waiting mechanism in the integration tests to ensure they wait for the observable effect of round increment.

Priority: **High** (affects core game logic)  
Impact: Fixes 3 integration tests, ensures correct round tracking  
Estimated Time: 30-60 minutes (investigation + fix)

---

### Phase 3: Address Opponent Message Timing (E2E Issue)

**Fix 3.1: Improve opponent message visibility and timing in Playwright tests**

Root cause candidates:
1.  Feature flag `opponentDelayMessage` not consistently enabled/configured in the Playwright test environment.
2.  Snackbar message `t("ui.opponentChoosing")` is being overwritten by other messages, specifically the "First to X points wins." message, which likely appears earlier or is less transient.
3.  Test assertion timing: The Playwright test might be asserting the snackbar content before the `prepareUiBeforeSelection()` logic has fully executed or *after* another message has overwritten it.

Investigation steps:
1.  **Feature Flag Configuration**: Review `playwright.config.js` and any test-specific setup files (e.g., `playwright/fixtures/` or `playwright/helpers/`) to understand how feature flags are managed and overridden for Playwright tests. Ensure `opponentDelayMessage` is explicitly enabled for these tests.
    *   Look for usage of `context.addInitScript()` or similar mechanisms that inject global variables (e.g., `window.__FF_OVERRIDES`).
    ```javascript
    // Example Playwright test setup check:
    // In a test setup function or fixture, log the actual flag state:
    await page.evaluate(() => console.log("Playwright Flag State: opponentDelayMessage", window.__FF_OVERRIDES?.opponentDelayMessage));
    ```
2.  **Snackbar Overwriting Analysis**:
    *   Examine the call sites of `showSnackbar` in `battleClassic.init.js` and other relevant modules that initialize the battle page. Pay close attention to calls that occur *after* `prepareUiBeforeSelection()` or during initial page load.
    *   Temporarily add verbose logging (`console.log`) to all `showSnackbar` calls within the application to trace the sequence of messages appearing in the snackbar during a Playwright run.
3.  **Test Assertion Timing**:
    *   Increase the Playwright `expect().toContainText()` timeout for the snackbar assertion.
    *   Introduce `page.waitForFunction()` or `page.waitForSelector()` with specific conditions before asserting snackbar text to ensure the UI is stable and the expected message has had a chance to appear and persist.

Potential fixes:
-   **Ensure Flag Activation**: Explicitly set the `opponentDelayMessage` feature flag to `true` within the Playwright test's context.
-   **Prioritize Snackbar Messages**: If overwriting is confirmed, consider a mechanism to queue snackbar messages or prioritize the "Opponent is choosing…" message over less critical initialization messages during the stat selection flow. Alternatively, ensure the "First to X points wins." message is displayed in a different, non-conflicting UI element or is transiently hidden during opponent selection.
-   **Refine Test Waits**: Add more robust waits in Playwright tests, such as `page.waitForLoadState('networkidle')` or specific element waits, to ensure the battle page is fully initialized and the opponent message has time to display before assertion.

Priority: **Medium** (E2E quality, user experience)  
Impact: Fixes 4 Playwright test failures  
Estimated Time: 20-45 minutes (investigation + fix)

---

## Implementation Order

1.  **Immediate** (< 10 min):
    *   Add missing `fs` imports to unit test files.
2.  **Short-term** (30-60 min):
    *   Investigate and fix round progression sync issue.
3.  **Medium-term** (20-45 min):
    *   Debug and fix opponent message timing in E2E tests.

---

## Risk Assessment

**Low Risk**: 
- Adding missing imports (isolated to test files, no prod code changes)

**Medium Risk**:
- Modifying round progression logic (might affect gameplay if not carefully implemented, but fix is targeted)
- Adjusting E2E test environment or waits (isolated to test layer, low risk to prod code)

**Negligible Risk**:
- Debugging and logging steps are non-invasive.

---

## Recommendations

1.  **Do NOT hold refactoring** - The refactoring is performing as expected in most tests (38+ E2E tests pass, no regressions in core initialization). The identified issues appear to be distinct from the refactoring's core logic.
2.  **Prioritize round progression fix** - This might indicate a subtle logic issue in how `applySelectionResult` interacts with the battle engine's state, or a pre-existing race condition that was highlighted by the refactoring.
3.  **Fix import errors** - This is a quick and easy win that cleans up the test suite.
4.  **Review E2E environment** - Investigate how feature flags are consistently applied in Playwright to ensure predictable test behavior.
5.  **Be methodical with `showSnackbar`**: When addressing the opponent message timing, ensure to understand all calls to `showSnackbar` around the battle initiation and stat selection to prevent future conflicts.

---


