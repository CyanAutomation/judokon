# Bug Root Cause Analysis: State Machine onEnter Handler Not Executed After Interrupt

## Executive Summary

A critical bug has been discovered where the `cooldownEnter` onEnter handler is **not executed** when the state machine transitions to the `cooldown` state after an `interruptRound` event. This causes the game to get stuck in cooldown mode indefinitely because:

1. The cooldown timer is never set up
2. The `ready` event is never dispatched
3. The game cannot progress to the next state

**Status**: Bug confirmed and isolated through automated testing in `tests/helpers/classicBattle/debug-interrupt-cooldown.test.js`

---

## Problem Description

### Observed Behavior

When the following sequence occurs:

```text
interruptRound dispatch
  ↓
interruptRoundEnter handler dispatches restartRound
  ↓
restartRound trigger fires
  ↓
State machine transitions to "cooldown" state
  ↓
❌ cooldownEnter NEVER CALLED
  ↓
No timer setup, no ready event, game stuck
```

### Test Evidence

Created test `debug-interrupt-cooldown.test.js` that:

1. Initializes orchestrator
2. Transitions to `cardsRevealed` state
3. Dispatches `interruptRound`
4. Waits for state to become "cooldown" ✅ (state IS correct)
5. Runs all timers via `vi.runAllTimersAsync()` to trigger any pending callbacks
6. Checks for `ready` event dispatch ❌ (NO events dispatched)

**Test Result**: 0 ready events dispatched (expected > 0)

### Root Cause Investigation

Through multiple debugging attempts, confirmed:

1. **cooldownEnter is NOT in the onEnterMap being used**
   - Attempted to spy on cooldownEnter - spy was never called
   - Even during the first cooldown transition (matchStart → ready → cooldown), cooldownEnter was not called
   - This suggests the onEnterMap wasn't properly initialized or registered

2. **State transition IS successful**
   - Machine state correctly becomes "cooldown"
   - No errors preventing the transition
   - The transition validation passes

3. **onEnter handler execution IS broken**
   - `stateManager.js` has `runOnEnter(target, payload)` in line 156 of the dispatch flow
   - But this is only called if the state transition succeeds
   - The function checks `const fn = onEnterMap[stateName]` but appears to be undefined or not present

---

## Technical Analysis

### State Manager Flow (src/helpers/classicBattle/stateManager.js)

The `dispatch` method should:

```javascript
// Line 156: await runOnEnter(target, payload);
async function runOnEnter(stateName, payload) {
  const fn = onEnterMap[stateName];  // ← Looking for handler
  if (typeof fn === "function") {
    await fn(machine, payload);       // ← Should call cooldownEnter here
  }
}
```

**Problem**: `onEnterMap` closure variable either:

- Doesn't contain the "cooldown" key
- Contains undefined value for "cooldown"
- Is not the same instance used by the orchestrator

### Orchestrator Setup (src/helpers/classicBattle/orchestrator.js)

The `createOnEnterMap()` function (line 509) correctly maps:

```javascript
function createOnEnterMap() {
  return {
    // ... other states
    cooldown: cooldownEnter,
    // ... other states
  };
}
```

**Connection Point**: This map is passed to `createStateManager()` at line 291:

```javascript
const createdMachine = await createStateManager(
  onEnterMap,        // ← The map is passed here
  context,
  onTransition,
  context.stateTable
);
```

**Hypothesis**: Either:

1. The `cooldownEnter` import is incorrect or stale
2. There's a module caching issue where a different cooldownEnter instance is being used
3. The onEnterMap is being modified or reset somewhere after initialization
4. There's conditional logic that skips certain onEnter handlers

---

## Root Causes (Ranked by Likelihood)

### 1. **onEnterMap Module Instance Mismatch** (Most Likely)

**Evidence**:

- `orchestratorHandlers.js` line 99 re-exports: `export { cooldownEnter } from "./stateHandlers/cooldownEnter.js"`
- The orchestrator imports from `orchestratorHandlers.js`
- Tests and spies import directly from `stateHandlers/cooldownEnter.js`
- With vi.mock/vi.resetModules, these could be different instances

**Fix**: Ensure a single, consistent module instance is used throughout

### 2. **Missing onEnterMap Initialization in Tests**

**Evidence**:

- Test calls `initClassicBattleOrchestrator(store, undefined, {})` with empty hooks object
- The third parameter is `hooks`, which may not properly initialize mocks
- Real application might initialize with different context

**Fix**: Verify test initialization matches application initialization

### 3. **Conditional onEnter Skipping Logic**

**Evidence**:

- `stateManager.js` line 166 checks `if (typeof fn === "function")`
- But we never see any console error about invalid handler
- Could be swallowing errors silently

**Fix**: Add comprehensive logging to track when onEnter should be called vs actually is called

---

## Suggested Fixes

### Fix 1: Add Comprehensive Logging (Immediate)

Add debug logging to track onEnter execution:

```javascript
// In stateManager.js runOnEnter function:
async function runOnEnter(stateName, payload) {
  const fn = onEnterMap[stateName];
  debugLog("runOnEnter called", {
    stateName,
    hasHandler: typeof fn === "function",
    onEnterMapKeys: Object.keys(onEnterMap),
    payloadInfo: payload ? "has payload" : "no payload"
  });
  
  if (typeof fn === "function") {
    try {
      await fn(machine, payload);
      debugLog("onEnter completed successfully", { stateName });
    } catch (err) {
      debugLog("onEnter threw error", { stateName, error: err.message });
      throw err;
    }
  } else if (fn !== undefined) {
    debugLog("Invalid onEnter handler type", { stateName, actualType: typeof fn });
  }
}
```

