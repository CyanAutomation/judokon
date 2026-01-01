# Playwright Test Failures & Resolutions

**Last Updated**: December 31, 2025  
**Project**: JU-DO-KON! (JavaScript/Node.js)  
**Playwright Version**: @playwright/test v1.56.1  
**Test Framework**: @playwright/test (JavaScript)

This document logs significant Playwright test failures, their root causes, and resolutions implemented in the JU-DO-KON! project. It serves as a historical reference for E2E test debugging and maintenance.

---

## ⚠️ Current Status

**Active Issues:**

- cooldown.spec.js (2 tests) - Next button finalization timing with autoContinue

**Recently Resolved:**

- opponent-reveal.spec.js - Selection flag race condition (December 31, 2025)

---

## Resolved Failures

### Failure: opponent-reveal.spec.js - Selection flag race condition

**Test File**: `playwright/battle-classic/opponent-reveal.spec.js:80`  
**Date Identified**: December 31, 2025  
**Date Resolved**: December 31, 2025  
**Status**: 🟢 Resolved

**Problem:**
Test "resets stat selection after advancing to the next round" was consistently failing with timeout. The test expected `selectionMade` to be `false` after advancing to round 2, but it remained `true` even though the state handler correctly reset the flag.

Error: `expect(received).toBe(expected) // Object.is equality`

- Expected: `true`
- Received: `false`
- Timeout: 5000ms exceeded while waiting for `selectionMade === false`

**Root Cause:**
Race condition in `src/helpers/classicBattle/roundManager.js`. The async cooldown expiration handler (`handleNextRoundExpiration`) was calling `finalizeReadyControls` → `setNextButtonFinalizedState()` AFTER the state machine had already transitioned from `cooldown` → `roundStart` → `waitingForPlayerAction`.

Execution timeline:

1. `waitingForPlayerActionEnter` correctly reset `window.__classicBattleSelectionFinalized = false`
2. Async `handleNextRoundExpiration` (still running) called `finalizeReadyControls`
3. `setNextButtonFinalizedState()` set the flag back to `true` without checking current state
4. Result: Flag was `true` when it should have been `false`

**Resolution:**
Added state machine guard in `finalizeReadyControls` (line 969-997) to only set finalization flag when appropriate:

```javascript
let shouldSetFinalized = true;
try {
  const machine = controls.getClassicBattleMachine?.();
  if (machine && typeof machine.getState === "function") {
    const currentState = machine.getState();
    // Only skip if we're already in waitingForPlayerAction (selection phase)
    shouldSetFinalized = currentState !== "waitingForPlayerAction";
  }
} catch {
  // If error, still set finalized (defensive - prefer setting it)
}

if (shouldSetFinalized) {
  setNextButtonFinalizedState();
}
```

Also added `getClassicBattleMachine` to controls object in `cooldownOrchestrator.js` (line 876-880) so the guard can access the machine state.

**Relevant Files/PRs:**

- Source file: `src/helpers/classicBattle/roundManager.js` (finalizeReadyControls function)
- Source file: `src/helpers/classicBattle/cooldownOrchestrator.js` (instantiateCooldownTimer)
- Source file: `src/helpers/testApi.js` (getBattleSnapshot resolution logic)
- Test file: `playwright/battle-classic/opponent-reveal.spec.js`
- Commit: December 31, 2025 fix

**Lessons Learned:**

- Async handlers that interact with state machines need state guards
- Race conditions can occur when state transitions complete before async operations finish
- Defensive programming: default to NOT modifying global state when uncertain
- Stack trace analysis with timestamps is invaluable for debugging race conditions

---

## Active Failures

### Failure: cooldown.spec.js - Test expectations with deterministic cooldown

**Test File**: `playwright/battle-classic/cooldown.spec.js`  
**Tests**: 2 tests failing (different assertions than initial button finalization issue)  
**Date Identified**: December 31, 2025  
**Status**: 🟡 Partially Resolved

**Problem:**
Tests "Next becomes ready after resolution and advances on click" and "recovers round counter state after external DOM interference" originally failed waiting for Next button to have `data-next-finalized="true"`.

