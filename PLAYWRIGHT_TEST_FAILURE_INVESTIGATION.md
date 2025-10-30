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

## Status

Currently attempted fixes have not resolved the issue. The fundamental problem is that we need the proper round resolution flow to execute, not just state transitions.
