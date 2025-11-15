# Bug Investigation & Fix Plan: Stat Buttons Fail to Remain Disabled in Classic Battle

## 1. Executive Summary

- **Problem**: In Classic Battle, stat selection buttons do not remain disabled after a player makes a choice. They are momentarily disabled (50–100 ms) and then incorrectly re-enabled, allowing for multiple selections before the round resolves and breaking intended game flow.
- **Root Cause**: A **confirmed race condition** exists between the battle state machine and the UI event bus. Multiple code paths emit `statButtons:enable` events without properly checking the `selectionInProgress` flag.
- **Investigation Status**: **IN PROGRESS** - Multiple fixes attempted, test still failing
- **Current Findings**:
  1. The `selectionInProgress` flag infrastructure exists and is being set/cleared correctly
  2. Flag checks have been added to event emission sites (`roundUI.js` line 487, `waitingForPlayerActionEnter.js` line 74)
  3. Flag check exists in event handler (`setupUIBindings.js` line 75)
  4. `applyDisabledState()` function correctly sets both `disabled` property AND `disabled` attribute
  5. **However**: Test still shows buttons alternating between disabled/enabled states (tabindex cycling between -1 and 0)
  6. **Critical Discovery**: Playwright test shows NO `disabled` attribute in HTML markup at all, despite code setting it
  7. **Double Enable Issue Found**: `roundUI.js` was calling `enableStatButtons()` directly AND emitting the event (fixed)
- **Risk**: **Medium**. The race condition is more complex than initially understood, requiring deeper investigation into the button state management and event flow.

---

## 2. Issue Details

- **Test Failure**: `playwright/battle-classic/keyboard-navigation.spec.js:30:3` (line 60: `await expect(thirdStatButton).toBeDisabled()`)
- **Current Test State**: **FAILING** - Buttons still cycling between disabled/enabled states
- **Test Output Analysis**:
  - Playwright retry mechanism shows button alternating between two states:
    - 5 retries: `<button type="button" tabindex="-1" ...>` (appears disabled via tabindex)
    - 4 retries: `<button tabindex="0" type="button" ...>` (appears enabled via tabindex)
  - **Critical**: Neither state shows `disabled` attribute in HTML markup
  - This suggests buttons are being rapidly toggled between states
- **Affected Code Paths**:
  - `src/helpers/classicBattle/uiHelpers.js:selectStat()` — sets `selectionInProgress = "true"` (line 757)
  - `src/helpers/classicBattle/statButtons.js:applyDisabledState()` — sets disabled property AND attribute (lines 28-31)
  - `src/helpers/classicBattle/roundUI.js:applyRoundUI()` — conditionally emits `statButtons:enable` (line 487)
  - `src/helpers/classicBattle/stateHandlers/waitingForPlayerActionEnter.js` — conditionally emits `statButtons:enable` (line 74)
  - `src/helpers/classicBattle/setupUIBindings.js:onBattleEvent("statButtons:enable", ...)` — checks flag before enabling (line 75)
  - `src/helpers/classicBattle/view.js:startRound()` — conditionally calls `statButtonControls?.enable()` in finally block (line 96)
  - `src/helpers/classicBattle/stateHandlers/cooldownEnter.js` — clears the flag (line 119)
- **Expected Behavior**: Stat buttons should be disabled immediately after player selection and remain disabled through the "cooldown" phase until the next round begins.
- **Actual Behavior**: Buttons are being disabled and re-enabled in rapid succession, creating a race condition that Playwright's retry mechanism detects as alternating states.

---

## 3. Root Cause Analysis

### Investigation Timeline

**Iteration 1**: Initial hypothesis that `selectionInProgress` flag was not checked in event handler

- ✅ **Confirmed**: Flag check was missing in `setupUIBindings.js`
- ✅ **Fixed**: Added flag check at line 75
- ❌ **Result**: Test still failing

**Iteration 2**: Discovered missing HTML `disabled` attribute

- ✅ **Confirmed**: `applyDisabledState()` was only setting `.disabled` property, not the attribute
- ✅ **Fixed**: Added `btn.setAttribute("disabled", "")` at line 29
- ❌ **Result**: Test still failing

**Iteration 3**: Found multiple event emission points

