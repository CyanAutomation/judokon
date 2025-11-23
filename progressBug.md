# Bug Investigation Report: Battle Logic Test Failures

## Executive Summary

**Status**: Implementation in progress with unit test success, but orchestrator state transition issue identified in integration tests.

**Completed Work**:

1. ✅ Exported `validateSelectionState()` function and `VALID_BATTLE_STATES` constant from `src/helpers/classicBattle/selectionHandler.js`
2. ✅ Created comprehensive unit test `tests/classicBattle/validateSelectionState.test.js` with 18 passing tests covering:
   - Valid state acceptance ("waitingForPlayerAction", "roundDecision", null)
   - Invalid state rejection ("matchStart", "roundOver", etc.)
   - Duplicate selection guard
   - Error handling
   - Debug tracking via `window.__VALIDATE_SELECTION_DEBUG`
3. ✅ Documented `window.__VALIDATE_SELECTION_DEBUG` debugging guide with scenarios, usage patterns, and programmatic access
4. ✅ Refactored `performStatSelectionFlow()` to add better error diagnostics

**Current Issue**: Integration tests reveal that the orchestrator state machine is not transitioning to `waitingForPlayerAction` after round selection. When `selectStat()` is called, `validateSelectionState()` correctly rejects the selection because the battle state is still `matchStart` instead of the expected `waitingForPlayerAction`.

**Root Cause**: The orchestrator state machine may not be initializing properly in the JSDOM test environment, or state transitions are not being triggered by the round selection event.

---

## Implementation Progress

### Task 1: validateSelectionState() Unit Test ✅ COMPLETE

**File**: `tests/classicBattle/validateSelectionState.test.js`

**Tests Added**:

- Happy path tests: Valid states (`waitingForPlayerAction`, `roundDecision`, null)
- Guard path tests: Invalid states (`matchStart`, `roundOver`, `roundCooldown`, `matchOver`, unknown states)
- Duplicate selection guard
- Error handling
- Debug tracking verification
- API coverage for `VALID_BATTLE_STATES` constant

**Result**: All 18 tests passing. The guard path is now explicitly covered, ensuring that selections in `matchStart` state (the failing integration test scenario) will be properly rejected with appropriate event emission.

### Task 2: window.__VALIDATE_SELECTION_DEBUG Documentation ✅ COMPLETE

**Location**: Added to `progressBug.md` (lines 79-185)

**Documentation Includes**:

- Overview of debug arrays and their purpose
- Debug entry structure with field definitions
- Example usage patterns in tests
- 3 common debug scenarios with investigation steps
- Programmatic access pattern for filtering debug history
- Integration with `performStatSelectionFlow()` error handling
- Manual cleanup instructions

**Impact**: Developers can now quickly diagnose why selections are rejected by checking `window.__VALIDATE_SELECTION_DEBUG` and understanding the validation flow order (duplicate check → state check).

### Task 3: performStatSelectionFlow() Enhancement ✅ PARTIAL

**File**: `tests/integration/battleClassic.integration.test.js` (lines 91-130)

**Changes Made**:

- Added clear documentation with 6-step flow pseudocode
- Separated store assertion from round resolution
- Added diagnostic error handling that inspects `window.__VALIDATE_SELECTION_DEBUG`
- Enhanced error message to surface root cause (state not yet ready, or duplicate)

**Current Test Results**: Tests fail with clear diagnostic showing:

```javascript
Selection was rejected by validateSelectionState: 
selectionMade=false, current state=matchStart
```

This is actually GOOD - the guard is working correctly. The issue is that the orchestrator state machine is not transitioning as expected when the round button is clicked.

---

## Analysis: Orchestrator State Transition Issue

### Symptom

After clicking the round select button and waiting for `waitingForPlayerAction`, the state remains `matchStart`:

```javascript
❯ performStatSelectionFlow tests/integration/battleClassic.integration.test.js:119:13
Selection was rejected because current state=matchStart
```

### Investigation

1. **waitForBattleState() is completing** - The promise resolves without timeout, but the state assertion immediately after shows `matchStart`.
2. **validateSelectionState is working correctly** - It properly rejects the selection when state is not in `VALID_BATTLE_STATES`.
3. **Orchestrator initialization appears successful** - The orchestrator is initialized with `await initClassicBattleOrchestrator(store, startRound)` in `src/pages/battleClassic.init.js:1775`.

### Possible Root Causes

1. **State Getter Timing Issue**: The `waitForBattleState()` polls `getBattleState()`, which might be reading a stale or cached value.
2. **State Transition Not Triggered**: The round button click might not be properly triggering the orchestrator's initial state transition.
3. **Orchestrator Event Listener Issue**: The orchestrator might not be properly listening to round start events in JSDOM.
4. **Module-Level State Leakage**: Despite `resetOrchestratorForTest()` being called in `afterEach`, the orchestrator might be retaining state across test runs.

### Next Steps for Resolution

1. **Verify orchestrator initialization**: Add diagnostic logging to `initClassicBattleOrchestrator()` to confirm it's being called and returning a valid machine.
2. **Check state getter accuracy**: Verify that `getBattleState()` is consistently returning the current machine state in tests.
3. **Inspect round button event flow**: Verify that clicking the round button properly dispatches `startClicked` and triggers the orchestrator state transition.
4. **Review orchestrator event listeners**: Ensure all orchestrator event listeners are properly attached in the JSDOM environment.

---

---

---

## Debugging Guide: Reading window.__VALIDATE_SELECTION_DEBUG

When investigating why a stat selection was rejected or why tests are failing with selection issues, use the `window.__VALIDATE_SELECTION_DEBUG` array and `window.__VALIDATE_SELECTION_LAST` object to understand what happened.

### Overview

- **`window.__VALIDATE_SELECTION_DEBUG`**: An array of debug entries, one for each time `validateSelectionState()` was called. Each entry logs validation details.
- **`window.__VALIDATE_SELECTION_LAST`**: The most recent debug entry (useful for quick inspection).
- **Populated by**: `validateSelectionState()` in `src/helpers/classicBattle/selectionHandler.js:257`
- **Available in**: Test environments (JSDOM, Vitest)

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
