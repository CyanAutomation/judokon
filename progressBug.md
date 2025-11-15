# Bug Investigation & Fix Plan: Stat Buttons Fail to Remain Disabled in Classic Battle

## 1. Executive Summary

- **Problem**: In Classic Battle, stat selection buttons do not remain disabled after a player makes a choice. They are momentarily disabled (50–100 ms) and then incorrectly re-enabled, allowing for multiple selections before the round resolves and breaking intended game flow.
- **Root Cause**: A **confirmed race condition** exists between the battle state machine and the UI event bus. When a player selects a stat:
  1. Buttons are disabled synchronously via `disableStatButtons()` in the button click handler
  2. Asynchronous processing begins (state machine transitions to `cooldown`)
  3. `applyRoundUI()` is invoked as part of the round flow and **unconditionally** emits `statButtons:enable`
  4. The event listener in `setupUIBindings.js` receives the enable event BEFORE the state machine has transitioned to `cooldown` (still in `waitingForPlayerAction`)
  5. The guard condition `statesWhereButtonsAreDisabled.includes(battleState)` returns `false`
  6. Buttons are incorrectly re-enabled, breaking the game flow
- **Current Mitigation**: The `selectionInProgress` flag was added to the DOM dataset (set by `selectStat()` in `uiHelpers.js` at line 761, cleared by `cooldownEnter()` at line 119 of `cooldownEnter.js`). However, this flag **is not yet checked** in the event handler, making it ineffective.
- **Recommended Fix**: A hybrid approach combining two defensive measures:
  1. **Primary**: Prevent premature `statButtons:enable` event emission by checking the `selectionInProgress` flag in `roundUI.js`
  2. **Secondary**: Add defensive checks to the event handler in `setupUIBindings.js` to verify buttons should truly be enabled
  3. This provides **defense-in-depth** and resilience to future changes
- **Risk**: **Very Low**. The fix is localized to well-understood UI interaction code and is already covered by the Playwright test at `playwright/battle-classic/keyboard-navigation.spec.js:30`.

---

## 2. Issue Details

- **Test Failure**: `playwright/battle-classic/keyboard-navigation.spec.js:30:3` (line 30–67 in the "should allow tab navigation..." test)
- **Affected Code Paths**:
  - `src/helpers/classicBattle/uiHelpers.js:selectStat()` — sets `selectionInProgress = "true"` (line 761)
  - `src/helpers/classicBattle/roundUI.js:applyRoundUI()` — emits `statButtons:enable` unconditionally (line 456–460)
  - `src/helpers/classicBattle/setupUIBindings.js:onBattleEvent("statButtons:enable", ...)` — receives and processes the enable event (line 54–99)
  - `src/helpers/classicBattle/stateHandlers/cooldownEnter.js` — clears the flag (line 119)
- **Expected Behavior**: Stat buttons should be disabled immediately after player selection and remain disabled through the "cooldown" phase until the next round begins.
- **Actual Behavior**: Buttons are correctly disabled for ~50–100 ms. Then the `statButtons:enable` event fires prematurely (before state transition to `cooldown`), triggering re-enablement. This allows multiple selections to be registered, breaking the round logic.
- **Evidence**: The `selectionInProgress` flag is being set and cleared, but the event handler does not consult it, leaving the race condition unguarded.

---

## 3. Root Cause Analysis

### High-Level Race Condition

The core issue is a **race condition** between two asynchronous processes that are not properly synchronized:

1. **State Machine Transition**: Battle state machine moves from `waitingForPlayerAction` → `cooldown` after a selection
2. **Event Emission**: The UI setup logic in `applyRoundUI()` emits a `statButtons:enable` event

### Detailed Execution Flow Leading to Failure

- Player clicks a stat button, triggering `selectStat()` in `uiHelpers.js`
- `disableStatButtons()` is called **synchronously**. The buttons are now correctly disabled.
- The `selectionInProgress` flag is set to `"true"` on the DOM container (line 761 of `uiHelpers.js`)
- An asynchronous operation `handleStatSelection()` begins, which eventually triggers the state machine to move to `cooldown`
- **Critically**, `applyRoundUI()` is invoked as part of the round setup flow (via the `roundStarted` event in a later round)
- Line 456–460 of `roundUI.js` **unconditionally** calls `enableStatButtons?.()` and emits `statButtons:enable`:

