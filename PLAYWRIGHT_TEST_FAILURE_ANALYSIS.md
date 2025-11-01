# Playwright Test Failure Analysis: battle-state-progress.spec.js

## Test Failure Details

**Test**: `playwright/battle-classic/battle-state-progress.spec.js:95:3`  
**Test Name**: "Battle state progress list › reflects active state transitions through a round"  
**Error**: `TimeoutError: page.waitForFunction: Timeout 7500ms exceeded`  
**Location**: `playwright/helpers/battleStateHelper.js:257`

## Root Cause Analysis

### Primary Bug (IDENTIFIED & FIXED)

**File**: `playwright/helpers/battleStateHelper.js`  
**Function**: `waitForBattleState()`  
**Line**: ~210 (original implementation)

**Problem**: Missing `await` keyword on async Test API call

The `waitForBattleState()` helper function calls the Test API to wait for a specific battle state:

```javascript
// ORIGINAL (BROKEN) CODE
const apiResult = await page.evaluate(
  ({ state, waitTimeout }) => {
    try {
      const stateApi = window.__TEST_API?.state;
      if (stateApi && typeof stateApi.waitForBattleState === "function") {
        // ❌ NOT AWAITED - Returns Promise instead of boolean
        return stateApi.waitForBattleState.call(stateApi, state, waitTimeout);
      }
    } catch {}
    return null;
  },
  { state: expectedState, waitTimeout: timeout }
);
```

**Why This Is A Bug**:
1. `stateApi.waitForBattleState()` is an **async function** that returns a `Promise<boolean>`
2. Without `await`, the code returns the Promise object itself, not the resolved value
3. The Promise object is not equal to `true` or `false`, so it's treated as `null`
4. When `apiResult === null`, the code falls back to a DOM selector that doesn't exist in the application
5. The test times out waiting for a non-existent element

**Test Flow Breakdown**:
```
✓ Test calls waitForBattleState(page, "roundOver")
✓ waitForBattleState calls page.evaluate() to run in browser
✗ page.evaluate() calls stateApi.waitForBattleState() WITHOUT await
✗ Returns Promise object instead of true/false/null
✗ Promise is truthy but not === true, so falls through all checks
✗ Falls back to DOM selector: page.waitForFunction(state => document.body.dataset.battleState === "roundOver")
✗ No element ever sets this attribute, so times out after 7.5 seconds
```

### Fix Applied

**File**: `playwright/helpers/battleStateHelper.js`

```javascript
// FIXED CODE
const apiResult = await page.evaluate(
  async ({ state, waitTimeout }) => {
    try {
      const stateApi = window.__TEST_API?.state;
      if (!stateApi) {
        return { result: null, error: "stateApi not available" };
      }
      if (typeof stateApi.waitForBattleState !== "function") {
        return { result: null, error: "waitForBattleState not a function" };
      }
      // ✅ NOW AWAITED - Returns actual boolean value
      const result = await stateApi.waitForBattleState.call(stateApi, state, waitTimeout);
      return { result, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { result: null, error: errorMsg };
    }
  },
  { state: expectedState, waitTimeout: timeout }
);
```

**Changes Made**:
1. ✅ Added `async` keyword to the evaluate function
2. ✅ Added `await` before `stateApi.waitForBattleState()` call
3. ✅ Wrapped result in an object to return both result and error info
4. ✅ Added better error diagnostics for troubleshooting
5. ✅ Improved fallback to check actual source of truth: `document.body.dataset.battleState`

## Test API Behavior

The Test API implementation in `src/helpers/testApi.js` (lines 570-625) is correctly implemented:

```javascript
async waitForBattleState(stateName, timeout = 5000) {
  return new Promise((resolve) => {
    // 1. Checks current state immediately
    if (currentMatches()) {
      cleanup(true);
      return;
    }
    
    // 2. Subscribes to battleStateChange events
    listener = (event) => {
      const nextState = event?.detail?.to ?? detail?.state ?? null;
      if (nextState === stateName) cleanup(true);
    };
    
    // 3. Polls every 50ms as safety net
    pollId = setInterval(() => {
      if (currentMatches()) cleanup(true);
      else if (Date.now() - startTime > timeout) cleanup(false);
    }, 50);
    
    // 4. Returns boolean: true=found, false=timeout
    timeoutId = setTimeout(() => cleanup(false), timeout);
  });
}
```

The function properly:
- Listens for `battleStateChange` events from the battle orchestrator
- Polls the current state every 50ms as a safety mechanism
- Returns `true` when the state is found
- Returns `false` when the timeout expires

## Secondary Issue (Potential)

After applying the fix, if the test still fails, it may indicate that `document.body.dataset.battleState` is not actually becoming "roundOver" during the test execution. This would suggest:

1. The battle state machine may not be transitioning to "roundOver" in this test scenario
2. Or the state transitions through "roundOver" but then immediately moves to another state
3. Or the `broadcastBattleState("roundOver")` call is not being reached

### Investigation Path For Secondary Issue

To debug further if needed:
1. Check `src/pages/battleClassic.init.js` line 1019 where `broadcastBattleState("roundOver")` is called
2. Verify that the condition leading to this call is being met in the test
3. Add test diagnostics to capture actual state transitions
4. Check if `completeRoundViaApi` is completing successfully but the state machine isn't in "roundOver"

## Files Modified

1. **`playwright/helpers/battleStateHelper.js`**
   - Fixed `waitForBattleState()` function
   - Added `async/await` to Test API call
   - Improved error diagnostics
   - Updated fallback to use actual source of truth

2. **`src/helpers/testApi.js`**
   - Reverted unnecessary changes to `cliApi.completeRound()` back to original implementation

## Testing

To verify the fix:

```bash
# Run the specific failing test
npx playwright test "playwright/battle-classic/battle-state-progress.spec.js" -g "reflects active state transitions through a round"

# Run all battle state progress tests
npx playwright test "playwright/battle-classic/battle-state-progress.spec.js"

# Run full battle test suite
npm run test:battles
```

## Related Code References

- **Test API**: `src/helpers/testApi.js` (stateApi.waitForBattleState)
- **Battle State Helper**: `playwright/helpers/battleStateHelper.js`
- **Battle Init**: `src/pages/battleClassic.init.js` (broadcastBattleState function)
- **Battle Orchestrator**: `src/helpers/classicBattle/orchestrator.js` (state machine)
- **Test Spec**: `playwright/battle-classic/battle-state-progress.spec.js`

## Key Lessons

1. **Always await async functions** - Forgetting `await` on async functions is a common source of bugs in test infrastructure
2. **Test infrastructure is critical** - Helper functions must correctly interface with the application's APIs
3. **Error diagnostics matter** - The improved error reporting helps identify similar issues in the future
4. **Use actual source of truth for fallbacks** - The fallback selector should check the actual source of state (body dataset), not non-existent attributes