- ✅ **Confirmed**: Both `roundUI.js` and `waitingForPlayerActionEnter.js` emit `statButtons:enable`
- ✅ **Fixed**: Added flag checks to both emission sites (lines 487 and 74 respectively)
- ❌ **Result**: Test still failing

**Iteration 4**: Discovered double-enable in roundUI.js

- ✅ **Confirmed**: `roundUI.js` was calling `enableStatButtons()` directly AND emitting event
- ✅ **Fixed**: Removed direct call, only emit event (line 489)
- ❌ **Result**: Test still failing - buttons still alternating disabled/enabled

**Iteration 5**: Added debug logging

- 🔍 **Attempted**: Added console.log to trace execution flow
- ❌ **Issue**: Console logs not captured in Playwright test output
- 🔄 **Status**: Need alternative debugging approach

### Current Understanding

The race condition is MORE COMPLEX than initially understood:

1. **Multiple Code Paths**: At least 4+ locations can enable/disable buttons:
   - `view.startRound()` finally block (line 96)
   - `roundUI.js` event emission (line 489)
   - `waitingForPlayerActionEnter.js` event emission (line 75)
   - Event handler in `setupUIBindings.js` (line 78)

2. **Timing Issue**: Buttons are being toggled SO RAPIDLY that Playwright's retry mechanism sees them alternate between states within milliseconds

3. **Missing Attribute Mystery**: Despite code explicitly setting `disabled` attribute, Playwright NEVER sees it in the HTML markup - this suggests either:
   - Attribute is being set then immediately removed
   - Button elements are being replaced/recreated
   - setAttribute is failing silently
   - Timing issue where attribute is set after Playwright checks

4. **Flag Checks Present But Ineffective**: All the flag checks are in place but the rapid cycling continues, suggesting:
   - Flag is being cleared too early
   - Flag is not being read at the right time
   - There's another code path not yet discovered
   - Async timing issue bypassing the checks

### High-Level Race Condition (Updated)

The core issue remains a **race condition** but with multiple contributing factors:

1. **State Machine Transition**: Battle state machine moves through states asynchronously
2. **Multiple Event Sources**: Multiple code paths can emit enable/disable events
3. **View Lifecycle**: `view.startRound()` has its own enable logic in a finally block
4. **Async Boundaries**: Flag checks happen synchronously but state transitions are async
5. **DOM Manipulation**: Possibility of button elements being recreated or attribute manipulation

### Why Current Fixes Are Insufficient

Despite implementing all documented fixes:

- Flag checks in emission sites ✅
- Flag check in event handler ✅
- HTML attribute setting ✅
- Removed double-enable ✅

**The test still fails**, indicating:

- There's a code path we haven't discovered yet
- The timing of flag checks vs. state changes is off
- The `disabled` attribute issue points to a deeper DOM manipulation problem

---

## 4. Fixes Applied So Far

### ✅ Fix 1: Added selectionInProgress flag check to event handler

**File**: `src/helpers/classicBattle/setupUIBindings.js` (line 75)
**Change**: Added conditional check before enabling buttons in `statButtons:enable` event handler
**Status**: Applied, test still failing

### ✅ Fix 2: Added HTML disabled attribute to applyDisabledState

**File**: `src/helpers/classicBattle/statButtons.js` (lines 28-31)
**Change**: Added `btn.setAttribute("disabled", "")` when disabling, `btn.removeAttribute("disabled")` when enabling
**Status**: Applied, but attribute not appearing in Playwright snapshots

### ✅ Fix 3: Added flag check to roundUI.js event emission

**File**: `src/helpers/classicBattle/roundUI.js` (line 487)
**Change**: Only emit `statButtons:enable` if `selectionInProgress !== "true"`
**Status**: Applied, test still failing

### ✅ Fix 4: Added flag check to waitingForPlayerActionEnter.js

**File**: `src/helpers/classicBattle/stateHandlers/waitingForPlayerActionEnter.js` (line 74)
**Change**: Only emit `statButtons:enable` if `selectionInProgress !== "true"`
**Status**: Applied, test still failing

### ✅ Fix 5: Removed double-enable in roundUI.js

**File**: `src/helpers/classicBattle/roundUI.js` (line 489)
**Change**: Removed direct call to `enableStatButtons()`, only emit event
**Status**: Applied, test still failing

### 🔄 Next Steps Needed