```javascript
try {
  enableStatButtons?.();
  emitBattleEvent("statButtons:enable");
} catch {}
```

- The event listener for `statButtons:enable` in `setupUIBindings.js` (line 54–99) executes
- The listener checks the current battle state via `document.body?.dataset?.battleState`, which is **still** `waitingForPlayerAction` because the state transition to `cooldown` has not yet completed
- The guard condition `statesWhereButtonsAreDisabled.includes(battleState)` evaluates to `false`
- The `selectionInProgress` flag check is **missing** from the event handler, so it does not block re-enablement
- `statButtonControls.enable()` is called. **Buttons are now incorrectly re-enabled.**
- Eventually (after 50–100 ms), the battle state machine transitions to `cooldown`, but it's too late. The buttons are already re-enabled and can accept additional input.

### Why the Flag Was Insufficient

The `selectionInProgress` flag was added to the DOM dataset (observable via `document.getElementById("stat-buttons")?.dataset?.selectionInProgress`), but:

- The flag is set correctly in `selectStat()` at `uiHelpers.js:761`
- The flag is cleared correctly in `cooldownEnter()` at `cooldownEnter.js:119`
- **However**, the event handler in `setupUIBindings.js` does **not consult this flag**, making it ineffective as a guard

This is the primary defect: the infrastructure for the fix exists but is not wired into the event handler.

---

## 4. Proposed Fix Plan

The recommended solution is a **hybrid approach** combining multiple defensive layers. Since the infrastructure (the `selectionInProgress` flag) is already in place but not fully utilized, the fix is straightforward:

### Part 1: Wire the Flag into the Event Handler (Primary Fix)

**File**: `src/helpers/classicBattle/setupUIBindings.js`

The event handler for `statButtons:enable` (starting at line 54) already checks the battle state but does not check the `selectionInProgress` flag. Add this check as the **first guard** before any enabling logic.

**Change**: In the `onBattleEvent("statButtons:enable", ...)` handler, add a check for the `selectionInProgress` flag **immediately after** the battle state check:

```javascript
onBattleEvent("statButtons:enable", () => {
    const battleState =
      typeof document !== "undefined" ? document.body?.dataset?.battleState : null;
    const statesWhereButtonsAreDisabled = ["roundDecision", "roundOver", "cooldown", "roundStart"];

    if (battleState && statesWhereButtonsAreDisabled.includes(battleState)) {
      return;
    }

    // NEW: Check the selectionInProgress flag before enabling.
    // If a selection is in flight, don't re-enable.
    const container =
      typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
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

**Rationale**: This wires the existing flag into the guard logic, preventing re-enablement while a selection is being processed. It directly addresses the root cause by blocking the premature `statButtons:enable` event.

### Part 2: Remove Unnecessary Debug Logging (Code Cleanup)

**File**: `src/helpers/classicBattle/setupUIBindings.js`

The event handler currently contains debug logging (lines 57–82) that should be removed as part of the fix:

- Line 57: `console.log("[statButtons:enable] Event fired, battleState:", battleState);`
- Line 72–73: Multiple console.log calls related to `selectionInProgress`
- Lines 74–83: The `window.__statButtonsEnableEvents` tracking array (used for debugging)

These debug statements were likely added during investigation and should not be committed to production.

**Change**: Remove all debug logging and replace with production-quality code that is clean and minimal.

### Part 3: Simplify and Clean Up roundUI.js

**File**: `src/helpers/classicBattle/roundUI.js` (lines 456–460)

While not strictly necessary for the fix, the comments in `roundUI.js` are verbose and debug-oriented:

```javascript
try {
  enableStatButtons?.();
  emitBattleEvent("statButtons:enable");
  if (!IS_VITEST) console.log("INFO: applyRoundUI -> ensured stat buttons enabled (tail)");
} catch {}
```

After Part 1 is implemented, the `statButtons:enable` event will be properly guarded, so this unconditional emit is no longer problematic. However, keep this logic as-is for now—no change is required here since the guard is now in place downstream.

### Summary of Changes

| File | Change | Scope | Purpose |
|------|--------|-------|---------|
| `setupUIBindings.js` | Add `selectionInProgress` flag check | ~10 lines | Wire the flag into the event handler guard |
| `setupUIBindings.js` | Remove debug logging | ~26 lines | Clean up debug instrumentation |
| Total | — | ~36 lines modified | Resolve race condition and clean up |

## 5. Implementation & Verification Plan

### Step 1: Apply the Fix

Modify `src/helpers/classicBattle/setupUIBindings.js` to wire the `selectionInProgress` flag into the `statButtons:enable` event handler.

**Specific Changes**:

1. Add the `selectionInProgress` flag check as a guard after the battle state check
2. Remove all debug logging and the `window.__statButtonsEnableEvents` array

### Step 2: Run the Failing Test

Verify the specific test that was failing now passes:

```bash
npx playwright test playwright/battle-classic/keyboard-navigation.spec.js --grep "should allow tab navigation"
```

**Expected Result**: Test passes. Buttons remain disabled through cooldown and re-enable at the start of the next round.

### Step 3: Run the Full Battle Regression Suite

Ensure no regressions have been introduced to related battle functionality:

```bash
npm run test:battles
```

**Expected Result**: All battle tests pass (both Classic and CLI modes).

### Step 4: Run Full Validation

Run the complete test suite and linting to ensure quality:

```bash
npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run test:ci
```

**Expected Result**: All checks pass.

### Step 5: Manual Verification (Optional)

For extra confidence, manually verify the fix in the browser:

1. Open `src/pages/battleClassic.html` in a browser
2. Start a battle via the modal
3. Select a stat using:
   - **Mouse click**: Click any stat button
   - **Keyboard**: Tab to a button and press Enter
   - **Hotkey**: Press 1–5 for stat shortcuts
4. Immediately try to click another stat button while the cooldown runs (before the next round starts)
5. **Expected Behavior**: The button click should have no effect—only the first selection counts

### Verification Checklist

- [ ] Targeted test `keyboard-navigation.spec.js` passes
- [ ] All `npm run test:battles` tests pass
- [ ] `prettier`, `eslint`, and `jsdoc` all pass
- [ ] No unsuppressed console logs
- [ ] Code review confirms selectionInProgress flag is properly guarded
- [ ] Manual testing confirms buttons remain locked during cooldown
- [ ] All CI/CD checks pass

---

## 6. Key Insights & Recommendations

### What Worked Well in the Investigation

- **Existing Infrastructure**: The `selectionInProgress` flag was already added to the codebase (at `uiHelpers.js:761` and cleared at `cooldownEnter.js:119`), providing a solid foundation for the fix.
- **Test Coverage**: The Playwright test `keyboard-navigation.spec.js` is well-designed and caught the regression effectively.
- **Clear Event Flow**: The battle events system (`battleEvents.js`, `emitBattleEvent`, `onBattleEvent`) is well-organized and made tracing the issue straightforward.

### Areas for Improvement

- **Debug Logging**: The current codebase contains numerous debug logging statements (particularly in `setupUIBindings.js` lines 57–83) that clutter the logic. These should be removed as part of the fix.
- **Guard Completeness**: Once a guard measure is added (like the `selectionInProgress` flag), all relevant code paths must consult it. The flag was added but not wired into the event handler—this gap allowed the bug to persist.
- **Documentation**: Consider adding JSDoc comments to clarify the race condition and the purpose of the `selectionInProgress` flag for future maintainers.

### Future Resilience

After this fix is applied:

1. The battle button state machine will be more robust and resistant to timing variations
2. The `selectionInProgress` flag will serve as a reliable sentinel for the UI event handler
3. The code will be cleaner and easier to reason about without the debug logging
