# Classic Battle Cooldown Test Investigation

## Status: 7/7 Tests Passing ✅✅✅ RESOLVED

**Last Verified:** 2026-01-01 22:17:57 UTC
**Test File:** `tests/helpers/classicBattle/scheduleNextRound.test.js`
**Resolution:** Conditional early finalization in orchestrated mode

---

## Root Cause Analysis ✓ VERIFIED

The test failure is caused by **test state pollution between test runs**.

### Identified Pollution Sources (All Fixed ✅)

1. **Module-level state pollution** ✅
   - Variables: `currentNextRound` and `activeCooldownControls` in `roundManager.js` (lines 408, 415)
   - Effect: State from previous tests leaked into subsequent tests
   - Fix: Reset to `null` in `_resetForTest()` (line 1245-1246)

2. **Button DOM state pollution** ✅
   - Element: Next button DOM state (`data-next-ready` attribute, `disabled` property)
   - Effect: Button appeared "ready" from previous test run
   - Fix: Reset in `_resetForTest()` (lines 1248-1253)

3. **Snackbar token assignment** ✅
   - Fix: `target.dataset.snackbarToken = token;` (from earlier investigation)

---

## Fixes Applied ✅ VERIFIED

All fixes are present in `src/helpers/classicBattle/roundManager.js`:

```javascript
// Lines 1245-1246: Reset module-level cooldown state
currentNextRound = null;
activeCooldownControls = null;

// Lines 1248-1253: Reset Next button DOM state
if (typeof document !== "undefined") {
  const nextBtn = document.getElementById("next-button");
  if (nextBtn) {
    nextBtn.disabled = true;
    delete nextBtn.dataset.nextReady;
  }
}
```

---

## Test Results ✅ VERIFIED

- **scheduleNextRound.test.js**: 6/7 passing (1 failure)
- **Drift handling tests**: 3/3 passing
- **Overall impact**: 85.7% test success rate (up from baseline)

---

## Remaining Issue 🔍 ROOT CAUSE IDENTIFIED ✅

**Test:** "schedules a 1s minimum cooldown in test mode"
**Location:** `tests/helpers/classicBattle/scheduleNextRound.test.js:585`
**Symptom:** `expect(currentNextRound.readyDispatched).toBe(false)` fails (actual: `true`)

### Root Cause Confirmed ✅

**File:** `src/helpers/classicBattle/stateHandlers/cooldownEnter.js:170`
**Problem:** `applyNextButtonFinalizedState()` is called early in cooldownEnter phase

**Call Chain:**
```
cooldownEnter() (line 150)
  → applyNextButtonFinalizedState() (line 170) ❌ Sets btn.dataset.nextReady = "true"
  → startCooldown() (line 177)
    → setupOrchestratedReady()
      → checkImmediate()
        → isNextButtonReady() → returns TRUE (because nextReady was just set)
        → finalize() ❌ Premature finalization
        → controls.readyDispatched = true
```

**Root Issue:** The button is being marked as "ready" BEFORE the cooldown timer even starts, which causes the orchestrator's immediate readiness check to trigger finalization.

### Solution Strategy

**Option 1: Conditional Early Finalization** ✅ IMPLEMENTED
- Skip `applyNextButtonFinalizedState()` when in orchestrated mode
- Let the orchestrator handle button finalization after cooldown expires
- Preserves existing behavior for non-orchestrated flows

**Implementation:** Modified `src/helpers/classicBattle/stateHandlers/cooldownEnter.js:158-173`
```javascript
const isOrchestrated = !!machine.context;
if (!isOrchestrated) {
  guard(() => {
    applyNextButtonFinalizedState();
    debugLog("cooldownEnter: finalized Next button state (early, non-orchestrated)");
  });
} else {
  debugLog("cooldownEnter: skipped early finalization (orchestrated mode)");
}
```

### Test Results ✅ ALL PASSING

```
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    2.66s
```

**Tests Passing:**
1. ✅ auto-dispatches ready after 1s cooldown
2. ✅ transitions roundOver → cooldown → roundStart
3. ✅ respects skipRoundCooldown when enabled
4. ✅ respects skipRoundCooldown when disabled
5. ✅ emits countdownFinished before round.start when countdown expires
6. ✅ schedules a 1s minimum cooldown in test mode (FIXED)
7. ✅ emits ready and starts the round cycle when machine dispatch declines

---

## Recommended Action Plan

### Priority 1: State Machine Dataset Reset (Immediate)

**File:** `src/helpers/classicBattle/roundManager.js`
**Function:** `_resetForTest()`
**Change:** Add dataset cleanup after Next button reset

```javascript
// After lines 1248-1253 (Next button reset)
// Reset battle state dataset to prevent orchestrator state pollution
if (typeof document !== "undefined" && document.body) {
  delete document.body.dataset.battleState;
}
```

**Rationale:** Most likely cause based on `checkImmediate()` logic checking `isOrchestratorReadyState(readBattleStateDataset())`

### Priority 2: Add Diagnostic Logging (If P1 Fails)

**File:** `tests/helpers/classicBattle/scheduleNextRound.test.js`
**Location:** After line 573 (failing assertion)

```javascript
// Add before assertion to capture state
console.error('[TEST DEBUG] Before assertion:', {
  readyDispatched: currentNextRound.readyDispatched,
  buttonReady: orchestrator.isNextButtonReady?.(),
  machineState: machine.getState(),
  datasetState: document.body.dataset.battleState,
  buttonDisabled: document.getElementById("next-button")?.disabled,
  buttonDataset: document.getElementById("next-button")?.dataset
});
expect(currentNextRound.readyDispatched).toBe(false);
```

### Priority 3: Machine State Investigation (If P1-P2 Fail)

**File:** `src/helpers/classicBattle/cooldownOrchestrator.js`
**Functions to Review:**
- `machineOutOfCooldown()` - Verify cooldown state detection
- `isOrchestratorReadyState()` - Verify state matching logic
- `setupOrchestratedReady()` - Verify cleanup of prior event listeners

---

## Success Criteria

- [ ] All 7 tests in `scheduleNextRound.test.js` pass
- [ ] Test runs are deterministic (no flakiness)
- [ ] No console errors/warnings during test execution
- [ ] Document root cause and solution in commit message

---

## References

- **Test File:** `tests/helpers/classicBattle/scheduleNextRound.test.js:540-600`
- **Implementation:** `src/helpers/classicBattle/roundManager.js:1166-1351` (`_resetForTest`)
- **Orchestrator:** `src/helpers/classicBattle/cooldownOrchestrator.js:492-620` (`setupOrchestratedReady`)
- **Module Variables:** `roundManager.js:408` (`currentNextRound`), `roundManager.js:415` (`activeCooldownControls`)

---

## Next Steps

1. Implement Priority 1 fix (state machine dataset reset)
2. Run test: `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js`
3. If still failing, add Priority 2 diagnostics and re-run
4. Document findings and iterate

**Expected Outcome:** 7/7 tests passing with dataset cleanup fix.