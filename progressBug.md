# Bug Investigation Report: Battle Logic Unit/Integration Test Failures in JSDOM

## Executive Summary

**Original Issue:** Unit/integration tests for battle logic components are timing out and failing assertions in a JSDOM environment. Specifically, 6 tests were timing out (5-6 seconds each) while waiting for battle state transitions via JSDOM event simulation, and subsequently, store updates were not persisting.

**Root Cause:** JSDOM event delegation doesn't reliably trigger stat button handlers, preventing store updates

**Solution Approach:** Replace JSDOM event simulation with direct state machine dispatch to test battle logic without relying on fragile event propagation

**Current Status:** Successfully eliminated timeouts, but discovered secondary blocker: state machine dispatch completes but store doesn't update

---

## Task Contract

```json
{
  "inputs": [
    "tests/integration/battleClassic.integration.test.js",
    "src/helpers/classicBattle/uiHelpers.js",
    "src/helpers/classicBattle/selectionHandler.js"
  ],
  "outputs": [
    "tests/integration/battleClassic.integration.test.js",
    "src/helpers/classicBattle/uiHelpers.js",
    "src/helpers/classicBattle/selectionHandler.js",
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

## Original Failing Tests

1. `initializes the page UI to the correct default state`
2. `keeps roundsPlayed in sync between engine and store in non-orchestrated flow`
3. `keeps roundsPlayed in sync between engine and store in orchestrated flow`
4. `exposes the battle store through the public accessor during a full selection flow`
5. `upgrades the placeholder card during opponent reveal`
6. (6th test was using `.skip()`)

---

## Stage 1: Fix Original Timeouts ✅ COMPLETE

### What Was Done

**Replaced polling-based waits with direct state checks, aiming to isolate state machine transitions from unreliable JSDOM event simulation for button clicks:**

```javascript
// ❌ OLD: Wait for state machine to transition (timeout-prone)
const stateReached = await testApi.state.waitForBattleState("waitingForPlayerAction");
expect(stateReached).toBe(true); // Often false after 5 seconds

// ✅ NEW: Check observable outcome by allowing modal handlers to execute and then asserting DOM state
const roundButtons = document.querySelectorAll(".round-select-buttons button");
roundButtons[0].click(); // Let modal handlers execute naturally (e.g., startRound())
await testApi.state.waitForBattleState("waitingForPlayerAction", 5000); // Wait for state
const statButtons = document.querySelectorAll("#stat-buttons button[data-stat]");
expect(statButtons.length).toBeGreaterThan(0); // Direct DOM assertion
```

### Results

- **Test execution time:** Reduced from ~35 seconds for all tests to ~9 seconds
- **Per-test average:** From 5-6 seconds to <2 seconds
- **Timeouts:** Eliminated entirely
- **Test output:** Clean, no timeout errors

### Key Insight

The real issue wasn't state machine transitions—it was that clicking stat buttons in JSDOM doesn't invoke the event handlers that update the store. The polling waits were masking this deeper problem.

---

## Current Status: Task 1 Investigation - Store Update Chain Execution 🔍 **FINDINGS DOCUMENTED**

### Key Discoveries

1. **Store object itself is fully mutable** ✅
   - No Object.freeze() or Object.seal() on store
   - No non-writable property descriptors except for guard tokens (which are non-enumerable symbols)
   - Store is accessed consistently via `window.battleStore` → `testApi.inspect.getBattleStore()` → `getBattleStore()` helper
   - All paths return the same reference

2. **Mutation code is correct** ✅
   - `applySelectionToStore()` sets `store.selectionMade = true; store.playerChoice = stat;`
   - Added immediate verification that throws error if mutation fails
   - If test reaches assertion, mutations must have "succeeded" from code perspective

3. **Test Flow Issue Identified** ⚠️
   - `selectStat(store, selectedStat)` returns a Promise
   - Promise is from `handleStatSelection()` which contains full event chain
   - Guard token prevents concurrent calls but shouldn't block first call
   - BUT: Test assertions show `playerChoice` is `null` after `await selectStat()`

### Root Cause Hypothesis - NOT STORE MUTATION

The problem is **NOT** that mutations don't persist. The problem is likely:

1. **`selectStat()` promise resolves but returns early** - The guard may be blocking execution OR `validateAndApplySelection()` returns `null`
2. **Store reference issue** - Possible but unlikely given accessor implementation
3. **Event chain doesn't reach `applySelectionToStore()`** - Guard enters, but `validateSelectionState()` fails, causing early return
4. **Console logs muted** - Diagnostic logging is hidden by `withMutedConsole()`, preventing visibility

### Actual Problem

Looking at the code flow in `handleStatSelection()`:

```javascript
const guard = enterGuard(store, SELECTION_IN_FLIGHT_GUARD);
if (!guard.entered) return getHiddenStoreValue(store, LAST_ROUND_RESULT);

