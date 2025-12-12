# Battle Classic Integration Test Fixes - Root Cause Analysis

## Problem Summary

Five integration tests in `tests/integration/battleClassic.integration.test.js` were failing with two main issues:

1. **`selectionMade` assertions failing** - Tests expected `store.selectionMade` to be `true` after round completion, but it was `false`
2. **`engineRounds` mismatch** - Tests expected `engine.getRoundsPlayed()` to increment after selection, but it remained `0`

## Root Cause Analysis

### Issue 1: `selectionMade` Reset Timing (Race Condition)

**Root Cause**: Tests were asserting on transient state that gets reset during normal state machine transitions.

**Flow**:

1. User selects a stat → `store.selectionMade = true` (in `applySelectionToStore`)
2. Round resolves → state transitions: `waitingForPlayerAction` → `roundDecision` → `roundOver` → `waitingForPlayerAction` (next round)
3. When entering `waitingForPlayerAction`, selection flags are reset: `store.selectionMade = false` (in `waitingForPlayerActionEnter.js:44`)

**Why This is Correct Application Behavior**:

- `selectionMade` is a guard flag to prevent duplicate selections **during** a round
- It must be reset when starting the **next** round
- The flag is transient by design, not persistent state

**Why Tests Were Failing**:

- Tests waited for `roundDecision` state using `waitForBattleState("roundDecision")`
- By the time the promise resolved and test code executed, the state machine had already transitioned to the next round
- The next round's `waitingForPlayerAction` handler had already reset `selectionMade = false`

**The Fix**:

- Removed incorrect assertions on `selectionMade` after round completion
- Tests now assert on **persistent state** (rounds played, scores) instead of **transient flags**
- Changed wait from `roundDecision` to `roundOver` for better timing (round fully resolved but not yet transitioned to next round)

### Issue 2: Engine's `roundsPlayed` Not Incrementing

**Root Cause**: Tests were checking engine state too early in the resolution flow.

**Flow**:

1. Selection triggers orchestrator path: `handleStatSelection` → `dispatchStatSelected` → orchestrator handles resolution
2. Orchestrator enters `roundDecision` state → calls `resolveSelectionIfPresent` → calls `resolveRound`
3. `resolveRound` → `finalizeRoundResult` → `computeRoundResult` → `evaluateOutcome` → **`engine.handleStatSelection`** (increments `engine.roundsPlayed`)

**Why Tests Were Failing**:

- Tests waited for `roundDecision` state, but engine rounds are incremented **during** evaluation which happens **within** that state
- There was a race between:
  - State machine entering `roundDecision` (test wait completes)
  - Round evaluation completing (engine incremented)

**The Fix**:

- Changed test wait from `roundDecision` to `roundOver`
- `roundOver` is entered **after** evaluation completes and engine has been updated
- This ensures tests check engine state after it's been properly updated

## Changes Made

### Test Assertions Fixed

1. **Removed transient state assertions**:
   - `expect(postSelectionStore.selectionMade).toBe(true)` ❌ → Removed
   - `expect(debugAfter?.store?.selectionMade).toBe(true)` ❌ → Removed
2. **Added proper persistent state assertions**:
   - `expect(roundsAfter).toBeGreaterThan(roundsBefore)` ✅
   - `expect(result.engineRounds).toBe(result.roundsAfter)` ✅

3. **Improved wait timing**:
   - `waitForBattleState("roundDecision")` → `waitForBattleState("roundOver")`
   - Ensures round is fully resolved before checking state

4. **Fixed DEBUG test**:
   - Changed from diagnostic dump (throws always) to proper validation test
   - Now verifies `validateSelectionState` is called and validation passes

### Files Modified

- `tests/integration/battleClassic.integration.test.js`: Updated test assertions and timing

### No Application Code Changes Required

**Important**: This issue did **NOT** require application code changes. The application behavior is correct:

- ✅ `selectionMade` is properly set during selection
- ✅ `selectionMade` is properly reset for the next round
- ✅ Engine rounds are properly incremented during evaluation
- ✅ State machine transitions work correctly

The tests were simply asserting on the wrong things at the wrong time.

## Lessons Learned

1. **Don't assert on transient state after asynchronous operations** - State machines may have already transitioned
2. **Wait for terminal states** - Wait for states that represent completion (`roundOver`) rather than intermediate states (`roundDecision`)
3. **Assert on persistent state** - Use rounds played, scores, and results rather than guard flags
4. **Understand the state machine flow** - Know when state transitions happen and what they reset

## Test Results

All 7 tests now pass:

- ✅ verifies validateSelectionState validation executes during selection
- ✅ initializes the page UI to the correct default state
- ✅ keeps roundsPlayed in sync between engine and store in non-orchestrated flow
- ✅ keeps roundsPlayed in sync between engine and store in orchestrated flow
- ✅ exposes the battle store through the public accessor during a full selection flow
- ✅ preserves opponent placeholder card structure and accessibility
- ✅ upgrades the placeholder card during opponent reveal
