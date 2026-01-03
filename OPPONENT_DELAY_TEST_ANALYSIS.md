# Opponent Delay Test Failure Analysis

## Test Failure
**File**: `tests/helpers/classicBattle/opponentDelay.test.js`
**Test**: "shows snackbar during opponent delay and clears before outcome"
**Line**: 138 (now 172 after edits)

## Original Failure
```
AssertionError: expected "spy" to be called with arguments: [ 'Opponent is choosing…' ]
Number of calls: 0
```

The test expected `updateSnackbar` to be called with "Opponent is choosing…", but it was never called.

## Root Causes Identified

### 1. Code Refactoring Changed Behavior
- **Commit `eaf1e6795`** (Jan 2, 2026): Refactored snackbar handling to use `showSnackbar` instead of `updateSnackbar`
  - Comment: "Always use showSnackbar to replace any existing message - updateSnackbar can fail if the internal bar reference is stale"
  - The code no longer uses `updateSnackbar` at all

- **Commit `a1518eaf3`** (Jan 2, 2026): Removed `updateSnackbar` import entirely from `uiEventHandlers.js`

### 2. Delayed vs. Immediate Display
The current implementation in `uiEventHandlers.js` lines 314-343:
- When `resolvedDelay > 0`, the opponent message is **scheduled to appear after a delay** (line 331-343)
- It's NOT shown immediately as the old test expected

The flow is:
```javascript
if (resolvedDelay <= 0) {
  // Show immediately
  showPromptAndCaptureTimestamp(opponentPromptMessage);
  return;
}

// Schedule to show AFTER delay
opponentSnackbarId = setTimeout(() => {
  displayOpponentChoosingPrompt({
    message: opponentPromptMessage,
    markTimestamp: true,
    notifyReady: true,
    showMessage: true
  });
}, scheduleDelay);
```

### 3. Test Mock Issues
The test mocks `handleStatSelection` in `battleEngineFacade.js` to return a simple object, but this mocked version doesn't dispatch the `statSelected` event that triggers the opponent delay handler.

### 4. Handler Registration
The `bindUIHelperEventHandlersDynamic` function uses a WeakSet guard to prevent duplicate handler registration. If the EventTarget is already registered, it returns early without setting up handlers.

## What the Test Should Do

Based on the current code behavior:

1. Call `handleStatSelection` with `delayOpponentMessage: true`
2. This should dispatch `statSelected` event
3. The event handler checks if `opponentDelayMessage` feature flag is enabled
4. If enabled and `resolvedDelay > 0`, it schedules a timeout
5. After the delay, `showSnackbar` (not `updateSnackbar`) should be called with "Opponent is choosing…"

## Attempted Fixes

1. ✅ Changed test expectation from `updateSnackbar` to `showSnackbar`
2. ✅ Changed timing: Check after advancing timers, not immediately
3. ✅ Added `CooldownRenderer` mock to prevent interference
4. ✅ Added `isEnabled` injection to enable the feature flag
5. ✅ Added `getOpponentDelay` injection
6. ✅ Modified `handleStatSelection` mock to dispatch `statSelected` event
7. ❌ Still failing - `showSnackbar` is never called

## Remaining Issues

The `statSelected` event might not be reaching the handler because:
- The EventTarget might not be properly initialized
- The handler might not be registering due to WeakSet guard
- The event might be dispatched to a different EventTarget
- Console output is suppressed making debugging difficult

## Recommended Solution

The test needs to be rewritten to:
1. Properly set up the EventTarget for battle events
2. Ensure `bindUIHelperEventHandlersDynamic` actually registers the handlers
3. Verify the `statSelected` event is dispatched and received
4. Check `showSnackbar` is called after advancing timers by the delay amount

Alternatively, this might be a test that's testing outdated behavior and should be updated or removed if the opponent delay messaging works correctly in the actual application.
