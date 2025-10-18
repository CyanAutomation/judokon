# Root Cause Analysis: round-flow.spec.js Test Failures — UPDATED

**Date:** October 18, 2025  
**Test File:** `playwright/battle-classic/round-flow.spec.js`  
**Status:** 5 failures persisting after simple fix attempt  
**Duration:** 1.2m per run

## Investigation Status

The simple fix of enabling the `opponentDelayMessage` feature flag did NOT resolve the test failures, indicating the root cause is **more complex than initially thought**.

## Key Finding: Two Code Paths

After deeper investigation, there are TWO separate code paths that can show the "Opponent is choosing" message:

### Path 1: Event-Based (uiEventHandlers.js:84)

```javascript
onBattleEvent("statSelected", async (e) => {
  const flagEnabled = isEnabled("opponentDelayMessage");
  const shouldDelay = flagEnabled && opts.delayOpponentMessage !== false;

  if (!shouldDelay) {
    displayOpponentChoosingPrompt(); // Shows message immediately
  } else {
    // Schedule with delay
    setTimeout(() => displayOpponentChoosingPrompt(), resolvedDelay);
  }
});
```

### Path 2: Direct Setup (battleClassic.init.js:764)

```javascript
function prepareUiBeforeSelection() {
  const flagEnabled = isEnabled("opponentDelayMessage");
  if (flagEnabled) {
    window.__battleClassicOpponentPromptFallback = setTimeout(() => {
      showSnackbar(t("ui.opponentChoosing"));
    }, resolvedDelay);
  }
}
```

## Why Tests Are Still Failing

The feature flag overlay in `opponentRevealTestSupport.js:399` sets:

```javascript
window.__FF_OVERRIDES = { showRoundSelectModal: true, opponentDelayMessage: true };
```

This SHOULD enable the flag, but:

1. **Event Handler May Not Fire** — The `statSelected` event listener may not be properly bound or may not fire when expected
2. **Message Interference** — The unconditional "You Picked" snackbar at `uiHelpers.js:659` appears synchronously before the opponent message can be shown asynchronously
3. **Orchestrator State** — The battle orchestrator may not be fully initialized in Playwright environment, affecting event dispatch

## Test Observations

From the error output:

- **Snackbar Content Sequence:**
  - First: "You Picked: Power" (from `uiHelpers.js:659`)
  - Then: "Next round in: 3s" (countdown)
  - Never: "Opponent is choosing…"

- **Battle State Stuck:**
  - Expected: `roundOver`
  - Actual: `waitingForPlayerAction`

This pattern suggests:

1. Stat selection completes successfully ("You Picked" appears)
2. But the opponent reveal flow never starts
3. Battle state machine is blocked

## Unit Tests vs Playwright Tests

**Unit Tests (opponentChoosing.spec.js):** ✅ PASS

- Feature flag check works correctly
- Both enabled and disabled paths function

**Playwright Tests (round-flow.spec.js):** ❌ FAIL

- Same code doesn't work in integrated Playwright environment
- Suggests integration/timing issue

## Root Cause Candidates

1. **Event Handler Registration** — `bindUIHelperEventHandlersDynamic()` may not run or register properly
2. **Event Emission Timing** — `emitBattleEvent("statSelected", ...)` may not fire at the right time
3. **Promise Chain Break** — Async event handling may fail or not complete
4. **Orchestrator Mismatch** — New orchestrator may handle event dispatch differently than expected
5. **Message Coordination** — "You Picked" snackbar prevents subsequent messages from showing

## Next Steps for Debugging

To identify the true root cause, add logging to answer:

1. Is `bindUIHelperEventHandlersDynamic()` actually called?
2. Is the `statSelected` event listener registered?
3. Is `emitBattleEvent("statSelected", ...)` called after clicking stat?
4. Does the event listener callback actually execute?
5. Why doesn't "Opponent is choosing" snackbar appear?

## Conclusion

The initial hypothesis (missing feature flag) was **incorrect**. The real issue is likely one of:

- Event handler integration issue
- Event emission timing
- Orchestrator-specific behavior
- Message coordination/interference

Further debugging with logging and event tracing is required to pinpoint the exact cause.

**Recommendation:** Revert the simple feature flag fix and implement proper event tracing before committing additional changes.
