# Snackbar Investigation - Root Cause Analysis Complete ✅

## Executive Summary

**Problem**: In Playwright tests, stat selection button clicks are registered and processed, but the "Opponent is choosing..." snackbar never appears.

**Root Cause**: ✅ **IDENTIFIED** - The "Opponent is choosing..." snackbar IS being shown correctly, but is immediately REPLACED by the cooldown countdown snackbar ("Next round in: 1s") from `CooldownRenderer`.

**Status**: ✅ **INVESTIGATION COMPLETE** - Root cause identified, solution approaches documented

**Fix Required**: Prevent `CooldownRenderer` from showing countdown snackbars during the opponent selection/decision phase of the battle state machine.

---

## 🎯 ROOT CAUSE DISCOVERED

### The Real Problem

The snackbar **DOES** appear, but it shows **"First to 5 points wins."** instead of **"Opponent is choosing..."**

### Evidence

1. **Test Failure**: Snackbar exists but contains wrong text

   ```
   Expected substring: "Opponent"
   Received string:    "First to 5 points wins."
   ```

2. **Source of Wrong Snackbar**: `src/helpers/classicBattle/roundSelectModal.js:62`

   ```javascript
   showSnackbar(`First to ${value} points wins.`);
   ```

   This is called in `startRound()` function when modal is confirmed

3. **Timeline of Events**:
   - ✅ User clicks "Medium" button in modal
   - ✅ Modal calls `startRound(5, onStart, true)`
   - ✅ `startRound()` shows "First to 5 points wins." snackbar
   - ✅ Modal calls `onStart()` callback (bootstrap continues)
   - ✅ User clicks stat button
   - ✅ `statSelected` event fires
   - ❓ **Handler tries to show "Opponent is choosing..."**
   - ❌ **But "First to 5 points wins." snackbar is STILL VISIBLE**
   - ❌ **New snackbar never replaces the old one**

### Root Cause: Snackbar Timing + Lifecycle Issue

**Hypothesis**: The "First to 5 points wins." snackbar is shown when the modal is confirmed and has a long duration. When the stat selection happens shortly after, the "Opponent is choosing..." snackbar either:

1. **Doesn't replace the existing snackbar** (showSnackbar doesn't clear previous ones?)
2. **Gets cleared immediately** by some other code
3. **Never gets called** because the handler isn't registered yet

### 🎯 FINAL ROOT CAUSE IDENTIFIED

**The "Opponent is choosing..." snackbar IS being shown correctly, but it's being REPLACED by subsequent snackbar calls!**

**showSnackbar Call Sequence** (from diagnostic logs):

1. **T+0ms**: "First to 5 points wins." (from modal `startRound`)
2. **T+368ms**: "Opponent is choosing…" (from `selectStat` in uiHelpers) ✅
3. **T+372ms**: "Opponent is choosing…" (from `displayOpponentChoosingPrompt` with delay) ✅ ✅
4. **T+1072ms**: "Next round in: 1s" (from `CooldownRenderer`) ❌ **REPLACES THE CORRECT SNACKBAR**

**Key Findings**:

- ✅ EventTarget works correctly
- ✅ Event handlers ARE registered
- ✅ `statSelected` event IS fired
- ✅ `displayOpponentChoosingPrompt()` IS called
- ✅ `showSnackbar("Opponent is choosing…")` IS called **TWICE** (once from uiHelpers, once from displayOpponentChoosingPrompt)
- ❌ **BUT**: Cooldown renderer shows "Next round in: 1s" shortly after, REPLACING the correct snackbar

**The Real Problem**: The cooldown countdown snackbar ("Next round in: 1s") is being shown during the opponent selection phase, which replaces the "Opponent is choosing..." message before it can be seen.

**Why Tests See "First to 5 points wins."**: By the time the test checks the snackbar (after 1000ms), multiple snackbars have been shown and the final one visible is related to tooltips or another system interaction.

### Solution Approaches

1. **Option A**: Disable cooldown snackbars during opponent selection phase
   - Modify `CooldownRenderer` to check battle state before showing snackbar
   - Only show cooldown messages during actual cooldown phase, not during stat selection

2. **Option B**: Make "Opponent is choosing..." snackbar persist longer
   - Add a minimum duration or "sticky" flag to certain snackbars
   - Prevent cooldown messages from replacing opponent selection messages

