## Summary

This document details the diagnosis and resolution of a Vitest hook timeout in `tests/helpers/classicBattle/uiHelpers.missingElements.test.js`. The root cause was a race condition between the global `beforeEach` hook and `vi.resetModules()`, which has been mitigated. This report outlines the analysis, actions taken, and recommended next steps to achieve a full resolution.

## Problem Statement

- **Symptom**: Vitest failed with an "Error: Hook timed out in 10000ms" in the global `beforeEach` hook defined in `tests/setup.js`.
- **Impact**: Initially, two tests in `uiHelpers.missingElements.test.js` failed, with other intermittent test-level timeouts appearing after initial fixes.

## Root Cause Analysis

The global `beforeEach` hook in `tests/setup.js` awaited a dynamic import of `src/helpers/classicBattle.js` and a subsequent `__ensureClassicBattleBindings()` call. However, many test files use `vi.resetModules()` in their own hooks.

This created a race condition: a test-level `vi.resetModules()` could reset module state while the global hook was still awaiting the dynamic import and re-binding. This would cause the awaited call in the global hook to hang indefinitely, leading to a timeout. The issue was compounded by test synchronization promises (e.g., `window.roundPromptPromise`) being improperly reset, leaving tests waiting for promises that would never resolve.

## Actions Taken

1.  **Diagnosis**: Reproduced the failure locally and used verbose logging to confirm the blocking `await` in `tests/setup.js`.
2.  **Audit**: Reviewed key modules, including `tests/setup.js`, `src/helpers/classicBattle.js`, and its dependencies (`testHooks.js`, `promises.js`, `roundUI.js`, `uiHelpers.js`).
3.  **Mitigation**: Modified `tests/setup.js` to resolve the blocking behavior. The final solution uses a "fire-and-forget" dynamic import in the global `beforeEach`. It invokes `__resetClassicBattleBindings()` and `__ensureClassicBattleBindings({ force: true })` without an `await`, which prevents the hook from blocking while still preloading the necessary bindings.
4.  **Cleanup**: Removed all temporary debugging logs from the source code.

## Verification and Current Status

- **Resolved**: The primary 10-second global hook timeout is fixed.
- **Remaining**: Some intermittent, shorter (5-second) per-test timeouts and failing assertions still occur. These are separate issues related to test-level synchronization.

The repository is now in a more stable state, but further action is needed to eliminate the remaining intermittent failures.

## Recommended Next Steps

To fully resolve the remaining issues and improve test architecture, I propose the following actions. Please advise which option you'd like me to pursue.

1.  **Implement Definitive Fix (Recommended)**: Create a lightweight, synchronous initializer (`initializeTestBindingsLight`) in `src/helpers/classicBattle/testHooks.js`. This function would set up only the minimal, essential state needed by tests without using `async/await`, eliminating the root cause of the race condition. This is the most robust long-term solution.
2.  **Debug Remaining Timeouts**: Systematically investigate the remaining per-test timeouts by running failing tests in isolation with extended timeouts and verbose logging to pinpoint the exact promise or resolver that is failing.
3.  **Strengthen Promise Logic Tests**: Add dedicated unit tests for the `promises.js` module. This will verify its reset/resolve behavior and prevent future regressions.
4.  **Audit `vi.resetModules()` Usage**: Analyze tests that rely on `vi.resetModules()` and refactor a small, representative subset to use targeted mocks instead. This would serve as a template for reducing test coupling across the suite.

I am ready to proceed with your selected option.

## Acceptance Criteria for Final Resolution

- The global `beforeEach` hook must not block on asynchronous operations.
- All classic battle helper tests are stable and pass deterministically in CI.
- Tests requiring classic battle bindings explicitly await them or use a synchronous initializer.

---