const values = await validateAndApplySelection(store, stat, playerVal, opponentVal);
if (!values) return; // EARLY RETURN IF VALIDATION FAILS
```

**`validateAndApplySelection()` can return `null` if `validateSelectionState()` fails!**

This means the store mutations NEVER happen if validation fails. The test should be failing with a different error OR validation is passing but something else is wrong.

### Actions Taken

- Added comprehensive logging at key checkpoints
- Added mutation verification in `applySelectionToStore()` that throws on failure
- Added diagnostic logging in test to check store reference before/after `selectStat()`
- Updated todo with findings

### Next Steps

**Must unmute console logs to see what's actually happening.** The logging infrastructure is in place but hidden. Options:

1. Remove `withMutedConsole()` wrapper around `selectStat()` call
2. Use `testApi.inspect.getDebugInfo()` to check if system is even trying to apply selection
3. Add assertion to log promise resolution value

### Files Modified

- `/workspaces/judokon/src/helpers/classicBattle/selectionHandler.js` - Enhanced logging + mutation verification
- `/workspaces/judokon/tests/integration/battleClassic.integration.test.js` - Added diagnostic assertions (still muted)

---## Technical Deep Dive

### How Stat Selection Normally Works (in App)

```
User clicks stat button
→ DOM click event fires on #stat-buttons container
→ Event listener delegates to button[data-stat]
→ Handler calls selectStat(store, stat)
→ selectStat() emits "statSelected" battle event
→ Battle event listeners update store + trigger state machine dispatch
→ State machine transitions to roundDecision
→ onEnter handlers for roundDecision execute
→ Store gets final updates (roundsPlayed++, etc.)
```

### How Tests Currently Try to Work

```
Test clicks round button
→ Modal handler dispatches startClicked event
→ State machine transitions through cooldown → roundStart → waitingForPlayerAction
→ Test waits for waitingForPlayerAction state (✅ works)
→ Test calls dispatchBattleEvent("statSelected")
→ State machine transitions to roundDecision (unclear if this works)
→ Store should be updated but isn't (❌ fails)
```

### The Disconnect

The test dispatch path skips the normal event emission chain. It goes directly to state machine dispatch without:

- Calling `selectStat()` to update initial player choice
- Emitting `emitBattleEvent("statSelected")` to trigger listeners
- Allowing orchestrator to coordinate between state machine and store

---

## Proposed Solution Path

### Option A: Hybrid Approach (Recommended)

**Strategy:** Click modal button (use normal handlers) + manually call store update functions + dispatch state event. This approach leverages the discovery that `selectStat()` *does* execute and initiate the store update chain, but its `Promise` silently swallows errors, preventing visibility into whether the updates persisted. By ensuring proper error propagation and direct invocation, we can reliably test the battle logic.

```javascript
// 1. Click round button - lets modal's startRound() work naturally
roundButtons[0].click();
await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);

// 2. Manually trigger stat selection logic
//    This bypasses unreliable JSDOM event propagation for stat buttons
const stat = "speed"; // or get from statButtons
await selectStat(getBattleStore(), stat); // Ensure proper error handling/rethrowing in selectStat()

// 3. Dispatch state machine event (if necessary, after store updates are confirmed)
await testApi.state.dispatchBattleEvent("statSelected", { stat });

// 4. Verify outcomes
expect(getBattleStore().selectionMade).toBe(true);
expect(getBattleStore().playerChoice).toBe(stat);
```

**Pros:**

- Tests actual battle logic, including the store update flow (once silent errors are addressed).
- Avoids unreliable JSDOM UI event simulation issues for stat buttons.
- Clear and explicit about what's being tested.
- Fast execution.

**Cons:**

- Calls internal functions directly (`selectStat`), **but this is explicitly mitigated by Step 3: adding unit tests for UI event binding to ensure event handlers correctly invoke `selectStat()`.**
- Relies on `selectStat()`'s promise resolving after store updates persist, which needs verification.

### Option B: Full Orchestrator Path

**Strategy:** Wire up complete event emission chain in test setup

```javascript
// Test setup properly initializes:
// - Battle store with listeners
// - Event emitter connected to state machine
// - All handlers bound correctly

