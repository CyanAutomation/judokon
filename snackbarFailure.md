# Snackbar Failure Analysis: "Opponent is choosing" Message Regression

**Date**: January 5, 2026  
**Status**: <font color="red">Critical Regression - Blocking Merge</font>

---

## 1. Executive Summary

A refactor to unify snackbar logic via a central `SnackbarManager` introduced a critical regression: the "Opponent is choosing" message no longer appears in Playwright tests.

The root cause has been confirmed: the `statSelected` event handler in `uiEventHandlers.js` is **never executed** during the test run. The investigation points to the `WeakSet` guard, intended to prevent duplicate handler registration, as the likely culprit. This guard appears to be incorrectly persisting across test initializations, causing the handler registration to be skipped on subsequent runs.

This document outlines the investigation, confirms the root cause, and presents a plan to resolve the issue and implement long-term architectural improvements to prevent similar failures.

---

## 2. The Bug: Symptom and Impact

- **Test Case**: `playwright/battle-classic/round-flow.spec.js`
- **Expectation**: After a player selects a stat, a snackbar with the text "Opponent is choosing..." should appear.
- **Actual Result**: The snackbar container remains empty, causing the test to time out and fail.

```
Test: "opponent reveal cleans up properly on match end"
Expected: "Opponent is choosing" message appears after stat click
Actual:
  - 6× Shows "First to 3 points wins."
  - 3× Shows empty string ""
  - Never shows "Opponent is choosing"
```

This failure blocks merging critical UI and logic updates.

---

## 3. Root Cause Analysis: The Silent Handler

The investigation confirmed that the `statSelected` event handler is not executing. Diagnostic attributes and console logs placed at the entry point of the handler were never found in the test output.

### The Handler Registration Chain

The failure lies in the registration logic within `bindUIHelperEventHandlersDynamic`.

```javascript
// src/helpers/classicBattle/uiEventHandlers.js

export function bindUIHelperEventHandlersDynamic(deps = {}) {
  const KEY = "__cbUIHelpersDynamicBoundTargets";
  const target = getBattleEventTarget();
  const set = (globalThis[KEY] ||= new WeakSet());

  // ‼️ HYPOTHESIS: THIS CHECK IS THE SOURCE OF THE BUG ‼️
  if (set.has(target)) {
    console.log(`[Handler Registration] EARLY RETURN - Target already has handlers`);
    return; // In tests, this early return prevents re-binding.
  }

  set.add(target);

  onBattleEvent("statSelected", async (e) => {
    // This handler code is never reached in the failing tests.
  });
}
```

**Conclusion**: The `WeakSet` (`globalThis.__cbUIHelpersDynamicBoundTargets`) persists between test runs in the Playwright environment. When a subsequent test re-initializes the battle screen, the `getBattleEventTarget()` function returns the _same_ `EventTarget` instance. The `WeakSet` sees this target has already been "bound" and prematurely exits, skipping the crucial `onBattleEvent("statSelected", ...)` registration.

---

## 4. Proposed Fix Plan

### Phase 1: Implement & Verify Fix

The most direct and safest fix is to ensure a clean state for each test by clearing the `WeakSet` guard during test setup.

1.  **Update Test Initialization Script**: Modify `playwright/battle-classic/support/opponentRevealTestSupport.js` to clear the global guard before each test run.

    ```javascript
    // In initializeBattle() function inside addInitScript
    await page.addInitScript(() => {
      // Clear the handler registration guard to ensure a fresh state for every test.
      delete globalThis.__cbUIHelpersDynamicBoundTargets;
    });
    ```

2.  **Run Targeted Validation**: Execute the specific tests that were failing to confirm the fix works.

    ```bash
    # 1. Run the single failing test
    npx playwright test -g "opponent reveal cleans up properly" playwright/battle-classic/round-flow.spec.js

    # 2. Run all opponent message tests
    npx playwright test playwright/battle-classic/opponent-message.spec.js
    ```

3.  **Run Full Regression Suite**: Ensure the fix doesn't introduce side effects.

    ```bash
    # 3. Run the full classic battle suite
    npm run test:battles:classic

    # 4. Run related unit tests
    npx vitest run tests/helpers/SnackbarManager.test.js
    ```

