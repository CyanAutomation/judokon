# Bug Investigation: Stat Buttons Not Disabling During Classic Battle

## Issue Summary

**Test Failure**: `playwright/battle-classic/keyboard-navigation.spec.js:30:3`  
**Expected Behavior**: Stat buttons should be disabled after selection and remain disabled during cooldown  
**Actual Behavior**: Buttons are disabled for ~50-100ms after click, then immediately re-enabled

## Investigation Timeline

### 1. Initial Discovery (Test Selector Issue)
- **Finding**: Test was using wrong CSS selector (`.disabled` class instead of `:disabled` pseudo-class)
- **Action**: Changed selector from `[data-testid="stat-button"].disabled` to `[data-testid="stat-button"]:disabled`
- **Result**: Test still failed, revealing deeper application bug

### 2. Debug Test Revelation
Created `keyboard-navigation-debug.spec.js` to trace button states:
```
After Enter - Battle state: cooldown
After Enter - disabled (attribute): 0  ← Expected: 5
After Enter - disabled (class): 0      ← Expected: 5
```

**Key Finding**: Buttons were NEVER getting disabled, despite code that should disable them.

### 3. Dual Button Management Systems Discovery
Found TWO competing systems managing stat buttons:
1. **Legacy System** (`src/pages/battleClassic.init.js`):
   - `renderStatButtons()` function creates buttons and attaches click listeners
   - `handleStatButtonClick()` → calls `disableStatButtons()`
   - **Status**: NEVER RUNS (buttons are hardcoded in HTML, not created by JS)

2. **Active System** (`src/helpers/classicBattle/uiHelpers.js`):
   - `initStatButtons()` attaches delegated click handler to container
   - `registerStatButtonClickHandler()` → `selectStat()` → `disableStatButtons()`
   - **Status**: ACTIVE and working

### 4. Root Cause Analysis

#### Discovery Path:
1. **Button Creation**: Buttons are hardcoded in `battleClassic.html` (lines 129-157), not created by JS
2. **Click Handler**: Only the `uiHelpers.js` system is active (confirmed via test instrumentation)
3. **Disable Function**: `disableStatButtons()` IS being called and DOES set `btn.disabled = true`
4. **Critical Timing Test**:
   ```javascript
   Immediate state (sync): {
     "disabled": true,          ← Buttons ARE disabled immediately
   }
   After 10ms: {
     "disabled": true,          ← Still disabled
   }
   After 100ms: {
     "disabled": false,         ← Re-enabled! ❌
   }
   ```

5. **Stack Trace Analysis**:
   ```
   at enableStatButtons (statButtons.js:79)
   at Object.enable (uiHelpers.js:1034)
   at EventTarget.<anonymous> (setupUIBindings.js:71)  ← statButtons:enable event handler
   ```

6. **Event Investigation**:
   ```javascript
   Event 1: {
     "time": 1763227220186,
     "battleState": "waitingForPlayerAction",  ← State hasn't transitioned yet!
     "willEnable": true
   }
   ```

## Root Cause

The `statButtons:enable` event is emitted by `roundUI.js` (line 483) during `applyRoundUI()` as part of round setup. This happens **BEFORE** the battle state transitions from `"waitingForPlayerAction"` to `"cooldown"`.

**Execution Flow**:
1. User clicks button → `selectStat()` called
2. `disableStatButtons()` called → buttons disabled ✓
3. `handleStatSelection()` called (async)
4. **`applyRoundUI()` called** → emits `statButtons:enable` event
5. Event handler in `setupUIBindings.js` checks battle state
6. State is still `"waitingForPlayerAction"` (not in the guard list)
7. **Buttons re-enabled** ❌
8. State eventually transitions to `"cooldown"` (too late)

**The Bug**: The state guard in `setupUIBindings.js` only prevents re-enabling during `["roundDecision", "roundOver", "cooldown", "roundStart"]`, but the event fires while still in `"waitingForPlayerAction"`.

## Attempted Fixes (Failed)

### Attempt 1: Add Battle State Checking
- Added guard to check battle state before enabling
- **Result**: Failed - event fires before state transition

### Attempt 2: Add Button State Flag (buttonsReady)
- Tried using `container.dataset.buttonsReady === "false"` as guard
- **Result**: Failed - prevented initial enable as well

### Attempt 3: Add Selection In Progress Flag
- Set `container.dataset.selectionInProgress = "true"` in `selectStat()`
- Clear it in `cooldownEnter` handler
- **Result**: Flag timing issue - needs refinement