// Then tests can:
selectStat(store, stat); // This triggers full event chain
// Which eventually updates store via event listeners
```

**Pros:**

- Tests the complete system
- Closest to real app behavior
- Tests event handler attachment

**Cons:**

- Complex test setup required
- Slow (similar to original timeout issue)
- Debugging difficult if something breaks

### Option C: Playwright-based Tests

**Strategy:** Move these to Playwright for real browser environment

**Pros:**

- No JSDOM limitations
- Real event handling
- Most realistic test

**Cons:**

- Slow (browser startup overhead)
- Overkill for unit/integration tests
- Maintenance burden

---

## Recommended Implementation Plan

**Execute Option A (Hybrid Approach):**

### Step 1: Update Helper Function (performStatSelectionFlow) and Address Silent Error Swallowing

Modify `performStatSelectionFlow()` to:

1. **Call `selectStat(getBattleStore(), stat)`**: Instead of manually updating store properties.
2. **Ensure `selectStat()` properly propagates errors**: Investigate and fix the silent error swallowing in `src/helpers/classicBattle/uiHelpers.js` by ensuring the `.catch()` block either rethrows or logs errors visibly, allowing tests to correctly await its completion. This is critical for reliable store updates.

```javascript
async function performStatSelectionFlow(testApi, { orchestrated = false } = {}) {
  const { state, inspect, engine, init: initApi } = testApi;

  // Wait for battle ready
  await initApi.waitForBattleReady(5000);

  // Click round button - lets modal handlers work
  const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
  roundButtons[0].click();
  await Promise.resolve(); // Let handlers execute

  // Wait for correct state
  await state.waitForBattleState("waitingForPlayerAction", 5000);

  // Get stat buttons and select one
  const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
  const selectedButton = statButtons[0];
  const stat = selectedButton.dataset.stat;

  // Call selectStat, ensuring it handles errors visibly and its promise reflects store update completion.
  await selectStat(getBattleStore(), stat);

  // Dispatch state machine event (if necessary, after store updates are confirmed)
  // await state.dispatchBattleEvent("statSelected", { stat }); // May not be needed if selectStat() handles this

  // Return results
  return {
    store: getBattleStore(), // Get the latest store state
    roundsAfter: getBattleStore().roundsPlayed,
    stat
  };
}
```

### Step 2: Update Integration Tests

Tests become simpler and faster. Assertions should be made against the actual battle store object returned by `getBattleStore()` to ensure the updates are persistent and correctly reflected.

```javascript
it("example test", async () => {
  await init();
  const testApi = window.__TEST_API;

  const result = await performStatSelectionFlow(testApi);
  const updatedStore = getBattleStore(); // Retrieve the current store state

  // Direct assertions on observable state
  expect(updatedStore.selectionMade).toBe(true);
  expect(updatedStore.playerChoice).toBeTruthy();
  // Expect roundsPlayed to increment if selectStat() orchestrates it.
  // expect(updatedStore.roundsPlayed).toBeGreaterThan(initialRoundsPlayed);
});
```

### Step 3: Add Unit Tests for UI Event Binding

Create `tests/classicBattle/uiEventBinding.test.js` to verify:

- Stat button click listeners are attached.
- Clicking buttons calls `selectStat()` with the correct arguments.
- `selectStat()` properly updates the store. This unit test should specifically mock dependencies to isolate `selectStat()`'s behavior regarding store updates.

This captures what we're NOT testing in the integration tests (direct UI interaction in JSDOM) but is critical for full coverage.

### Step 4: Validation and Verification Checklist

After implementing the changes, ensure all validation commands pass and the project's quality standards are met:

```bash
# Run battle logic integration tests
npm run test:battles:classic

# Run newly added UI event binding unit tests
npx vitest run tests/classicBattle/uiEventBinding.test.js

# Essential code quality checks
npx prettier . --check
npx eslint .
npm run check:jsdoc
npm run validate:data # Validate data schemas

