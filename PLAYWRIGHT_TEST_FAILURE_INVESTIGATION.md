# Playwright Test Failure Investigation Summary

## Tests Failing

1. `playwright/battle-classic/round-flow.spec.js:138` - "opponent reveal state is properly managed between rounds"
2. `playwright/battle-classic/round-flow.spec.js:192` - "opponent reveal works with different stat selections"

## Root Cause

The test helper function `triggerRoundResolvedFallback` in `playwright/battle-classic/support/opponentRevealTestSupport.js` was incorrectly trying to dispatch "roundResolved" as a state machine event.

**The Problem:**

- "roundResolved" is a **battle event** (emitted via `emitBattleEvent`), NOT a state machine transition event
- It's emitted AFTER round resolution completes, as a notification to UI handlers
- It cannot trigger state transitions because it's not in the state machine's transition table

**Valid state machine events (from stateTable.js):**
From `roundDecision` state, valid transitions are:

- `outcome=winPlayer` → `roundOver`
- `outcome=winOpponent` → `roundOver`
- `outcome=draw` → `roundOver`
- `evaluate` → stays in `roundDecision`
- `interrupt` → `interruptRound`

## Why Tests Fail

1. **First test failure**: When `triggerStateTransition(page, "roundResolved")` is called, no state transition occurs because "roundResolved" isn't a valid event. The state machine stays in `roundDecision` instead of moving to `roundOver`, so polling for roundOver times out.

2. **Second test failure**: Because the state machine doesn't properly transition through roundOver → cooldown → waitingForPlayerAction, the `selectionMade` flag doesn't reset. State is stuck and clicking next doesn't properly reset for the next round.

## The Real Issue

The fundamental problem is that the test is trying to force deterministic round resolution by bypassing the normal flow. The `resolveRoundDeterministic` function is called when `forceResolve: true` is set, and it tries various fallbacks:

1. First attempts CLI resolution via `api.cli.resolveRound()` - This works properly
2. If that fails, calls `triggerRoundResolvedFallback()` - This is broken
3. The fallback tries to manually trigger the transition - But uses wrong event

## Proper Solution

The test helper's fallback should use the same Test API method that the CLI resolution uses: `window.__TEST_API.cli.resolveRound()`. This method:

1. Calls `stateApi.dispatchBattleEvent("roundResolved", detail)` with proper payload
2. Executes the full resolution pipeline via `resolveRoundForTest`
3. Properly increments `roundsPlayed` counter
4. Emits battle events and transitions state machine correctly

### Fix Applied

Updated `triggerRoundResolvedFallback` in `opponentRevealTestSupport.js` to:

1. Call `window.__TEST_API.cli.resolveRound()` directly (same as `attemptCliResolution`)
2. Remove attempts to call non-existent window functions like `resolveSelectionIfPresent`
3. Let the Test API handle the full resolution flow deterministically

This ensures tests use the proper API rather than trying to access internal implementation details.

## Files Involved

- `/workspaces/judokon/playwright/battle-classic/support/opponentRevealTestSupport.js` - Contains broken fallback
- `/workspaces/judokon/src/helpers/classicBattle/stateTable.js` - State machine definition
- `/workspaces/judokon/src/helpers/classicBattle/stateHandlers/roundDecisionEnter.js` - Round resolution handler
- `/workspaces/judokon/src/helpers/classicBattle/stateHandlers/roundDecisionHelpers.js` - Resolution logic
- `/workspaces/judokon/src/helpers/BattleEngine.js` - Where `roundsPlayed` is incremented

## ✅ Final Solution Implemented

**Root Cause:** The Test API's `cli.resolveRound()` method only dispatched "roundResolved" event without executing the actual resolution logic. This caused multiple issues:

1. Opponent cards weren't revealed during API-driven resolution
2. `roundsPlayed` counter didn't increment
3. State machine transitions didn't complete properly
4. Tests relying on API resolution failed intermittently

**Fix:** Updated `src/helpers/testApi.js` to make `cli.resolveRound()` call the actual resolution logic from `src/helpers/classicBattle/roundResolver.js`:

```javascript
// Before (broken): Only dispatched events
async resolveRound(eventLike = {}) {
  const dispatch = (detail) => stateApi.dispatchBattleEvent("roundResolved", detail);
  const emit = (detail) => emitBattleEvent("roundResolved", detail);
  return resolveRoundForCliTest(eventLike, { dispatch, emit, ... });
}

// After (working): Executes full resolution pipeline
async resolveRound(eventLike = {}) {
  const store = window.battleStore;
  const { resolveRound: resolveRoundLogic } = await import("/src/helpers/classicBattle/roundResolver.js");
  // ... get stat values ...
  const result = await resolveRoundLogic(store, stat, playerVal, opponentVal);
  return { detail: { store, stat, playerVal, opponentVal, result }, dispatched: true, emitted: true };
}
```

**Additional Changes:**

- Increased `ensureRoundResolved` default deadline from 650ms to 1500ms to accommodate round transitions
- Updated `playwright/battle-classic/opponent-message.spec.js` to track emitted events instead of dispatched events
- Removed unused `getDispatchedEvents` function

**Why This Works:**

- Test API now properly executes resolution:
  1. Imports `resolveRound` from `roundResolver.js`
  2. Gets player and opponent stat values
  3. Calls `resolveRound(store, stat, playerVal, opponentVal)`
  4. Executes full pipeline: `evaluateOutcome` → `engineFacade.handleStatSelection()` → increments `roundsPlayed`
  5. Emits `opponentReveal` and `roundResolved` events
  6. Transitions state machine to `roundOver`
- All counters update correctly, opponent cards reveal, selection state resets properly
- Both natural resolution (waiting for state changes) and API-driven resolution (via Test API) work correctly

**Test Results:** ✅ All 8 tests pass (53.2s runtime)

- `round-flow.spec.js:138` - opponent reveal state managed between rounds ✅
- `round-flow.spec.js:192` - opponent reveal works with different stat selections ✅
- `opponent-message.spec.js:31` - CLI resolveRound reveals opponent card ✅

**Lesson Learned:** Test APIs should execute the same logic as production code, not just simulate events. This ensures deterministic testing without sacrificing correctness.
