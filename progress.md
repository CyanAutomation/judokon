# BUG_REPORT: NEXT_BUTTON_READINESS

---

## METADATA

- bug_id: BR-2025-09-NEXT-BUTTON
- related_spec: `playwright/battle-next-readiness.spec.js`
- status: open
- severity: high
- affected_modes: Classic Battle (UI)
- unaffected_modes: CLI

---

## 1. Symptom

- **Problem:** The "Next" button (`#next-button`) is not consistently marked as ready (`data-next-ready='true'`) after a round resolves in Classic Battle.
- **Impact:** This causes timeouts and flaky tests in the `battle-next-readiness.spec.js` Playwright spec.
- **Observation:** Logs confirm the cooldown period starts, but the `data-next-ready` attribute is never set on the button in the DOM.

---

## 2. Root Cause Analysis

The root cause is a race condition due to **dual ownership of the readiness logic**:

- **`orchestratorHandlers.js`:** Intended to manage the UI state, including the "Next" button readiness.
- **`roundManager.js`:** Contains a fallback mechanism that also tries to manage readiness.

An early return in `initInterRoundCooldown()` within the orchestrator can prevent it from marking the button as ready. The fallback in `roundManager` then fails to correctly update the DOM, leading to the inconsistent state.

---

## 3. Proposed Fix: Unify Ownership

The fix is to centralize the readiness logic within the orchestrator and UI services, ensuring a single, reliable source of truth.

### Implementation Plan:

1.  **`src/helpers/classicBattle/roundManager.js`**
    - Create a helper function `isOrchestrated()` to detect if the orchestrator is active (e.g., by checking `document.body.dataset.battleState`).
    - In `startCooldown()`, use `isOrchestrated()` to prevent this module from dispatching the `ready` event or modifying the DOM directly when the orchestrator is running. The fallback logic should only execute in non-orchestrated environments (like unit tests).

2.  **`src/helpers/classicBattle/orchestratorHandlers.js`**
    - In `initInterRoundCooldown()`, remove the early return.
    - This module will now _always_ be responsible for the inter-round cooldown process.
    - It will consistently emit `countdownStart` and `countdownFinished` events.
    - On `countdownFinished`, it will set `#next-button.dataset.nextReady = "true"` and dispatch the `nextRoundTimerReady` event.

3.  **`src/helpers/classicBattle/uiService.js`**
    - Verify that the countdown logic is idempotent and reliably emits `countdownFinished`.

4.  **`playwright/battle-next-readiness.spec.js`**
    - Update the test to wait for the `nextRoundTimerReady` event as the primary condition for readiness.
    - Use the `data-next-ready` attribute as a fallback assertion.
    - Adjust timeouts to be more robust (e.g., 2000-6000ms).

---

## 4. Acceptance Criteria

The fix is successful if, after a round resolves:

- The `countdownStart` and `countdownFinished` events are observed.
- The "Next round in..." snackbar is rendered.
- The `#next-button[data-next-ready='true']` attribute is present within 1500ms.
- The `nextRoundTimerReady` event is emitted.
- The `playwright/battle-next-readiness.spec.js` test passes reliably.
- Readiness attributes are _not_ present during the `waitingForPlayerAction` or `roundDecision` states.