### Phase 2: Cleanup

1.  **Remove Diagnostic Code**: Delete any temporary `console.log` statements or `data-*` attributes used during the investigation.
2.  **Add Code Comments**: Add a comment to `bindUIHelperEventHandlersDynamic` explaining why the `WeakSet` is necessary in production and how it's handled in the test environment.

---

## 5. Opportunities for Architectural Improvement

This bug highlights several architectural weaknesses. The following improvements would increase robustness, testability, and debuggability.

### Improvement 1: A Formal Handler Registry

- **Problem**: The current `WeakSet` guard is an opaque, all-or-nothing mechanism. It's impossible to inspect which handlers are registered or why registration might be skipped without adding temporary diagnostics.
- **Proposal**: Replace the `WeakSet` with a `HandlerRegistry` class that provides introspection and clearer control over the event system.

  | Feature               | Description                                                                     |
  | --------------------- | ------------------------------------------------------------------------------- |
  | **Stateful Tracking** | Explicitly tracks which handlers are bound to which targets.                    |
  | **Debuggability**     | A `registry.getDiagnostics()` method can report on the current state.           |
  | **Clear Reset**       | A `registry.clear()` method provides a formal API for test environment cleanup. |
  | **Warnings**          | Can warn on double-registration instead of failing silently.                    |

- **Benefit**: Greatly improves debugging and test setup reliability.

### Improvement 2: Event Flow Tracing

- **Problem**: When an event is fired, there is no visibility into its journey to the handler. This makes it difficult to debug issues where handlers don't fire.
- **Proposal**: Implement a lightweight, diagnostics-only `eventTracer` that logs the lifecycle of an event.

  ```mermaid
  graph TD
      A[Event Emission] -- traceId --> B(Tracer Captures);
      B -- traceId --> C{Handler 1};
      B -- traceId --> D{Handler 2};
      C -- Records Start/End --> E[Tracer Records Timings];
      D -- Records Start/End --> E;
  ```

- **Benefit**: Provides an end-to-end view of event flow, instantly revealing timing issues or handler execution failures.

### Improvement 3: True Test Environment Isolation

- **Problem**: Global state (`globalThis`, shared `EventTarget`) leaks between tests, causing failures like this one.
- **Proposal**: Create a centralized test utility for state management, exposed via `window.__testUtils`.

  ```javascript
  // In a new file, e.g., tests/utils/battleTestUtils.js
  export const testUtils = {
    resetBattleState() {
      // 1. Clear handler registration
      handlerRegistry.clear();
      // 2. Reset the event target instance
      resetBattleEventTarget();
      // 3. Clear any active snackbars
      snackbarManager.clearAll();
    }
  };

  // In Playwright test setup
  beforeEach(async () => {
    await page.evaluate(() => window.__testUtils.resetBattleState());
  });
  ```

- **Benefit**: Enforces strict test isolation, eliminating a major class of flaky tests and ensuring reliable CI runs.

### Improvement 4: Decouple UI with an Orchestration Layer

- **Problem**: Handlers currently contain direct calls to the `SnackbarManager`, mixing business logic with UI implementation. This makes them hard to unit test.
- **Proposal**: Introduce a `SnackbarOrchestrator` that subscribes to state changes or events and translates them into UI commands.

  | Old Way (Coupled)                              | New Way (Decoupled)                                       |
  | ---------------------------------------------- | --------------------------------------------------------- |
  | `onEvent("statSelected", () => {`              | `onEvent("statSelected", () => {`                         |
  | `  snackbarManager.show("Opponent choosing");` | `  state.set("AWAITING_OPPONENT");`                       |
  | `});`                                          | `});`                                                     |
  |                                                | `orchestrator.onStateChange("AWAITING_OPPONENT", () => {` |
  |                                                | `  snackbarManager.show("Opponent choosing");`            |
  |                                                | `});`                                                     |

- **Benefit**: Allows for pure, fast unit tests on the event handlers (by just checking state changes) and centralizes UI logic in one place.

---

## 6. Summary

The `statSelected` handler failure is a classic example of a test isolation problem. The immediate fix is to ensure the `WeakSet` guard is reset for each test. The long-term solution is to invest in a more robust and transparent event handling and test setup architecture to prevent future regressions.
