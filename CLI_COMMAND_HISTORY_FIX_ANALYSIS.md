# CLI Command History Test Failure - Root Cause & Fix Analysis

## Test Information

- **File**: `playwright/cli-command-history.spec.js`
- **Test Name**: "should show stat selection history"
- **Error**: `TimeoutError: page.waitForFunction: Timeout 5000ms exceeded` at `battleStateHelper.js:288`
- **Failing Line**: Line 227 (after fix, was line 237 originally)

---

## Root Cause Analysis

### The Problem: Redundant Event Dispatching

The test was dispatching the "continue" event **twice** in the state machine:

```javascript
// BEFORE (BROKEN):
const resolution = await completeRoundViaApi(page);
// ↑ This function ALREADY dispatches "continue" internally

await waitForBattleState(page, "roundOver");

const continueResult = await dispatchBattleEvent(page, "continue");
// ↑ Manual dispatch of "continue" (REDUNDANT - already dispatched above!)

const readyForNextRound = await dispatchBattleEvent(page, "ready");
```

### Why This Caused the Timeout

The `completeRoundViaApi()` function (in `src/helpers/testApi.js:2524`) handles the complete round resolution including automatic event dispatching:

```javascript
async completeRound(roundInput = {}, options = {}) {
  // ... resolve the round ...
  if (resolvedOutcomeEvent) {
    // Dispatch the outcome event (e.g., "outcome=winPlayer")
    const dispatched = await stateApi.dispatchBattleEvent(resolvedOutcomeEvent, detail);

    // Then automatically dispatch follow-up event
    if (postOutcomeState === "roundOver") {
      const followupEvent = detail?.result?.matchEnded ? "matchPointReached" : "continue";
      await stateApi.dispatchBattleEvent(followupEvent, detail);  // ← "continue" dispatched here
    }
  }
  // Returns with finalState as "cooldown" or similar
}
```

**State Machine Flow (as intended):**

1. `roundDecision` → `roundOver` (via outcome event)
2. `roundOver` → `cooldown` (via "continue" event dispatched by `completeRoundViaApi`)
3. `cooldown` → `roundStart` → `waitingForPlayerAction` (via "ready" event)

**What Actually Happened:**

1. `completeRoundViaApi` correctly completes steps 1-2, reaching `cooldown` state
2. Test then manually dispatches "continue" again while in `cooldown` state
3. Dispatching "continue" in `cooldown` state is **invalid** - the state machine expects "ready" from cooldown
4. The machine silently ignores the invalid transition or transitions to an unexpected state
5. When the test tries to dispatch "ready" and wait for "waitingForPlayerAction", the state machine is in an inconsistent state
6. The wait times out after 5-10 seconds

### Evidence

Looking at the state handlers and the `completeRoundViaApi` implementation confirms:

- **`completeRoundViaApi` handles state transitions**: Lines 2622-2623 show automatic "continue" dispatch
- **The outcome of `completeRoundViaApi`**: The function returns `finalState` as "cooldown" or another stable state
- **The test's manual dispatch**: Redundantly tries to dispatch "continue" after it's already been dispatched
- **State machine contract**: From cooldown, only "ready" event is valid (see `src/pages/battleCLI/init.js:2579`)

---

## The Fix

### Change Made

**File**: `playwright/cli-command-history.spec.js` (lines 224-235)

**Before:**

```javascript
const resolution = await completeRoundViaApi(page);
expect(resolution.ok, resolution.reason ?? "Failed to complete round via Test API").toBe(true);
await waitForBattleState(page, "roundOver");

const continueResult = await dispatchBattleEvent(page, "continue");
expect(continueResult.ok, continueResult.reason ?? "Failed to dispatch continue").toBe(true);

const readyForNextRound = await dispatchBattleEvent(page, "ready");
```

**After:**

```javascript
const resolution = await completeRoundViaApi(page);
expect(resolution.ok, resolution.reason ?? "Failed to complete round via Test API").toBe(true);
// completeRoundViaApi automatically dispatches the "continue" event after outcome,
// so the state machine should already be in cooldown or beyond. No manual dispatch needed.

const readyForNextRound = await dispatchBattleEvent(page, "ready");
```

### Why This Fixes It

1. **Respects API Semantics**: `completeRoundViaApi` fully handles the round completion including necessary state transitions
2. **Removes Invalid State Transition**: No longer attempts to dispatch "continue" from an invalid state
3. **Correct State Flow**: Allows proper transition: `cooldown` → `roundStart` → `waitingForPlayerAction` via the "ready" event
4. **Eliminates Race Conditions**: Removes the opportunity for the state machine to be in an inconsistent state

### Test Results

**After Fix:**

- ✅ `playwright/cli-command-history.spec.js` - 2 tests passed (7.1s)
- ✅ `playwright/battle-cli-complete-round.spec.js` - 2 tests passed (13.2s)
- ✅ All unit tests - 188 passed (86.46s)
- ✅ Code formatting (prettier) - PASS
- ✅ Linting (eslint) - PASS

---

## Architectural Insights

### Why This Pattern is Important

The Test API's `completeRoundViaApi()` function abstracts away complex state machine interactions that are difficult to test manually. The function:

1. **Resolves the round** using game logic
2. **Derives the outcome event** from round results
3. **Dispatches outcome events** (winPlayer, draw, etc.)
4. **Auto-dispatches follow-up events** (continue, matchPointReached)
5. **Waits for state stability** before returning

This design pattern ensures tests don't have to manually orchestrate state transitions, reducing brittle timing-dependent code.

### Prevention for Similar Issues

To prevent this pattern from reoccurring:

1. **Document the API Contract**: `completeRoundViaApi` should clearly state that it handles all state transitions
2. **Add Logging**: The implementation should log when redundant events are encountered
3. **Validate State Preconditions**: Test helpers should validate that the state machine is in expected state before dispatching events
4. **Use Higher-Level APIs**: Prefer `completeRoundViaApi` over manual event dispatching for test flows

---

## Related Code References

- **Test API Implementation**: `src/helpers/testApi.js:2524-2720`
- **Dispatch Handler**: `src/helpers/testApi.js:330-340`
- **State Handlers**: `src/pages/battleCLI/init.js:2550-2580`
- **Test File**: `playwright/cli-command-history.spec.js:220-240`

---

## Summary

**Root Cause**: The test was redundantly dispatching the "continue" event, which was already handled by `completeRoundViaApi()`, causing the state machine to enter an invalid or inconsistent state that prevented the subsequent "ready" event from transitioning to the expected "waitingForPlayerAction" state.

**Fix**: Remove the manual "continue" dispatch and rely on `completeRoundViaApi()` to handle all necessary state transitions.

**Impact**: Fixes the timeout issue without affecting application code, only correcting improper test usage of the API.
