# Playwright Test Failure Investigation Summary

**Date of Report**: January 5, 2026
**Investigation Status**: ⚠️ **IN-PROGRESS / REGRESSION** - Previously resolved test failures have reappeared.

## 1. Summary

This document tracks the investigation of Playwright test failures related to the Classic Battle module.

Initial investigation in late December 2025 and early January 2026 led to the resolution of several critical bugs, including a race condition in `opponent-reveal.spec.js` and finalization logic in `cooldown.spec.js`. The fixes were verified at the time, and the investigation was marked as complete.

However, a full test run on **January 5, 2026**, revealed that **65 tests are failing**, including the ones that were previously fixed. This indicates a significant regression has occurred.

**This document has been updated to reflect the current failing status and to serve as the primary log for the renewed investigation.**

## 2. Current Status (As of January 5, 2026)

- **Test Run Command**: `npx playwright test`
- **Result**: 🔴 **65 failed, 157 passed**
- **Conclusion**: The fixes implemented between December 2025 and January 2, 2026, have either been reverted, broken by subsequent changes, or were insufficient to handle all scenarios. The investigation is therefore re-opened.

### Key Regressions

The following tests, which were previously marked as fixed, are **now failing again**:

- `playwright/battle-classic/cooldown.spec.js`: Both tests are failing with `Error: Next button did not report ready within 5000ms via Test API`. This was the primary focus of the Jan 1 fix.
- `playwright/battle-classic/opponent-reveal.spec.js`: Multiple failures, including the race-condition test "resets stat selection after advancing to the next round".
- `playwright/battle-classic/keyboard-navigation.spec.js`: Failing.
- `playwright/battle-classic/opponent-message.spec.js`: Multiple failures.

## 3. Next Steps: Renewed Investigation

The priority is to understand the cause of this major regression.

### Priority 1: Analyze `cooldown.spec.js` Failure

- **Test**: `playwright/battle-classic/cooldown.spec.js`
- **Error**: `Next button did not report ready within 5000ms via Test API`
- **Hypothesis**: The "early finalization" logic, while verified to be in the code, is no longer working as intended. The state guard in `finalizeReadyControls` within `roundManager.js` might be preventing the button from being finalized correctly under new timing conditions, or another change has introduced a new race condition.
- **Action**: Begin a focused investigation on the `cooldown.spec.js` failure to trace the execution flow and identify why the `Next` button is not becoming ready.

### Priority 2: Broad Impact Analysis

- **Action**: Once the primary cooldown regression is understood, analyze the other 60+ failures to identify common patterns. Many are likely downstream effects of the initial timing and state-transition issues.

## 4. Historical Investigation Details (December 2025 - January 2026)

_The following information is preserved for historical context._

### 4.1. Race Condition Fix (`opponent-reveal.spec.js` - Dec 31, 2025)

- **Issue**: `selectionMade` flag remained `true` after advancing to the next round due to an async race condition between the cooldown timer and the state machine.
- **Solution**: A state machine guard was added to `finalizeReadyControls` in `src/helpers/classicBattle/roundManager.js` to prevent it from setting the finalization flag in an incorrect state.
- **Status**: **REGRESSED**. This test is failing again.

### 4.2. Early Finalization Fix (`cooldown.spec.js` - Jan 1, 2026)

- **Issue**: The `Next` button was not becoming ready in time for tests with `cooldownMs: 0` because an "orchestration" check was incorrectly skipping the early finalization logic.
- **Solution**:
  1.  Removed the faulty orchestration check in `src/helpers/classicBattle/stateHandlers/cooldownEnter.js`.
  2.  Enhanced `applyNextButtonFinalizedState()` in `src/helpers/classicBattle/uiHelpers.js` to set necessary diagnostic globals for tests.
- **Status**: **REGRESSED**. This test is failing again.

### 4.3. Post-Fix Enhancements (Jan 2, 2026)

Following the initial fixes, three enhancements were implemented:

1.  **Flag Unification Migration**: Migrated direct `window.__classicBattleSelectionFinalized` usages to a unified `selectionState.js` API.
2.  **Universal State Guards**: Refactored several state handlers to use a `withStateGuard` utility.
3.  **Diagnostic Panel**: Created a `diagnosticPanel.js` module (`Ctrl+Shift+D`) to expose debug info in development mode.

**Note**: These enhancements are still present in the code, but they do not prevent the current test failures. Their interaction with the core logic needs to be reviewed.
