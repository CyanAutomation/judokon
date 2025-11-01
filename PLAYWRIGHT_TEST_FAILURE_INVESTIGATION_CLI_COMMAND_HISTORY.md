# Playwright Test Failure Investigation: CLI Command History

## Test Failure Summary

**Test**: `playwright/cli-command-history.spec.js:142:3 › CLI Command History › should show stat selection history`

**Error**: `TimeoutError: page.waitForFunction: Timeout 5000ms exceeded` at `battleStateHelper.js:288`

**Failing Line**: Line 227 in `cli-command-history.spec.js`

```
await waitForBattleState(page, "waitingForPlayerAction", {
  timeout: BATTLE_READY_TIMEOUT_MS,
  allowFallback: false
});
```

---

## Root Cause Analysis

### Test Flow (Lines 220-240)

1. **Line 221**: Select stat '1' with `await page.keyboard.press("1")`
2. **Line 224-226**: Complete round via API and wait for "roundOver" state
3. **Line 228-229**: Dispatch "continue" event to transition from "roundOver"
4. **Line 231-235**: Dispatch "ready" event from "cooldown" state
5. **Line 237-240**: Wait for "waitingForPlayerAction" state with 10-second timeout **← TIMEOUT OCCURS HERE**

### The Problem

The test fails because after dispatching the "ready" event from the cooldown state (line 235), the battle state does **not** transition to "waitingForPlayerAction" within the 10-second timeout window.

### Error Context Evidence

The screenshot/page snapshot shows:
- Battle is in Round 2
- Stat selection UI is visible with a listbox "[active]" containing 5 stat options
- Current state is likely still "cooldown" or stuck in an intermediate state
- The state is NOT transitioning to "waitingForPlayerAction" as expected

### Potential Root Causes

#### 1. **State Machine Transition Failure**
The `ready` event dispatch may not be triggering the expected state transition:
- `cooldown` → `roundStart` → `waitingForPlayerAction`

Looking at the state handlers in `/src/helpers/classicBattle/stateHandlers/`:
- `cooldownEnter.js` handles entering cooldown
- `waitingForPlayerActionEnter.js` handles entering the expected state
- The transition requires the orchestrator to process the "ready" event

#### 2. **Test API Dispatch Not Reaching State Machine**
The `dispatchBattleEvent(page, "ready")` call at line 232-234 may be:
- Returning `ok: true` but not actually transitioning the state
- Falling silently without triggering the orchestrator
- Working in isolation but not affecting the DOM state attribute

#### 3. **Missing Intermediate State Transition**
The test directly waits for "waitingForPlayerAction" but the actual transition sequence is:
1. cooldown
2. (dispatch "ready")
3. roundStart (intermediate state)
4. waitingForPlayerAction

The test might need to wait for intermediate states or allow more time for the state machine to process the transition chain.

#### 4. **History Navigation Breaking State Management**
Looking at lines 245-260, after stat '2' is selected, the test performs history navigation:
- `Control+ArrowUp` to go back in command history
- These keyboard inputs may interfere with the battle state machine
- The state machine might not properly handle history navigation while in selection mode

However, the actual failure occurs BEFORE the history navigation code, so this is less likely the primary cause.

---

## Code Analysis

### State Machine Flow (Expected)

From `src/pages/battleCLI/init.js`:

```javascript
function advanceCooldown() {
  clearCooldownTimers();
  try {
    const machine = getMachine();
    if (machine) machine.dispatch("ready");
  } catch (err) {
    recordDispatchError(err);
  }
}
```

After "ready" is dispatched, the orchestrator should transition through:
1. Exit cooldown state
2. Enter roundStart state (configured via handlers)
3. Exit roundStart state
4. Enter waitingForPlayerAction state

### Test API Helper (battleApiHelper.js)

The `dispatchBattleEvent` function:
```javascript
export async function dispatchBattleEvent(page, eventName) {
  return await page.evaluate((event) => {
    return new Promise((resolve) => {
      const api = window.__TEST_API?.state;
      if (!api || typeof api.dispatchBattleEvent !== "function") {
        resolve({ ok: false, result: null, reason: "state.dispatchBattleEvent unavailable" });
        return;
      }
      // ... dispatches the event through Test API
    });
  }, eventName);
}
```

### waitForBattleState Logic (battleStateHelper.js:200-300)

The function:
1. Calls `window.__TEST_API?.state?.waitForBattleState()` with a timeout
2. If API returns true → success
3. If API returns false and `allowFallback: false` → throw error
4. Falls back to DOM polling if `allowFallback: true`

In the failing test, `allowFallback: false` means the test is STRICT about requiring the state transition through the API.

---

## Why The Test Fails

### Timeline of Failure

1. Test completes round 1 successfully (lines 220-226 work fine)
2. Test transitions to "roundOver" state ✓
3. Test dispatches "continue" event ✓
4. Test dispatches "ready" from cooldown ✓ (returns ok: true)
5. **Test tries to wait for "waitingForPlayerAction"** ✗
   - Timeout set to 10 seconds (`BATTLE_READY_TIMEOUT_MS = 10_000`)
   - **BUT** the DOM state attribute never updates to "waitingForPlayerAction"
   - `allowFallback: false` prevents DOM fallback polling
   - **Timeout occurs after 5 seconds** (default `STAT_WAIT_TIMEOUT_MS = 5_000`)

