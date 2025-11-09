# Unit Test Failure Root Cause Analysis

## Test: `shows opponent choosing snackbar immediately when delay is not positive`

### Problem

The test expects `scoreboardClearTimer` to be called 1 time when emitting `statSelected` event with delay=0, but it gets 0 calls.

### Key Findings

#### 1. Mock Setup Sequence (beforeEach at line 82-95)

```javascript
getOpponentDelayMock.mockReturnValue(500); // Line 93: Set default to 500
```

#### 2. Test Execution (first it() at line 107)

```javascript
getOpponentDelayMock.mockReturnValue(0); // Override to 0
```

#### 3. Console Log Observations (with SHOW_TEST_LOGS=1)

When logging before/after mockReturnValue:

```
Test: getOpponentDelayMock before mockReturnValue(0): 500
Test: getOpponentDelayMock after mockReturnValue(0): 0  ✓ Mock is correctly set to 0
```

But the event handler logs show:

```
[uiEventHandlers] delaySource: 500 resolvedDelay: 500 getOpponentDelay result: 500
```

**This is the contradiction!** The mock is 0 in the test, but 500 in the handler!

#### 4. Binding Status

```
[bindUIHelperEventHandlersDynamic] Already bound? false
[bindUIHelperEventHandlersDynamic] Binding handlers
```

The handlers ARE being bound to a fresh EventTarget (created by `resetBattleEventTarget()` in beforeEach).

### Root Cause Hypothesis

The issue appears to be that the mock function object (`getOpponentDelayMock`) is being changed at test time, but when the handler accesses `getOpponentDelay()`, it's getting a different function object or the mock isn't being applied.

This suggests a **module import/caching issue** where:

1. `uiEventHandlers.js` imports `getOpponentDelay` from `snackbar.js` at module load time
2. The vi.mock() creates a mocked version registered at module setup time
3. When the test changes the mock at runtime, the handler is somehow not seeing the updated mock

### Possible Causes

1. **Import Timing**: The handler was imported in `beforeAll` using `await import()`, which captures the mock at that time. Changing the mock afterward might not affect the already-bound handler.

2. **Closure Reference**: The handler might have a closure reference to the original `getOpponentDelay` function from the import time, not a dynamic reference.

3. **Mock Object vs Implementation**: There might be a difference between changing `mockReturnValue()` and the actual implementation being used by the handler.

### Next Steps to Verify

1. Check if the handler is using the correct mock by adding logging directly to the mock
2. Verify that `getOpponentDelay` in `uiEventHandlers.js` is the same object as `getOpponentDelayMock` in the test
3. Check if the import in `beforeAll` is causing the issue - maybe the modules need to be imported AFTER the mocks are set up, not in `beforeAll`

---

## Test: `scheduleNextRound.test.js > auto-dispatches ready after 1s cooldown`

### Problem

The test expects `emitBattleEvent('nextRoundTimerReady')` to be called but the spy shows it was never invoked.

```
AssertionError: expected [ 'battleStateChange', …(24) ] to include 'nextRoundTimerReady'
```

### Root Cause: **CONFIRMED SAME ISSUE** ✅

The root cause is **identical** to the issue described above - **module import/caching with vi.resetModules()**.

#### The Issue

1. **Top-level import** at line 12 of the test file:

   ```javascript
   import { cooldownEnter } from "../../../src/helpers/classicBattle/stateHandlers/cooldownEnter.js";
   ```

2. This import happens **before** `vi.resetModules()` is called in the test (line 281)

3. When `cooldownEnter` is imported, it loads its dependency tree including:
   - `roundManager.js`
   - `battleEvents.js`
   - Event bus utilities

4. The test then calls `vi.resetModules()` and creates a spy:

   ```javascript
   vi.resetModules();
   const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
   const emitBattleEventSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");
   ```

5. **The problem**: The spy is created on a **fresh import** of `battleEvents.js`, but `cooldownEnter` (and its dependency tree) still holds references to the **old cached** `battleEvents.js` module that was loaded before `vi.resetModules()`

### Solution: ✅ IMPLEMENTED

Move the `cooldownEnter` import **inside** the test **after** `vi.resetModules()`:

```javascript
it("auto-dispatches ready after 1s cooldown", async () => {
  vi.resetModules();

  // ... setup ...

  // Import AFTER vi.resetModules() to ensure fresh module cache
  const { cooldownEnter } = await import(
    "../../../src/helpers/classicBattle/stateHandlers/cooldownEnter.js"
  );

  mockBattleData(cooldownEnter);
  const battleEventsMod = await import("../../../src/helpers/classicBattle/battleEvents.js");
  const emitBattleEventSpy = vi.spyOn(battleEventsMod, "emitBattleEvent");

  // ... rest of test ...
});
```

**Result**: Test now **PASSES** ✅

### Key Lesson

**When using `vi.resetModules()` in tests:**

1. ❌ **DON'T** import modules at the top level that will be spied on or that depend on spied modules
2. ✅ **DO** import all such modules dynamically **after** `vi.resetModules()` is called
3. ✅ **DO** ensure the import order: `vi.resetModules()` → import module → create spy → use module

This ensures that the spy is attached to the same module instance that the code under test will use.