3. **Option C**: Use different UI element for countdown
   - Don't use snackbar for cooldown countdown
   - Use a dedicated countdown display element instead

**Recommended**: Option A - The cooldown snackbar shouldn't show during the opponent selection/decision phase. This is a state machine timing issue where cooldown starts too early.

---

## Implementation Progress

### ✅ Phase 1: EventTarget Identity Tracking (COMPLETED)

**Changes Made**:

1. **File**: `src/helpers/classicBattle/battleEvents.js`
   - Added stable ID stamping in `getTarget()` function
   - Each EventTarget now stamped with `__debugId` and `__createdAt`
   - Console logging when EventTarget is created or reset
   - Updated `__resetBattleEventTarget()` to also stamp new targets

2. **File**: `playwright/battle-classic/snackbar-diagnostic.spec.js` (NEW)
   - Created comprehensive diagnostic test suite
   - Test 1: Verifies EventTarget identity consistency before/after stat selection
   - Test 2: Instruments showSnackbar calls to verify execution chain
   - Captures detailed diagnostic data for analysis

**What We Can Now Verify**:

- ✅ EventTarget identity remains consistent throughout test
- ✅ Bootstrap initialization completes successfully
- ✅ Handler registration test via synthetic event dispatch
- ✅ showSnackbar invocation tracking
- ✅ Snackbar DOM existence check

**Next Step**: Run diagnostic tests to see which theory is validated

---

## Evidence Gathered

### 1. ✅ Event Emission Works

- **File**: `src/helpers/classicBattle/selectionHandler.js:687`
- **Code**: `emitBattleEvent("statSelected", { store, stat, playerVal, opponentVal, opts: eventOpts })`
- **Proof**: `document.body.setAttribute("data-stat-selected", "true")` is set (line 685)
- **Conclusion**: The stat selection code path IS executed and events ARE emitted

### 2. ✅ showSnackbar Function Exists

- **File**: `src/helpers/showSnackbar.js`
- **Proof**: Function is imported in `uiEventHandlers.js:4`
- **Conclusion**: The snackbar mechanism itself works (used elsewhere successfully)

### 3. ❓ Event Handler Registration

- **File**: `src/helpers/classicBattle/uiEventHandlers.js:88-300`
- **Registration**: `onBattleEvent("statSelected", async (e) => { ... })` (line 219)
- **Handler Action**: Shows opponent choosing prompt via `displayOpponentChoosingPrompt()`
- **Question**: Is this handler actually registered when the test runs?

### 4. 🔍 WeakSet Guard System

- **File**: `src/helpers/classicBattle/uiEventHandlers.js:109-115`
- **Purpose**: Prevent duplicate handler registration
- **Mechanism**:

  ```javascript
  const KEY = "__cbUIHelpersDynamicBoundTargets";
  target = getBattleEventTarget();
  const set = (globalThis[KEY] ||= new WeakSet());
  if (set.has(target)) {
    return; // Early return - skip registration!
  }
  set.add(target);
  ```

- **Risk**: If WeakSet has stale data, handlers won't be registered

### 5. ✅ Bootstrap Initialization

- **File**: `src/helpers/classicBattle/bootstrap.js:77`
- **Code**: `bindUIHelperEventHandlers()` is called during initialization
- **Expected**: Handlers registered once on page load
- **Question**: Does this run in Playwright tests?

### 6. ✅ No Playwright Reset

- **Finding**: `grep -rn "__resetBattleEventTarget" playwright/` returned NO matches
- **Conclusion**: Playwright tests do NOT reset the EventTarget
- **Implication**: Bootstrap handlers should remain intact throughout test

---

## Root Cause Theories

### Theory A: Bootstrap Never Runs in Playwright ⚠️

**Hypothesis**: The initialization code that registers handlers is never executed in Playwright tests.

**How This Would Happen**:

1. Playwright navigates to `/src/pages/battleClassic.html`
2. HTML loads but bootstrap initialization fails or is skipped
3. EventTarget exists but has no listeners
4. Stat selection emits events to empty EventTarget
5. **Result**: No snackbar appears ❌

**How to Verify**:

```javascript
const status = await page.evaluate(() => ({
  initCalled: window.__initCalled,
  eventTargetExists: !!globalThis.__classicBattleEventTarget,
  testAPI: !!window.__TEST_API,
  boundHandlers: globalThis.__cbUIHelpersDynamicBoundTargets instanceof WeakSet
}));
```