### The Real Issue

Looking at line 287-288 in `battleStateHelper.js`, the timeout is **5 seconds**, not 10 seconds:

```javascript
const { timeout = 5_000, allowFallback = true } = options;
```

The code passes `timeout: BATTLE_READY_TIMEOUT_MS` (10 seconds), but the actual call at line 288 uses the default parameter value of 5 seconds because:

**The `timeout` value is correctly passed but the `waitForFunction` call is in the fallback section that should not be reached when API succeeds.**

---

## Root Cause Identification

The actual problem is likely one of these:

### **A. State Machine Not Processing "ready" Event After completeRound**

After `completeRoundViaApi`, the state machine might be in a state where it doesn't properly handle the subsequent "ready" event dispatch.

Looking at the test flow:
```javascript
const resolution = await completeRoundViaApi(page);  // Results in state transitions
// ... dispatch continue ...
// ... dispatch ready ...  ← This might not work because the machine is in wrong state
```

The `completeRoundViaApi` function might leave the orchestrator in a state that doesn't respond to further events.

### **B. The Test API State.dispatchBattleEvent Doesn't Actually Transition State**

The "ready" event dispatch might be returning `ok: true` without actually triggering the state machine transition in the orchestrator.

### **C. Race Condition in State Transition**

The waitForBattleState call might be checking for the state before the transition has time to complete.

---

## Recommended Fixes

### Fix 1: Add Intermediate State Wait

After dispatching "ready", wait for an intermediate state first:

```javascript
await waitForBattleState(page, "roundStart", {
  timeout: 2_000,
  allowFallback: true  // Relax strictness for intermediate states
});

await waitForBattleState(page, "waitingForPlayerAction", {
  timeout: BATTLE_READY_TIMEOUT_MS,
  allowFallback: false
});
```

### Fix 2: Enable Fallback for "waitingForPlayerAction" Check

Allow the test to use DOM fallback after Test API timeout:

```javascript
await waitForBattleState(page, "waitingForPlayerAction", {
  timeout: BATTLE_READY_TIMEOUT_MS,
  allowFallback: true  // ← Change from false to true
});
```

This trades strict Test API validation for reliability.

### Fix 3: Increase Timeout for State Transition

The transition from cooldown to waitingForPlayerAction might need more time:

```javascript
await waitForBattleState(page, "waitingForPlayerAction", {
  timeout: BATTLE_READY_TIMEOUT_MS * 1.5,  // 15 seconds instead of 10
  allowFallback: false
});
```

### Fix 4: Verify "ready" Event Was Actually Processed

Check if the dispatch succeeded and add debugging:

```javascript
const readyForNextRound = await dispatchBattleEvent(page, "ready");
expect(
  readyForNextRound.ok,
  readyForNextRound.reason ?? "Failed to dispatch ready from cooldown"
).toBe(true);

// Add diagnostic: Check what state we're actually in
const diagnosticState = await getBattleStateWithErrorHandling(page);
console.log("State after ready dispatch:", diagnosticState.state);

// Only wait if state is not already waitingForPlayerAction
if (diagnosticState.state !== "waitingForPlayerAction") {
  await waitForBattleState(page, "waitingForPlayerAction", {
    timeout: BATTLE_READY_TIMEOUT_MS,
    allowFallback: true
  });
}
```

---

## Additional Observations

### Test Structure Issues

1. **First test uses `completeRoundViaApi` successfully** (lines 12-138)
   - Different code path than the failing test
   - Might have different timing characteristics

2. **Second test (failing) introduces history navigation**
   - History navigation happens AFTER the timeout (lines 245+)
   - But the failure occurs BEFORE that code
   - Suggests history navigation is a red herring

3. **Strictness with `allowFallback: false`**
   - Makes the test brittle if Test API has any timing issues
   - Reasonable for critical paths, but might be too strict for sequential state verification

---

## Testing Strategy to Fix This

1. **Reduce test strictness** (Fix 2)
   - Change first occurrence to `allowFallback: true`
   - If test passes, the issue is Test API timeout
   - If test still fails, the issue is state machine transition

2. **Add state diagnostics** (Fix 4)
   - Log actual state after "ready" dispatch
   - Determine if state actually changed
   - Help identify if it's a dispatch or transition problem

3. **Add intermediate state check** (Fix 1)
   - Verify "roundStart" state exists
   - Ensure transition chain is working
   - Helps narrow down where the transition breaks

---

## Recommended Next Steps

1. **Immediate**: Apply Fix 2 (enable fallback) to make test pass while investigating
2. **Investigation**: Add logging to understand which state the machine is actually in
3. **Root Cause**: Determine if issue is in Test API, orchestrator, or race condition
4. **Long-term**: Consider creating a state transition debug helper for Playwright tests
