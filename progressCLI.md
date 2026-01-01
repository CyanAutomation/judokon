# Classic Battle Cooldown Test Investigation

## Status: 6/7 Tests Passing ✅ (1 Remaining Failure)

**Last Verified:** 2026-01-01 22:03:48 UTC
**Test File:** `tests/helpers/classicBattle/scheduleNextRound.test.js`
**Source File:** `src/helpers/classicBattle/roundManager.js`
**Related File:** `src/helpers/classicBattle/cooldownOrchestrator.js`

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

## Remaining Issue 🔍 REQUIRES INVESTIGATION

**Test:** "schedules a 1s minimum cooldown in test mode"
**Location:** `tests/helpers/classicBattle/scheduleNextRound.test.js:573`
**Symptom:** `expect(currentNextRound.readyDispatched).toBe(false)` fails (actual: `true`)

### Failure Analysis

The test expects `readyDispatched` to be `false` immediately after cooldown starts, but it's being set to `true` prematurely.

**Call Chain:**
```
startCooldown() 
  → setupOrchestratedReady() 
  → checkImmediate() 
  → finalize() 
  → controls.readyDispatched = true
```

**checkImmediate() Logic** (cooldownOrchestrator.js:573-601):
```javascript
const checkImmediate = () => {
  if (resolved) return;
  const stateReady = isOrchestratorReadyState(readBattleStateDataset());
  const outOfCooldown = machineOutOfCooldown();
  const buttonReady = isNextButtonReady();
  
  if (stateReady) { finalize(); return; }
  if (outOfCooldown) { finalize(); return; }
  if (buttonReady) finalize();
};
```

**isNextButtonReady() Checks** (cooldownOrchestrator.js:700-720):
```javascript
const btn = document.getElementById("next-button");
return btn.dataset?.nextReady === "true" || btn.disabled === false;
```

### Hypotheses (Ordered by Likelihood)

1. **State Machine Pollution** 🎯 HIGH PRIORITY
   - `readBattleStateDataset()` may return "roundStart" or "waitingForPlayerAction" from previous test
   - Check: `document.body.dataset.battleState` not being reset
   - **Action:** Add `delete document.body.dataset.battleState;` to `_resetForTest()`

2. **Machine State Transition Race Condition**
   - Test dispatches `machine.dispatch("continue")` which transitions to "cooldown"
   - `checkImmediate()` runs synchronously before cooldown timer starts
   - `machineOutOfCooldown()` may return true if machine is already past cooldown state
   - **Action:** Investigate `machineOutOfCooldown()` implementation and machine transition timing

3. **Button State Timing Issue**
   - Despite reset, button may have `disabled=false` at moment of check
   - Less likely due to explicit reset in `_resetForTest()`
   - **Action:** Add explicit button state verification in test setup

4. **Event Bus State Pollution**
   - Event listeners from previous tests may persist
   - `setupOrchestratedReady()` creates new listeners but may not clean up old ones
   - **Action:** Verify event bus cleanup in orchestrator reset

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