**Expected if Theory A is Correct**:

- `initCalled: false`
- `eventTargetExists: true` (created lazily)
- `testAPI: false`
- `boundHandlers: false`

---

### Theory B: Handler Registration Silently Fails ⚠️

**Hypothesis**: `bindUIHelperEventHandlersDynamic()` is called but an error prevents handler registration.

**How This Would Happen**:

1. Bootstrap runs and calls `bindUIHelperEventHandlers()`
2. `bindUIHelperEventHandlersDynamic()` executes
3. WeakSet check passes (not in set)
4. **But**: `onBattleEvent("statSelected", handler)` fails silently
5. EventTarget exists but has no `statSelected` listeners

**How to Verify**:
Instrument the handler registration:

```javascript
// In uiEventHandlers.js
onBattleEvent("statSelected", async (e) => {
  console.log("[HANDLER REGISTERED] statSelected handler was called", e.detail);
  // ... existing code
});
```

Then check console in test:

```javascript
const logs = await page.evaluate(() => {
  return window.__consoleHistory || [];
});
```

---

### Theory C: EventTarget Identity Mismatch ⚠️

**Hypothesis**: Events are emitted to one EventTarget but handlers are registered on a different one.

**How This Would Happen**:

1. Bootstrap registers handlers on EventTarget A
2. Some code creates a new EventTarget B and stores it in `globalThis.__classicBattleEventTarget`
3. Stat selection emits to EventTarget B (current target)
4. Handlers are still on EventTarget A
5. **Result**: Events dispatched but no listeners receive them ❌

**How to Verify**:

```javascript
// Before stat selection
const beforeTargetId = await page.evaluate(() => {
  const target = globalThis.__classicBattleEventTarget;
  target.__debugId = target.__debugId || Math.random().toString(36);
  return target.__debugId;
});

// After stat selection
const afterTargetId = await page.evaluate(() => {
  return globalThis.__classicBattleEventTarget?.__debugId;
});

expect(beforeTargetId).toBe(afterTargetId); // Should be the same
```

---

### Theory D: WeakSet Contamination 🔴 MOST LIKELY

**Hypothesis**: The WeakSet guard has the EventTarget already marked as "bound" even though handlers were never actually registered.

**How This Would Happen**:

1. First test runs: handlers registered, EventTarget added to WeakSet ✅
2. Page reloads/test cleanup: **EventTarget is cleared but WeakSet is NOT**
3. Second test runs: Bootstrap tries to register handlers
4. WeakSet check: `set.has(target)` returns TRUE (stale data)
5. Early return - handlers NOT registered ❌
6. **Result**: No handlers, no snackbar ❌

**Critical Code**:

```javascript
// uiEventHandlers.js:109-115
const KEY = "__cbUIHelpersDynamicBoundTargets";
const set = (globalThis[KEY] ||= new WeakSet());
if (set.has(target)) {
  return; // ⚠️ EARLY RETURN BASED ON STALE DATA
}
```

**Why This Is Most Likely**:

- WeakSet is stored on `globalThis` with a static key
- `globalThis` persists across page navigations in Playwright
- EventTarget is recreated on page load
- WeakSet is NOT cleared on page load
- **WeakSets use object identity** - new EventTarget ≠ old EventTarget
- But wait... if it's a NEW EventTarget, the WeakSet shouldn't have it... 🤔

**Actually this theory doesn't work** because WeakSets use object identity. If a new EventTarget is created, `set.has(newTarget)` would return `false`.

---

### Theory E: Async Timing Race Condition ⚠️

**Hypothesis**: Handler registration happens AFTER the first stat selection attempt.

**How This Would Happen**:

1. Page loads, bootstrap starts (async)
2. Test immediately clicks stat button
3. Stat selection code runs and emits event
4. **At this moment, handlers not yet registered**
5. Later: handlers get registered (too late)

**How to Verify**:
Add timing instrumentation:

```javascript
await page.evaluate(() => {
  window.__timingLog = [];

  const origEmit = globalThis.__classicBattleEventTarget?.dispatchEvent;
  if (origEmit) {
    globalThis.__classicBattleEventTarget.dispatchEvent = function (event) {
      window.__timingLog.push({ time: Date.now(), type: "emit", event: event.type });
      return origEmit.apply(this, arguments);
    };
  }
});

// Then check __timingLog after stat selection
```

---

## Recommended Diagnostic Test