**Resolution:**
Added early button finalization in `cooldownEnter` handler (line 164-171 in `stateHandlers/cooldownEnter.js`) using new `applyNextButtonFinalizedState()` function that sets button attributes without updating round diagnostics.

```javascript
guard(() => {
  applyNextButtonFinalizedState();
  debugLog("cooldownEnter: finalized Next button state (early)");
});
```

Also created `applyNextButtonFinalizedState()` in `uiHelpers.js` (line 455-468) that sets button attributes without side effects.

**Current Status:**

- ✅ Next button finalization issue RESOLVED - tests now pass the `waitForNextButtonReady` step
- ❌ Test #1 fails on `lastContext` assertion (expects "advance" in array, gets null)
- ❌ Test #2 fails on `highestGlobal` assertion (expects >= 2, gets 0)

**Analysis:**
These remaining failures appear to be test-specific expectations about diagnostic state that may be incompatible with the combination of:

- `cooldownMs: 0` (instant cooldown)
- `autoContinue: true` (default, auto-progresses rounds)
- Early button finalization (needed for race condition fix)

The tests may need modification to:

1. Disable autoContinue, OR
2. Use longer cooldown duration, OR
3. Adjust diagnostic expectations for fast-transition scenarios

**Relevant Files:**

- Source: `src/helpers/classicBattle/stateHandlers/cooldownEnter.js` (early finalization)
- Source: `src/helpers/classicBattle/uiHelpers.js` (new applyNextButtonFinalizedState function)
- Test: `playwright/battle-classic/cooldown.spec.js`

**Note**: The opponent-reveal race condition fix remains intact and that test continues to pass.

---

## Known Patterns & Best Practices

### Pattern: State Machine Timing Issues

**Applies to**: `playwright/battle-classic/` tests

**Symptoms**:

- Tests timeout waiting for specific battle states
- State transitions happen faster than expected
- `waitForBattleState()` helper times out

**Common Causes**:

- Race conditions in state machine transitions
- Tests expecting intermediate states that complete instantly
- Auto-advance features triggering faster than test expectations

**Best Practice**:

```javascript
// ❌ Bad: Wait for single state that might be skipped
await waitForBattleState("cooldown");

// ✅ Good: Accept multiple valid states
await waitForBattleState(["cooldown", "roundOver", "waitingForPlayerAction"]);
```

### Pattern: Element Visibility & Interaction

**Applies to**: All Playwright tests

**Symptoms**:

- "Element not found" despite being visible
- Clicks/interactions fail intermittently
- "Element is not clickable" errors

**Best Practice**:

```javascript
// ❌ Bad: No explicit waiting
await page.click("#button");

// ✅ Good: Use locator with built-in waiting
const button = page.locator("#button");
await button.waitFor({ state: "visible" });
await button.click();

// ✅ Better: Playwright auto-waits with locators
await page.locator("#button").click(); // Auto-waits for actionability
```

### Pattern: Snackbar/Notification Message Verification

**Applies to**: Battle tests with UI feedback

**Best Practice**:

```javascript
// Wait for specific message in snackbar
const snackbar = page.locator('[data-testid="snackbar"]');
await expect(snackbar).toContainText("Expected message", { timeout: 5000 });

// For sequential messages
await expect(snackbar).toContainText("First message");
await page.waitForTimeout(100); // Brief pause for transition
await expect(snackbar).toContainText("Second message");
```

---

## Contributing

When documenting new test failures:

1. **Use the template above** with all sections filled in
2. **Include specific details**: Actual error messages, stack traces, file paths
3. **Add code examples**: Show the fix or workaround with real code
4. **Link to PRs/commits**: Provide git references for traceability
5. **Update status**: Mark as resolved once fixed, keep for reference
6. **Remove when obsolete**: Archive old entries that are no longer relevant

For questions about test failures:

- [AGENTS.md](./AGENTS.md) - Testing standards and patterns (Section: Playwright Test Quality Standards)
- [docs/TESTING_ARCHITECTURE.md](./docs/TESTING_ARCHITECTURE.md) - Test architecture overview
- [tests/battles-regressions/README.md](./tests/battles-regressions/README.md) - Battle test documentation
