# Task 2 Findings: Debug Logging Verification

## Summary

Successfully made validation rejection reasons visible by adding console.log statements to `validateSelectionState()`. The logs now clearly show what's happening in the selection flow.

## Critical Discovery

**The battle state is `null` when `selectStat()` is called in tests!**

### Evidence

From captured logs when running the debug test:

```
3: [validateSelectionState] ALLOWED - state is valid: null
```

The state should be `"waitingForPlayerAction"` but it's returning `null`.

### Root Cause

The state getter is not being initialized:

- `eventBus.js` line 8: `let stateGetter = () => null;` (defaults to null)
- Function `setBattleStateGetter()` exists but is NEVER CALLED anywhere in the codebase
- When `getBattleState()` is called, it invokes `stateGetter()` which has never been configured

### Complete Selection Flow (from logs)

```
0: [selectStat] Called with stat: power
1: [selectStat] Calling handleStatSelection with: [object Object]
2: [handleStatSelection] Called with: [object Object]
3: [DEBUG] handleStatSelection called [object Object]
4: [validateSelectionState] ALLOWED - state is valid: null  ← STATE IS NULL!
5: [test] handleStatSelection: validateSelectionState PASSED, calling applySelectionToStore
6: [applySelectionToStore] BEFORE: [object Object]
7: [applySelectionToStore] AFTER: [object Object]  ← MUTATIONS DID HAPPEN!
8: [handleStatSelection] After validateAndApplySelection: [object Object]
9: [dispatchStatSelected] START: [object Object]
10: [dispatchStatSelected] After emitSelectionEvent: [object Object]
11: [dispatchStatSelected] dispatchBattleEvent returned: false  ← EVENT NOT HANDLED
12: [handleStatSelection] After dispatchStatSelected: [object Object]
13: [handleStatSelection] After syncResultDisplay: [object Object]
```

### Key Observations

1. **Mutations ARE happening** (logs 6-7 show BEFORE/AFTER)
2. **dispatchBattleEvent returns false** (log 11) - the orchestrator is NOT handling the event
3. **State is null** (log 4) - getBattleState() returns null because stateGetter is not configured
4. **validateSelectionState allows null** (log 4) - it only rejects when state is explicitly invalid, not when null

### Why This Matters

The validation logic in `validateSelectionState()` accepts `null` as a valid state:

```javascript
if (current && current !== "waitingForPlayerAction" && current !== "roundDecision") {
  // REJECT
}
// NULL passes through here!
```

This means:

- When state is null, validation passes
- Selection is allowed to proceed
- Mutations happen successfully
- BUT event dispatch returns false (no orchestrator handling)
- This breaks the test expectations

## Next Steps for Task 3

1. **Determine the correct state getter setup** - Where should `setBattleStateGetter()` be called during test initialization?
2. **Check if orchestrator is properly initialized** in tests - The `dispatchBattleEvent` returning false suggests orchestrator is not set up
3. **Verify state machine initialization** - The state machine should be passing its state getter to eventBus during init
4. **Check orchestrator initialization** - Need to see where the orchestrator/state machine should register their state getter

## UPDATE - setBattleStateGetter is Being Called

After adding import and call to `setBattleStateGetter(() => machine.getState())` in orchestrator initialization:

**NEW FINDING**: The stateGetter IS a function now (was correctly registered), but `machine.getState()` is returning **null**!

From logs:

```text
4: [eventBus] getBattleState() called, stateGetter returned: null stateGetter fn is: function
14: [eventBus] getBattleState() called, stateGetter returned: null stateGetter fn is: function
```

This means:

1. ✅ `setBattleStateGetter()` WAS called successfully
2. ✅ `stateGetter` is now a function (not the default `() => null`)
3. ❌ But `machine.getState()` is returning null!

## Next Investigation

The state manager's `getState()` method is not returning the current state. Need to check:

- How `createStateManager` creates the machine
- Does the machine have a `getState()` method?
- Is `getState()` being called correctly?
- What is `getStateSnapshot()` in battleDebug.js - should we use that instead?

## Files to Check

- `src/helpers/classicBattle/stateManager.js` - Check if machine has getState() method
- `src/helpers/classicBattle/battleDebug.js` - Check getStateSnapshot() implementation
- `src/helpers/classicBattle/orchestrator.js` - Verify machine.getState() call is correct
