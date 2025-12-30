# Bug Report: `quitConfirmButtonPromise` is null in `quit-flow.test.js`

## STATUS: RESOLVED ✅

**Fixed**: January 2025  
**Root Cause**: DOM element replacement timing issue in initialization sequence  
**Solution**: Moved `wireControlButtons()` to end of `init()` function

---

## 1. Summary

The `quit-flow.test.js` test was failing with an error indicating that `quitConfirmButtonPromise` is `null`. The test simulates clicking the "Quit" button and awaiting the promise for the quit confirmation modal.

**Initial Hypothesis**: This was suspected to be related to `readFileSync` externalization in the `jsdom` test environment.

**Actual Root Cause**: The quit button's event handler was being attached correctly, but the button DOM element was being **replaced** during subsequent initialization phases, causing the handler to be lost.

The original report also mentioned an unrelated issue about `clearRoundCounter` being missing from a mock. This should be treated as a separate concern.

## 2. Investigation & Analysis

### Initial Investigation

The `quit-flow.test.js` test simulates a user clicking the "Quit" button and then awaits `window.quitConfirmButtonPromise`. This promise should be created and set on the `window` object by the `quitMatch` function in `src/helpers/classicBattle/quitModal.js` when the quit button's event handler is triggered.

The failure suggested that the event handler was not being correctly attached or triggered in the test environment. The suspected root cause was how HTML content is loaded into `jsdom`, based on a similar issue documented in `progressBrowse.md` regarding `readFileSync` externalization.

### Verification of HTML Loading

An initial review of the test files verified that all files correctly implement the deferred `readFileSync` pattern:

- `tests/classicBattle/quit-flow.test.js` ✅
- `tests/classicBattle/bootstrap.test.js` ✅
- `tests/classicBattle/end-modal.test.js` ✅

This ruled out the `readFileSync` hypothesis.

### Root Cause Discovery

Through systematic debugging with instrumentation, the following was discovered:

1. **Handler Attachment Confirmed**: `wireControlButtons()` was executing and attaching click handlers to buttons
2. **Binding Marker Set**: The `__controlBound` property was being set on buttons as expected
3. **Critical Finding**: Button DOM element references changed between before and after `init()` completion
4. **DOM Replacement**: The quit button element was being **disconnected and replaced** during later initialization phases (Phase 5: `initializeMatchStart`)

The issue was that:

- `wireControlButtons()` was called early in the initialization sequence (after Phase 2: UI setup)
- Event handlers were attached to the original button elements
- Later initialization phases (specifically Phase 5) would replace/modify button elements
- When elements are replaced, event handlers attached to the old elements are lost
- The `__controlBound` pattern was insufficient to prevent this because it was checking the new elements

## 3. Solution Implemented

### Code Changes

**File**: `src/pages/battleClassic.init.js`

**Change**: Moved `wireControlButtons(store)` (but NOT `wireExistingStatButtons`) from after Phase 2 to **after Phase 5** (`initializeMatchStart`). Stat buttons must be wired **before** match start because gameplay requires them, but control buttons (Quit, Replay, Next, Home) must be wired **after** match start to avoid DOM replacement issues.

**Before**:

```javascript
async function init() {
  // Phase 1-2: Utilities and UI
  await initializePhase1_Utilities(store);
  await initializePhase2_UI(store);
  
  wireControlButtons(store);  // ❌ Too early - buttons replaced later
  wireExistingStatButtons(store);
  
  // Phase 3-5: Continue initialization
  await initializePhase3_BattleEngine(store);
  await initializePhase4_EventHandlers(store);
  await initializeMatchStart(store);
}
```

**After**:

```javascript
async function init() {
  // Phase 1-4: Complete utilities, UI, engine, and event handler setup
  await initializePhase1_Utilities(store);
  await initializePhase2_UI(store);
  await initializePhase3_BattleEngine(store);
  await initializePhase4_EventHandlers(store);
  
  // Wire stat buttons BEFORE match start (required for gameplay)
  wireExistingStatButtons(store);
  
  // Phase 5: Start the match
  await initializeMatchStart(store);
  
  // Wire control buttons AFTER match start (safe from DOM replacement)
  wireControlButtons(store);  // ✅ Safe - no more DOM replacement
}
```

### Why This Works

By strategically timing the button wiring:

**Stat Buttons (`wireExistingStatButtons`):**

- Called **before** `initializeMatchStart` because gameplay requires these buttons
- The stat selection system needs handlers attached before the first round starts
- These buttons are not replaced during match initialization

**Control Buttons (`wireControlButtons` - Quit, Replay, Next, Home):**

- Called **after** `initializeMatchStart` because DOM manipulation in Phase 5 can replace these elements
- Handlers are attached to the **final** button elements that will remain in the DOM
- The `__controlBound` pattern works correctly because elements are no longer replaced afterward
- All control buttons benefit from this timing fix

## 4. Test Results

### Before Fix

```
Error: window.quitConfirmButtonPromise is null
```

### After Fix

```
✓ tests/classicBattle/quit-flow.test.js (1 test) 993ms
  Test Files  1 passed (1)
  Tests       1 passed (1)
```

All assertions pass:

- ✅ Quit button handler properly attached
- ✅ Promise created correctly on window object
- ✅ Modal displays with correct accessibility attributes
- ✅ Navigation flow completes successfully

## 5. Lessons Learned

### Key Insights

1. **DOM Element Identity Matters**: Event handlers are attached to specific DOM element instances. When elements are replaced (even with identical markup), handlers are lost.

2. **Initialization Order is Critical**: Event handlers should be attached **after** all DOM manipulation is complete, not during intermediate setup phases.

3. **Marker Patterns Have Limitations**: The `__controlBound` pattern helps prevent duplicate handler attachment but doesn't protect against element replacement.

4. **Hypothesis Validation**: The initial `readFileSync` hypothesis was incorrect. All tests correctly used deferred loading. Systematic debugging was essential to find the real cause.

### Best Practices

- **Wire handlers last**: Attach event handlers at the end of initialization sequences
- **Document timing dependencies**: Add comments explaining why certain operations must occur in specific order
- **Use MutationObserver for debugging**: Helps detect when elements are disconnected/replaced
- **Track element identity**: Compare element references before/after operations when debugging handler issues

## 6. Related Issues

### clearRoundCounter Mock Issue

The original report mentioned `clearRoundCounter` being missing from a mock. This is a **separate issue** and should be addressed independently if still relevant.

## 7. Future Improvements

Consider the following enhancements to prevent similar issues:

1. **Refactor Initialization**: Make DOM replacement more explicit and controlled
2. **Add Timing Assertions**: Add tests that verify handlers are attached to final element instances
3. **Improve Documentation**: Document the initialization phase sequence and timing dependencies
4. **Consider Delegation**: Use event delegation patterns where appropriate to avoid handler attachment timing issues

---

## Appendix: Debugging Timeline

1. ✅ Verified deferred HTML loading pattern in all test files
2. ✅ Ruled out `readFileSync` externalization hypothesis
3. ✅ Added instrumentation to track button state and handler attachment
4. ✅ Discovered `wireControlButtons()` was executing correctly
5. ✅ Found `__controlBound` was being set on buttons
6. ✅ Discovered button element identity changed during initialization
7. ✅ Used MutationObserver to detect button disconnection
8. ✅ Identified Phase 5 (`initializeMatchStart`) as replacing buttons
9. ✅ Moved `wireControlButtons()` to end of `init()` function
10. ✅ Verified fix with passing test
