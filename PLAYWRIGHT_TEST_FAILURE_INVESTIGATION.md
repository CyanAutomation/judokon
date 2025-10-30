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

## ✅ Solution Implemented

**Root Cause:** Tests were using `forceResolve: true` which triggered deterministic resolution code that bypassed the natural orchestrated battle flow. This caused multiple issues:

1. The Test API's `cli.resolveRound()` only dispatched "roundResolved" event without executing resolution logic
2. The "roundResolved" event is a notification emitted AFTER resolution, not a trigger to START resolution
3. Forcing resolution bypassed proper state machine transitions and counter updates

**Fix:** Removed `forceResolve: true` from test calls to `ensureRoundResolved()`, allowing rounds to resolve naturally through the orchestrated flow:

```javascript
// Before (broken):
await ensureRoundResolved(page, { forceResolve: true });

// After (working):
await ensureRoundResolved(page);
```

**Why This Works:**

- `ensureRoundResolved(page)` without options waits for battle state to become "roundOver" (650ms timeout)
- This allows the natural resolution flow to execute:
  1. User clicks stat button
  2. State machine transitions to `roundDecision`
  3. `roundDecisionEnter` handler calls `resolveSelectionIfPresent`
  4. `resolveRound` executes full pipeline
  5. `evaluateOutcome` → `engineFacade.handleStatSelection()` → increments `roundsPlayed`
  6. `emitRoundResolved` emits "roundResolved" event
  7. State transitions to `roundOver`
- All counters update correctly, selection state resets properly

**Test Results:** ✅ Both tests now pass (21.1s runtime)

**Lesson Learned:** Avoid bypassing orchestrated flows in tests. Testing through natural user interactions and waiting for state changes is more reliable than forcing internal state mutations.
