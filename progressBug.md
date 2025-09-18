# Unit Test Failure Analysis: timeoutInterrupt.cooldown.test.js

## Problem Summary

The test `advances from cooldown after interrupt with 1s auto-advance` is failing with:

```text
AssertionError: expected +0 to be 1 // Object.is equality
- Expected: 1
+ Received: 0
```

The assertion `expect(readyDispatchesDuringAdvance).toBe(1)` fails because no "ready" events are being tracked by the mock on `dispatchBattleEvent`.

## Root Cause Analysis

### Test Setup

- Test initializes orchestrated classic battle mode
- Dispatches sequence: `matchStart` → `ready` → `ready` → `cardsRevealed` → `interruptRound` → `restartRound`
- Reaches `cooldown` state with 1-second auto-advance timer
- Mocks `dispatchBattleEvent` to track calls with "ready" event
- Advances timers by 1000ms expecting automatic "ready" dispatch

### Code Flow Issue

The failure occurs in `handleNextRoundExpiration` function in `roundManager.js`. When the cooldown timer expires, the function attempts to dispatch a "ready" event using two methods:

1. **`dispatchReadyDirectly`**: Calls `machine.dispatch("ready")` directly
2. **`dispatchViaOptions`**: Calls `options.dispatchBattleEvent("ready")` (the mocked function)

**Problem**: In orchestrated mode, the machine is available, so `dispatchReadyDirectly` succeeds and `dispatchViaOptions` is never attempted. This bypasses the mock entirely.

### Why This Happens

```javascript
// Current implementation tries direct dispatch first
let dispatched = false;
try {
  dispatched = await dispatchReadyDirectly();  // ✅ Succeeds, bypasses mock
} catch {}
if (!dispatched) {
  try {
    dispatched = await dispatchViaOptions();   // ❌ Never reached
  } catch {}
}
```

The test expects `dispatchBattleEvent` to be used because:

- It's the public API for battle event dispatching
- Provides deduplication, logging, and proper error handling
- The mock is specifically designed to intercept this function

## Recommended Fix

**Swap the dispatch priority** in `handleNextRoundExpiration`:

```javascript
// Fixed implementation - public API first
let dispatched = false;
try {
  dispatched = await dispatchViaOptions();    // ✅ Public API first
} catch {}
if (!dispatched) {
  try {
    dispatched = await dispatchReadyDirectly(); // ✅ Direct dispatch fallback
  } catch {}
}
```

### Why This Fix Works

1. **Triggers the mock**: `dispatchViaOptions` calls the mocked `dispatchBattleEvent`
2. **Maintains performance**: Direct dispatch still available as fallback
3. **Ensures API consistency**: Public API used when available
4. **No breaking changes**: Same end result, just different dispatch path

### Implementation Location

- **File**: `/workspaces/judokon/src/helpers/classicBattle/roundManager.js`
- **Function**: `handleNextRoundExpiration`
- **Lines**: ~1040-1050

## Verification Steps

1. Apply the dispatch order swap
2. Run the failing test - should now pass
3. Run related cooldown tests for regressions
4. Verify cooldown auto-advance works in application
5. Confirm no performance impact from using public API

## Alternative Approaches Considered

- **Unify methods**: Make both use `dispatchBattleEvent` (redundant)
- **Change test**: Expect direct dispatch (breaks API testing principle)
- **Remove direct dispatch**: Always use public API (removes performance optimization)

The recommended fix is minimal, targeted, and maintains all existing functionality while fixing the test.