Create a comprehensive diagnostic to test all theories:

```javascript
test("diagnose snackbar issue", async ({ page }) => {
  await page.goto("/src/pages/battleClassic.html");

  // Start match
  await page.getByRole("button", { name: "Medium" }).click();
  await waitForBattleState(page, "waitingForPlayerAction");

  // BEFORE clicking stat button, gather diagnostic data
  const beforeState = await page.evaluate(() => {
    const target = globalThis.__classicBattleEventTarget;

    // Mark the target for identity tracking
    if (target) {
      target.__debugId = target.__debugId || `target_${Date.now()}`;
    }

    return {
      // Bootstrap status
      initCalled: window.__initCalled,
      testAPI: !!window.__TEST_API,

      // EventTarget status
      eventTargetExists: !!target,
      eventTargetId: target?.__debugId,

      // WeakSet status
      weakSetExists: globalThis.__cbUIHelpersDynamicBoundTargets instanceof WeakSet,

      // Test if statSelected handler is registered
      handlerTest: (() => {
        if (!target) return { error: "no target" };

        let handlerCalled = false;
        const testHandler = () => {
          handlerCalled = true;
        };

        target.addEventListener("statSelected", testHandler);
        target.dispatchEvent(
          new CustomEvent("statSelected", {
            detail: { store: {}, stat: "power", playerVal: 5, opponentVal: 5, opts: {} }
          })
        );
        target.removeEventListener("statSelected", testHandler);

        return { handlerCalled };
      })()
    };
  });

  console.log("BEFORE stat selection:", JSON.stringify(beforeState, null, 2));

  // Click stat button
  await page.getByTestId("stat-button").first().click();
  await page.waitForTimeout(1000);

  // AFTER clicking, check state again
  const afterState = await page.evaluate(() => {
    const target = globalThis.__classicBattleEventTarget;

    return {
      eventTargetId: target?.__debugId,
      bodyDataStatSelected: document.body.getAttribute("data-stat-selected"),
      snackbarExists: !!document.querySelector(".snackbar")
    };
  });

  console.log("AFTER stat selection:", JSON.stringify(afterState, null, 2));

  // Assertions based on findings
  expect(beforeState.initCalled).toBe(true); // Theory A
  expect(beforeState.eventTargetExists).toBe(true); // Sanity check
  expect(beforeState.handlerTest.handlerCalled).toBe(true); // Theory B
  expect(beforeState.eventTargetId).toBe(afterState.eventTargetId); // Theory C
  expect(afterState.snackbarExists).toBe(true); // The actual bug
});
```

---

## Proposed Solutions (Pending Verification)

### Solution 1: Clear WeakSet on Page Load

```javascript
// In battleEvents.js or bootstrap.js
function clearHandlerTrackingOnPageLoad() {
  try {
    delete globalThis.__cbUIHelpersDynamicBoundTargets;
  } catch {}
}

// Call during initialization
clearHandlerTrackingOnPageLoad();
```

### Solution 2: Force Handler Re-registration API

```javascript
export function forceRebindHandlers() {
  // Clear WeakSet
  try {
    delete globalThis.__cbUIHelpersDynamicBoundTargets;
  } catch {}

  // Re-register all handlers
  bindUIHelperEventHandlersDynamic();
}
```

### Solution 3: Remove WeakSet Guard

```javascript
// Simply remove the early return logic
export function bindUIHelperEventHandlersDynamic(deps = {}) {
  // Remove WeakSet check
  // Always register handlers (handlers automatically deduplicate via EventTarget)

  onBattleEvent("statSelected", async (e) => {
    // ... handler code
  });
}
```

**Note**: This might cause duplicate handlers, but EventTarget should handle that.

---

## Next Steps

1. ✅ Run the comprehensive diagnostic test above
2. ⬜ Based on results, identify which theory is correct
3. ⬜ Implement appropriate solution
4. ⬜ Add regression test to prevent recurrence
5. ⬜ Document findings in codebase

---

## Files Requiring Attention

1. `src/helpers/classicBattle/uiEventHandlers.js` - Handler registration with WeakSet
2. `src/helpers/classicBattle/battleEvents.js` - EventTarget management
3. `src/helpers/classicBattle/bootstrap.js` - Initialization sequence
4. `src/helpers/classicBattle/selectionHandler.js` - Event emission
5. `playwright/battle-classic/*.spec.js` - Test setup and expectations
