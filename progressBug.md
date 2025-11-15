# Bug Investigation & Fix Plan: Stat Buttons Fail to Remain Disabled in Classic Battle

## 1. Executive Summary

- **Problem**: In Classic Battle, stat selection buttons do not remain disabled after a player makes a choice. They are momentarily disabled and then immediately re-enabled, allowing for multiple selections before the round resolves.
- **Root Cause**: A race condition exists between the battle state machine and the UI event bus. An event to enable buttons (`statButtons:enable`) is fired during round setup *before* the application state transitions to `cooldown`, a state where buttons should be disabled. The event handler, therefore, permits the re-enabling.
- **Recommended Fix**: A hybrid approach. First, prevent the premature `statButtons:enable` event from firing. Second, add a defensive check in the event handler to make it more robust. This provides defense-in-depth.
- **Risk**: Low. The fix is localized to a well-understood UI interaction loop and is covered by existing tests.

---

## 2. Issue Details

- **Test Failure**: `playwright/battle-classic/keyboard-navigation.spec.js:30:3`
- **Expected Behavior**: Stat buttons should be disabled immediately after player selection and remain disabled through the "cooldown" phase.
- **Actual Behavior**: Buttons are correctly disabled for approximately 50-100ms and then incorrectly re-enabled, breaking the intended game flow.

---

## 3. Root Cause Analysis

The core issue is a **race condition** between two asynchronous processes:

1. **State Transition**: The battle state machine, which moves from `waitingForPlayerAction` -> `cooldown` after a selection.
2. **Event Emission**: The UI setup logic in `applyRoundUI()`, which emits a `statButtons:enable` event.

**Execution Flow Leading to Failure:**

1. A player clicks a stat button, triggering `selectStat()`.
2. `disableStatButtons()` is called synchronously. **The buttons are now correctly disabled.**
3. An asynchronous operation `handleStatSelection()` begins.
4. Crucially, `applyRoundUI()` is invoked as part of the sequence, which unconditionally emits `statButtons:enable`.
5. The event listener for `statButtons:enable` in `setupUIBindings.js` executes.
6. The listener checks the current battle state, which is still `waitingForPlayerAction` because the state transition to `cooldown` has not yet completed.
7. The guard condition `statesWhereButtonsAreDisabled.includes(battleState)` returns `false`.
8. `statButtonControls.enable()` is called. **The buttons are now incorrectly re-enabled.**
9. Eventually, the battle state transitions to `cooldown`, but it's too late.

The bug is in the faulty assumption that `applyRoundUI` only runs when buttons *should* be enabled. The state check in `setupUIBindings.js` is insufficient because it doesn't account for the in-progress selection state.

---

## 4. Proposed Fix Plan

The most robust solution is a hybrid approach combining a preventative measure with a defensive guard. This makes the system resilient to future changes.

### **Part 1: Prevent Premature Event Emission (Recommended)**

Modify `src/helpers/classicBattle/roundUI.js` to prevent `statButtons:enable` from firing if a selection is in progress. This is the primary, most direct fix.

**File**: `src/helpers/classicBattle/roundUI.js`

```javascript
// Before (in applyRoundUI function):
  try {
    enableStatButtons?.();
    emitBattleEvent("statButtons:enable");
    if (!IS_VITEST) console.log("INFO: applyRoundUI -> ensured stat buttons enabled (tail)");
  } catch {}

// After:
  try {
    const container = document.getElementById("stat-buttons");
    // Only enable and emit if a selection is NOT in progress.
    // The 'selectionInProgress' flag is set when a stat is chosen.
    if (container?.dataset?.selectionInProgress !== "true") {
      enableStatButtons?.();
      emitBattleEvent("statButtons:enable");
      if (!IS_VITEST) console.log("INFO: applyRoundUI -> ensured stat buttons enabled (tail)");
    }
  } catch {}
```

### **Part 2: Add Defensive Guard to Event Handler (Defense-in-Depth)**

Modify `src/helpers/classicBattle/setupUIBindings.js` to make the event handler smarter. It should not only check the battle state but also verify that buttons aren't already disabled (which indicates a selection is in progress).

**File**: `src/helpers/classicBattle/setupUIBindings.js`

```javascript
// Before (in onBattleEvent("statButtons:enable", ...)):
onBattleEvent("statButtons:enable", () => {
    // Don't enable buttons during states where they should be disabled
    const battleState =
      typeof document !== "undefined" ? document.body?.dataset?.battleState : null;
    const statesWhereButtonsAreDisabled = ["roundDecision", "roundOver", "cooldown", "roundStart"];
    
    // ... logic ...

    if (battleState && statesWhereButtonsAreDisabled.includes(battleState)) {
      // Skip enabling buttons during these states
      console.log("[statButtons:enable] Skipping enable because battleState is", battleState);
      return;
    }
    
    // ... logic ...
    
    console.log("[statButtons:enable] Calling enable()");
    statButtonControls?.enable();
    // ...
});


// After:
onBattleEvent("statButtons:enable", () => {
    const battleState =
      typeof document !== "undefined" ? document.body?.dataset?.battleState : null;
    const statesWhereButtonsAreDisabled = ["roundDecision", "roundOver", "cooldown", "roundStart"];

    if (battleState && statesWhereButtonsAreDisabled.includes(battleState)) {
      return;
    }

    const container =
      typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
      
    // NEW: Add a check to see if any button is already disabled. This is a reliable
    // signal that a selection is in progress and we should not re-enable.
    const anyButtonDisabled = container?.querySelector("button[data-stat]:disabled");
    if (anyButtonDisabled) {
      return;
    }

    const selectionInProgress = container?.dataset?.selectionInProgress;
    if (selectionInProgress === "true") {
      return;
    }
    
    statButtonControls?.enable();
    const firstButton = document.querySelector("#stat-buttons button[data-stat]");
    if (firstButton) {
      firstButton.focus();
    }
});
```

---

## 5. Implementation & Verification Plan

1. **Apply Fixes**: Implement the changes in `roundUI.js` and `setupUIBindings.js` as described above.
2. **Run Failing Test**: Confirm the original test now passes.
    - `npx playwright test playwright/battle-classic/keyboard-navigation.spec.js`
3. **Run Full Battle Suite**: Ensure no regressions have been introduced.
    - `npm run test:battles`
4. **Manual Verification**:
    - Confirm buttons remain disabled during cooldown (visually).
    - Confirm buttons re-enable correctly after cooldown.
    - Test with mouse clicks, keyboard (Tab + Enter), and numeric hotkeys (1-5).
5. **Cleanup**: Remove all temporary `console.log` statements, `window` flags, and debug test files that were added during the investigation.