## Proposed Fix Plan

### Option A: Prevent Premature statButtons:enable Event (Recommended)
**Location**: `src/helpers/classicBattle/roundUI.js` line 483

**Change**: Don't emit `statButtons:enable` if buttons are already disabled (selection in progress)

```javascript
// Before (line 483):
emitBattleEvent("statButtons:enable");

// After:
const container = document.getElementById("stat-buttons");
if (!container || container.dataset.buttonsReady !== "false") {
  emitBattleEvent("statButtons:enable");
}
```

**Rationale**: This prevents the event from firing when buttons should stay disabled.

### Option B: Improve Event Handler Guard (Alternative)
**Location**: `src/helpers/classicBattle/setupUIBindings.js` line 61-75

**Change**: Check if buttons are currently disabled before re-enabling

```javascript
onBattleEvent("statButtons:enable", () => {
  const battleState = document.body?.dataset?.battleState;
  const statesWhereButtonsAreDisabled = ["roundDecision", "roundOver", "cooldown", "roundStart"];
  
  if (battleState && statesWhereButtonsAreDisabled.includes(battleState)) {
    return;
  }
  
  // NEW: Check if any buttons are currently disabled (selection in progress)
  const container = document.getElementById("stat-buttons");
  const anyButtonDisabled = container?.querySelector("button[data-stat]:disabled");
  if (anyButtonDisabled) {
    return; // Don't re-enable if buttons are disabled
  }
  
  statButtonControls?.enable();
  // ... rest of handler
});
```

**Rationale**: This prevents re-enabling if buttons are currently disabled for any reason.

### Option C: Hybrid Approach (Most Robust)
Combine both fixes:
1. Prevent unnecessary `statButtons:enable` events (Option A)
2. Add defensive check in event handler (Option B)

This provides defense-in-depth.

## Files Requiring Changes

1. **Primary Fix**: `src/helpers/classicBattle/roundUI.js` (line 483)
2. **Defensive Guard**: `src/helpers/classicBattle/setupUIBindings.js` (lines 61-75)
3. **Test Fix**: `playwright/battle-classic/keyboard-navigation.spec.js` (already fixed selector)

## Cleanup Required

After implementing fix, remove temporary debugging code from:
- `src/helpers/classicBattle/statButtons.js` (console.log statements, window flags)
- `src/helpers/classicBattle/uiHelpers.js` (console.log statements, window flags)
- `src/helpers/classicBattle/setupUIBindings.js` (console.log statements, window flags)
- `src/pages/battleClassic.init.js` (window flags)
- `src/helpers/classicBattle/stateHandlers/cooldownEnter.js` (selectionInProgress flag - if not using Option A)
- Delete debug test files:
  - `playwright/battle-classic/keyboard-navigation-debug.spec.js`
  - `playwright/battle-classic/button-listener-test.spec.js`
  - `playwright/battle-classic/keyboard-navigation-click-test.spec.js`
  - `playwright/battle-classic/button-state-timeline.spec.js`
  - `playwright/battle-classic/button-immediate-state.spec.js`
  - `playwright/battle-classic/button-identity-check.spec.js`
  - `playwright/battle-classic/immediate-button-state.spec.js`

## Legacy Code Cleanup (Optional)

The `renderStatButtons()` function in `battleClassic.init.js` (line 1494) is dead code and could be removed, along with its click handler `handleStatButtonClick()` (line 1446). However, this should be done in a separate refactoring PR to avoid scope creep.

## Testing Strategy

After implementing fix:
1. Run original failing test: `npx playwright test playwright/battle-classic/keyboard-navigation.spec.js`
2. Run full battle test suite: `npm run test:battles`
3. Verify buttons stay disabled during cooldown
4. Verify buttons re-enable after cooldown ends
5. Test keyboard navigation (Tab + Enter)
6. Test mouse clicks
7. Test numeric hotkeys (1-5)

## Risk Assessment

**Risk Level**: Low  
**Justification**: 
- Fix is localized to event emission logic
- Does not change state machine flow
- Defensive guard provides fallback
- Well-tested code path

**Potential Side Effects**:
- Need to verify buttons still enable properly at round start
- Need to verify no race conditions with other event listeners

---

## Status: Ready for Review

Awaiting approval to proceed with Option A (Recommended) or alternative approach.
