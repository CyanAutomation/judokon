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

## Actions taken so far

- Implemented the recommended fix in `src/helpers/classicBattle/roundManager.js`.
  - Swapped the dispatch order in `handleNextRoundExpiration` so the public API (`options.dispatchBattleEvent`) is tried before the direct `machine.dispatch` fallback. Concretely the block:

  ```js
  // Before
  dispatched = await dispatchReadyDirectly();
  if (!dispatched) {
    dispatched = await dispatchViaOptions();
  }

  // After (applied)
  dispatched = await dispatchViaOptions();
  if (!dispatched) {
    dispatched = await dispatchReadyDirectly();
  }
  ```

- Ran the specific failing test to verify the change:

```bash
npm test -- tests/helpers/classicBattle/timeoutInterrupt.cooldown.test.js
```

### Test run summary

- Test file executed: `tests/helpers/classicBattle/timeoutInterrupt.cooldown.test.js`
- Result: still failing (1 test failed). The failing assertion is the same one observed originally:

```
AssertionError: expected +0 to be 1 // Object.is equality
- Expected
+ Received

- 1
+ 0

❯ tests/helpers/classicBattle/timeoutInterrupt.cooldown.test.js:124:44
  expect(readyDispatchesDuringAdvance).toBe(1);
```

The test output indicates that `dispatchBattleEvent`'s mock did not record a "ready" call during the timer advance (readyDispatchesDuringAdvance is 0), despite the code change.

## Observations / Diagnostics

- The code change was applied in the live file at `src/helpers/classicBattle/roundManager.js` around the `handleNextRoundExpiration` dispatch logic.
- The test harness uses a test timer mock (`tests/helpers/roundTimerMock.js`) and other mocks; the cooldown expiry path calls `handleNextRoundExpiration` via the timer's `expired` handler. The handler calls `dispatchViaOptions` (which uses `dispatchBattleEvent`) as configured in `expirationOptions`.
- Despite trying the public API first, `dispatchBattleEvent.mock.calls` still shows 0 new ready calls during the advance. Possible reasons include:
  - The mock registration used by the test is not the same function instance the code is calling (module resolution / ESM vs CJS mocking nuance).
  - The dispatch path resolves to `dispatchBattleEvent` but the mock wrapper in the test may be installed in a different module instance or path alias.
  - The `dispatchBattleEvent` call might be skipped earlier due to dedupe logic or machine state checks returning false before the mock runs.

## Next steps (recommended)

1. Capture debug traces before/after `dispatchViaOptions` invocation in `handleNextRoundExpiration` to confirm the function is being called and what `options.dispatchBattleEvent` refers to at runtime. For example, temporarily add lightweight debug logs or expose debug state via `exposeDebugState`.
2. Inspect the mock registration in the test file and confirm the exact module specifier used; ensure it matches the module path that `roundManager.js` imports/receives via `expirationOptions.dispatchBattleEvent`.
3. As a targeted test: instrument `expirationOptions.dispatchBattleEvent` at the point `handleNextRoundExpiration` is invoked to log whether it's the mocked function and whether it returns/throws.
4. Run only the affected test again after adding instrumentation. If it shows the function is not the mocked version, adjust the mock registration (or use `vi.doMock` with the exact module id used by the code path).

If you want, I can implement steps 1–3 (add debug logs and re-run the single test) and iterate until the test passes. I recommend starting by printing the function identity and a small marker from inside `handleNextRoundExpiration` right before calling `dispatchViaOptions`.