# Standard verification checklist (from GEMINI.md)
# - prettier/eslint/jsdoc PASS
# - vitest + playwright PASS (targeted tests)
# - No unsuppressed console logs
# - Tests cover happy-path + edge case
# - CI pipeline green (once changes are pushed to a PR)
```

---

## Files Modified So Far

### `/workspaces/judokon/src/helpers/classicBattle/selectionHandler.js`

- **Current Status:** CONTAINS DEBUG CODE - NEEDS CLEANUP
- **Planned Change:** Remove debug error throws, ensure normal execution flow.

### `/workspaces/judokon/src/helpers/classicBattle/uiHelpers.js`

- **Current Status:** ACCEPTABLE - logs errors instead of silently swallowing (line ~819)
- **Planned Change:** Verify `selectStat()` properly propagates errors (rethrows or logs visibly).

### `/workspaces/judokon/tests/integration/battleClassic.integration.test.js`

- **Current Status:** Tests run fast but fail on store assertions (line 96-107 and multiple test cases)
- **Planned Change:** Update `performStatSelectionFlow()` to call `await selectStat(getBattleStore(), stat)` and remove manual store updates. Refine assertions to use `getBattleStore()`.

---

## Next Actions

1. **Clean up debug artifacts:** Remove debug error throws from `/workspaces/judokon/src/helpers/classicBattle/selectionHandler.js`.
2. **Fix silent error swallowing:** Modify the `.catch()` block in `selectStat()` (in `/workspaces/judokon/src/helpers/classicBattle/uiHelpers.js`) to log errors visibly and rethrow them, ensuring `selectStat()`'s promise reflects actual completion or failure.
3. **Update `performStatSelectionFlow()`:** Implement the changes for Step 1 of the "Recommended Implementation Plan" in `/workspaces/judokon/tests/integration/battleClassic.integration.test.js`.
4. **Update integration tests:** Implement Step 2 of the "Recommended Implementation Plan" by refining assertions in existing integration tests to use `getBattleStore()`.
5. **Create UI event binding unit tests:** Implement Step 3 of the "Recommended Implementation Plan" by creating `tests/classicBattle/uiEventBinding.test.js`.
6. **Validate and Verify:** Execute Step 4 of the "Recommended Implementation Plan", running all specified validation commands and confirming all tests pass.
7. **If store updates still not persisting:** If, after fixing error propagation and implementing the plan, `getBattleStore()` still does not reflect updates as expected (e.g., `roundsPlayed` not incrementing), then:
    - Add targeted logging within `applySelectionToStore()` and `roundDecision`'s `onEnter` handler.
    - Create a focused unit test for `applySelectionToStore()` as described in "Proposed Solution: Clean and Verify - Phase 4" to isolate the store object mutation.

---

## Summary

**Problem Solved:** Eliminated timeout issues in unit/integration tests (✅)

**New Problem Found:** Store updates don't happen reliably via state machine dispatch alone, and silent error swallowing masked the problem (🔄)

**Solution:** Hybrid approach combining event handlers + direct `selectStat()` call (with error propagation) + state dispatch (→)

**Expected Outcome:** Fast, reliable unit/integration tests that verify battle logic without relying on fragile JSDOM event propagation, and with proper visibility into the entire execution chain.

---

## Task 1 Investigation Summary - Status: COMPLETE ✅

### Key Findings

1. **Store mutations ARE theoretically working** - No freezing/sealing, mutations code is correct
2. **Problem is in the flow logic, NOT the store** - `validateAndApplySelection()` returns `null`, causing early exit from `handleStatSelection()`
3. **Diagnostic infrastructure is in place** - Comprehensive logging added to trace the entire chain
4. **Console logs are muted** - The diagnostics exist but are hidden by `withMutedConsole()` in tests

### Root Cause

Looking at `handleStatSelection()`:

- Guard enters successfully  
- BUT `validateAndApplySelection()` must be returning `null` (falsy)
- This causes the function to return WITHOUT reaching `applySelectionToStore()`
- Therefore no mutations happen

### Evidence

- Tests run fast (no timeouts) - proves async is working
- Assertions fail on store properties - proves mutations didn't happen
- Error verification in `applySelectionToStore()` doesn't throw - proves that code path wasn't reached

### Action Items for Task 2

Instead of "fixing silent error swallowing", the real fix is:

1. Determine WHY `validateAndApplySelection()` returns `null`
2. Check if `validateSelectionState()` is rejecting the selection
3. Verify the battle state is actually `waitingForPlayerAction` when selection happens
4. Add explicit error logging to understand the flow

The diagnostic infrastructure is READY - just needs console logs to be visible!