1. **Investigate view.startRound() lifecycle**: The finally block unconditionally calls `this.statButtonControls?.enable()` - this may be bypassing all flag checks
2. **Trace complete button enable/disable call stack**: Use browser DevTools or add persistent debugging to understand exact sequence
3. **Check for button recreation**: Search for code that might be replacing/recreating button elements
4. **Verify flag timing**: Confirm flag is set BEFORE any state transitions that might trigger enables
5. **Consider alternative approaches**: May need to rearchitect how button state is managed

---

## 5. Debugging Observations

### Playwright Test Output Analysis

**Test**: `playwright/battle-classic/keyboard-navigation.spec.js:60`
**Failure Point**: `await expect(thirdStatButton).toBeDisabled()`
**Retry Pattern**: Button alternates between two states across 9 retry attempts:

- 5 attempts show: `<button type="button" tabindex="-1" class="stat-button" ...>`
- 4 attempts show: `<button tabindex="0" type="button" class="stat-button" ...>`

**Key Observations**:

1. **No disabled attribute**: Neither state includes `disabled` attribute in HTML
2. **Rapid cycling**: Alternation happens within Playwright's 5-second timeout
3. **Tabindex as proxy**: `tabindex="-1"` suggests disabled, `tabindex="0"` suggests enabled
4. **Class missing**: Neither state shows `.disabled` class (should be added by `applyDisabledState()`)

### Code Path Discoveries

**Files that call enableStatButtons/disableStatButtons**:

- ✅ `statButtons.js` - Core implementation
- ✅ `uiHelpers.js` - selectStat() disables buttons (line 752)
- ✅ `roundUI.js` - Emits enable event (line 489)
- ✅ `waitingForPlayerActionEnter.js` - Emits enable event (line 75)
- ✅ `setupUIBindings.js` - Event handler (line 78)
- ⚠️ `view.js` - startRound() finally block calls enable (line 96)

**Critical Finding**: `view.startRound()` has flag check BUT calls `this.statButtonControls?.enable()` directly, which may bypass some guards

### Unresolved Questions

1. **Why is `disabled` attribute missing?** Code explicitly sets it via `setAttribute("disabled", "")` but Playwright never sees it
2. **What triggers the rapid cycling?** Something is calling enable/disable in quick succession
3. **Is view.startRound() the culprit?** It's called during round transitions and has its own enable logic
4. **Are buttons being recreated?** If DOM is manipulated, attributes might be lost
5. **Is there a circular event loop?** Enable triggers state change which triggers enable again?

---

## 6. Investigation Action Items

### High Priority

1. **Add view.startRound() to flag check audit**: Verify if this is bypassing guards
2. **Trace button element lifecycle**: Confirm buttons aren't being recreated/replaced
3. **Add browser console debugging**: Use non-Playwright-captured logging to see execution order
4. **Check circular dependencies**: Map full event emission→handler→emission chain

### Medium Priority

5. **Review cooldownEnter timing**: Verify flag is cleared at right moment
6. **Audit all setAttribute calls**: Ensure disabled attribute manipulation is correct
7. **Check for DOM cloning**: Look for code that might clone buttons without attributes

### Low Priority

8. **Manual browser testing**: Open battleClassic.html and inspect button states during cooldown
9. **Add e2e test with longer waits**: See if timing/async issue resolves with delays
10. **Consider refactoring button state**: May need architectural change if race is unsolvable

---

## 7. Summary & Next Actions

### Current Status

**Test Status**: ❌ FAILING (5th iteration)
**Fixes Applied**: 5 separate code changes across 4 files
**Root Cause**: NOT YET FULLY IDENTIFIED - race condition more complex than initially understood

### What We Know

- ✅ Flag infrastructure exists and is used
- ✅ Multiple code paths checked and patched
- ✅ HTML attribute setting code added
- ❌ Test still fails with rapid state cycling
- ❌ Disabled attribute never appears in HTML
- ⚠️ view.startRound() may be a key player

### Recommended Next Step

**Prioritize investigating `view.startRound()`**: This method is called during state transitions and has its own button enable logic in the finally block. Even though it has a flag check, it may be:

- Called at the wrong time (after flag is cleared)
- Called multiple times in quick succession
- Bypassing some synchronization mechanism

**Alternative approach if view.startRound() isn't the issue**: Consider adding a centralized button state manager that serializes all enable/disable operations through a single code path, preventing race conditions by design.
