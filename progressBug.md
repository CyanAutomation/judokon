# Bug Analysis: State Machine `onEnter` Handler Fails After Interrupt

## 1. Executive Summary

A critical bug was found where the `cooldownEnter` handler is not executed when the state machine transitions to the `cooldown` state after an `interruptRound` event. This halts game progression by preventing the cooldown timer from starting and the `ready` event from being dispatched.

The root cause is a **module caching issue** in the test environment, where `vi.mock` creates inconsistent module instances. The fix involves ensuring module caches are reset correctly before each test run.

**Status**: Confirmed and isolated in `tests/helpers/classicBattle/debug-interrupt-cooldown.test.js`.

---

## 2. Problem Description

### Observed Behavior

When a round is interrupted, the state machine correctly transitions to the "cooldown" state, but its `onEnter` handler (`cooldownEnter`) is never called.

```mermaid
graph TD
    A[interruptRound dispatch] --> B{interruptRoundEnter handler};
    B --> C{Dispatches restartRound};
    C --> D[State transitions to "cooldown"];
    D --> E{❌ cooldownEnter NOT CALLED};
    E --> F[Game stuck: no timer, no 'ready' event];
```

### Test Evidence

The test `tests/helpers/classicBattle/debug-interrupt-cooldown.test.js` confirms the bug:

1. It initializes the orchestrator and transitions to `cardsRevealed`.
2. It dispatches `interruptRound`.
3. It confirms the state correctly becomes `"cooldown"`. ✅
4. It advances timers using `vi.runAllTimersAsync()`.
5. It asserts that a `ready` event was dispatched. ❌ **FAILS**: 0 events dispatched.

---

## 3. Root Cause Analysis

The investigation confirmed that the `onEnterMap` used by the state manager (`stateManager.js`) does not contain a valid reference to the `cooldownEnter` function during the problematic transition.

- **State Transition Succeeds**: The machine's state correctly updates to `"cooldown"`.
- **Handler Execution Fails**: The `runOnEnter` function in `stateManager.js` finds no handler for `"cooldown"` in its `onEnterMap`.

The most likely cause is a **module instance mismatch** within the Vitest environment. The test file, the orchestrator, and the state manager are likely holding references to different instances of the `cooldownEnter` module due to improper mock setup and module cache state.

- **Orchestrator (`orchestrator.js`)**: Imports handlers from `orchestratorHandlers.js`.
- **Test File**: Imports handlers directly from `stateHandlers/cooldownEnter.js` and uses `vi.mock`.

This divergence, combined with Vitest's module caching, leads to a scenario where the `onEnterMap` passed to the state manager is built with a different set of module instances than the ones being spied on or referenced elsewhere in the test.

---

## 4. Proposed Fix Plan

The fix involves correcting the test setup to ensure module consistency.

### Step 1: Isolate Mocks with `vi.resetModules()`

Modify the `beforeEach` block in the test file to ensure a clean module state for every run. This prevents module instances from leaking between tests.

```javascript
// In tests/helpers/classicBattle/debug-interrupt-cooldown.test.js

beforeEach(async () => {
  // 1. Reset module cache to ensure fresh imports
  vi.resetModules();

  // 2. Mock dependencies *after* resetting modules
  vi.mock('path/to/dependency', () => ({
    // ... mock implementation
  }));

  // 3. Import modules *after* mocks are in place
  const { initClassicBattleOrchestrator } = await import('@/helpers/classicBattle/orchestrator.js');

  // 4. Initialize the orchestrator
  // ...
});
```

### Step 2: Add Diagnostic Logging (Optional but Recommended)

To safeguard against future issues, add logging to the `createStateManager` function to validate the `onEnterMap` during initialization.

```javascript
// In src/helpers/classicBattle/stateManager.js

export async function createStateManager(onEnterMap = {}, ...) {
  const definedStates = new Set(stateTable.map(s => s.name));
  const missingHandlers = Array.from(definedStates).filter(
    state => !(state in onEnterMap)
  );

  if (missingHandlers.length > 0) {
    console.warn("States missing onEnter handlers:", missingHandlers);
  }
  // ...
}
```

### Step 3: Create a Verification Test

Add a new test case that explicitly checks the integrity of the `onEnterMap` after initialization.

```javascript
test('should have a valid onEnter handler for every state', () => {
  // Assumes 'machine' is the initialized state machine instance
  const onEnterMap = machine.getOnEnterMapDebug(); // Requires exposing the map for tests
  const stateNames = machine.getStateNames(); // Requires a helper to get all state names

  for (const stateName of stateNames) {
    const entry = onEnterMap.find(e => e.state === stateName);
    expect(entry?.hasHandler).toBe(true);
  }
});
```

---

## 5. Impact Assessment

- **Severity**: **Critical**
- **User Impact**: The game becomes unplayable if a round is interrupted, as it gets stuck indefinitely.
- **Affected Flows**: Primarily the `interruptRound` flow. Other state transitions could be vulnerable if they rely on similarly mocked modules in tests.

---

## 6. Verification Checklist

After applying the fix, ensure the following:

- [ ] The `debug-interrupt-cooldown.test.js` test passes consistently.
- [ ] The new verification test for `onEnterMap` integrity passes.
- [ ] Manually test the interrupt flow in the browser to confirm the fix.
- [ ] Run the full Playwright and Vitest suites to check for regressions.
- [ ] Confirm the `console.warn` for missing handlers (from Step 2) does not appear in the test output.