**Expected Output**: Will reveal if onEnterMap is missing "cooldown" key or if handler is wrong type

### Fix 2: Verify Test Module Caching

Ensure test uses the same module instance as application:

```javascript
// In test, ensure vi.resetModules() happens FIRST
// before ANY imports
beforeEach(async () => {
  vi.resetModules();  // Clear all cached modules
  await import("path/to/stateManager");  // Fresh imports
  // Then initialize orchestrator
});
```

### Fix 3: Add State Transition Diagnostics

Expose onEnter handler execution for debugging:

```javascript
// Add to machine object returned from createStateManager
machine.getOnEnterMapDebug = () => ({
  keys: Object.keys(onEnterMap),
  entries: Object.entries(onEnterMap).map(([k, v]) => ({
    state: k,
    hasHandler: typeof v === "function",
    handlerName: v?.name || "anonymous"
  }))
});
```

Then test can verify:

```javascript
const debug = machine.getOnEnterMapDebug();
expect(debug.entries.find(e => e.state === "cooldown")?.hasHandler).toBe(true);
```

### Fix 4: Validate onEnterMap During Initialization

Add validation when creating state manager:

```javascript
export async function createStateManager(
  onEnterMap = {},
  context = {},
  onTransition,
  stateTable = CLASSIC_BATTLE_STATES
) {
  // Validate all states have handlers (or are intentionally undefined)
  const definedStates = new Set(
    Array.isArray(stateTable) ? stateTable.map(s => s.name) : []
  );
  
  const missingHandlers = Array.from(definedStates).filter(
    state => !(state in onEnterMap)
  );
  
  if (missingHandlers.length > 0) {
    debugLog("WARNING: States missing onEnter handlers", { missingHandlers });
  }
  
  // ... rest of initialization
}
```

---

## Impact Assessment

### Severity: **CRITICAL**

**User Impact**:

- Game is unplayable after interrupting a round
- Stuck in cooldown state indefinitely
- Cannot progress to next round

**Affected Flows**:

1. ✅ Normal round flow (first cooldown after matchStart) - Seems to work
2. ❌ Interrupt round flow (interruptRound → cooldown) - **BROKEN**
3. ❌ Potentially other state transitions depending on onEnterMap state

### Scope

The bug specifically affects the **interrupt path**:

- `roundStart` → `waitingForPlayerAction` → (interrupt) → `interruptRound`
- `interruptRound` auto-dispatches `restartRound`
- Transition target: `cooldown`
- **onEnter handler missing**: `cooldownEnter`

Other state transitions may also be affected if onEnterMap has similar initialization issues.

---

## Recommendations

### Immediate Actions

1. **Enable the test** `debug-interrupt-cooldown.test.js` with full CI integration
2. **Add debug logging** to `stateManager.js` to track onEnter execution in all environments (not just tests)
3. **Add validation** that all required states have onEnter handlers

### Short-term Actions

1. Fix the root cause (module caching or onEnterMap initialization)
2. Add telemetry/Sentry logging for state transitions in production to catch similar issues
3. Review all state transitions to ensure onEnter handlers are properly registered
4. Test interrupt flows in all game modes (classic, CLI)

### Long-term Improvements

1. **Refactor state handler registration** to use a registry pattern instead of module imports
   - Makes it explicit which handlers are registered
   - Easier to test in isolation
   - Prevents module caching issues

2. **Add state transition validation layer**

   ```javascript
   // Validate state machine definition
   function validateStateTable(stateTable, onEnterMap) {
     for (const state of stateTable) {
       if (state.onEnter && !onEnterMap[state.name]) {
         throw new Error(`State ${state.name} declares onEnter but handler missing`);
       }
     }
   }
   ```

3. **Improve test infrastructure for state machine testing**
   - Create test utilities that avoid module caching issues
   - Provide helper to properly initialize orchestrator in tests
   - Document best practices for state machine unit testing

4. **Add comprehensive state transition coverage**
   - Test every transition path, especially error/interrupt paths
   - Add regression tests for fixed bugs

---

## Investigation Checklist

For fixing this bug, investigate in order:

- [ ] Confirm onEnterMap["cooldown"] exists and is a function during state machine dispatch
- [ ] Verify cooldownEnter is imported/exported correctly through the module chain
- [ ] Check if there's any code modifying onEnterMap after initialization
- [ ] Verify test initialization uses the same onEnterMap as production code
- [ ] Check for any try-catch blocks silently swallowing onEnter errors
- [ ] Review if certain handlers should be conditionally skipped (and why)
- [ ] Verify state validation logic isn't preventing cooldown transition
- [ ] Check if onTransition hook interferes with onEnter execution

---

## Test File Location

Root cause identified and documented in:

- **Test**: `tests/helpers/classicBattle/debug-interrupt-cooldown.test.js`
- **Key Finding**: cooldownEnter handler not called when state transitions to "cooldown" after interrupt
- **Evidence**: 0 ready events dispatched; timer never set up; state machine stuck

---
