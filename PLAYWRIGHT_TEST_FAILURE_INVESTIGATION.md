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

The test helper should check if the round is actually in `roundDecision` state with a selection made. If so, the state machine should naturally progress. The issue might be:

1. The round isn't actually entering `roundDecision` state properly
2. The `roundDecisionEnter` handler isn't completing (maybe waiting for player choice when one already exists)
3. Timing issues with async resolution

### Investigation Needed

1. Check if clicking a stat properly sets `store.playerChoice` and triggers entry to `roundDecision`
2. Verify that `resolveSelectionIfPresent` is being called in `roundDecisionEnter`
3. Check if there are guards or conditions preventing natural resolution
4. Look at why the CLI resolution method works but the fallback doesn't

### Recommended Fix Approach

Instead of trying to forcibly transition states, the test should:

1. Ensure selection is properly made (`store.playerChoice` is set)
2. Ensure state machine is in `roundDecision` 
3. Wait for natural resolution through the `roundDecisionEnter` handler
4. If resolution is stalled, use the actual CLI API method that works

The CLI resolution method (`api.cli.resolveRound()`) already works correctly. The fallback should either:

- Wait longer for natural resolution
- Call the proper resolution pipeline functions
- Or simply fail the test if resolution doesn't happen naturally

## Files Involved

- `/workspaces/judokon/playwright/battle-classic/support/opponentRevealTestSupport.js` - Contains broken fallback
- `/workspaces/judokon/src/helpers/classicBattle/stateTable.js` - State machine definition
- `/workspaces/judokon/src/helpers/classicBattle/stateHandlers/roundDecisionEnter.js` - Round resolution handler
- `/workspaces/judokon/src/helpers/classicBattle/stateHandlers/roundDecisionHelpers.js` - Resolution logic
- `/workspaces/judokon/src/helpers/BattleEngine.js` - Where `roundsPlayed` is incremented

## Status

Currently attempted fixes have not resolved the issue. The fundamental problem is that we need the proper round resolution flow to execute, not just state transitions.
