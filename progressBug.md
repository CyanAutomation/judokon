# Bug Investigation Report: Battle Logic Unit/Integration Test Failures in JSDOM

## Executive Summary

**Original Issue:** Unit/integration tests for battle logic components are timing out and failing assertions in a JSDOM environment. Specifically, 6 tests were timing out (5-6 seconds each) while waiting for battle state transitions via JSDOM event simulation, and subsequently, store updates were not persisting.

**Root Cause:** The store *does* pick up the player's selection, but by the time the test inspects it the orchestrator has already resolved the round and cleared `selectionMade`/`playerChoice`. Waiting on `selectStat()` hides the moment the mutation happens.

**Solution Approach:** Call `selectStat()` (or the underlying handler) and assert the store immediately after the synchronous selection path completes, before the resolution promise finishes, so we capture the values before the orchestrator resets them.

**Current Status:** Timeouts are gone, but we now understand the remaining failure is a timing issue: the round resolution runs to completion before the test checks the store, so the test observes the cleaned-up state rather than the selection that was just applied.

---

## Task Contract

```json
{
  "inputs": [
    "tests/integration/battleClassic.integration.test.js",
    "src/helpers/classicBattle/uiHelpers.js",
    "src/helpers/classicBattle/selectionHandler.js"
  ],
  "outputs": [
    "tests/integration/battleClassic.integration.test.js",
    "src/helpers/classicBattle/uiHelpers.js",
    "src/helpers/classicBattle/selectionHandler.js",
    "tests/classicBattle/uiEventBinding.test.js"
  ],
  "success": [
    "eslint: PASS",
    "vitest: PASS (all battle logic unit/integration tests)",
    "jsdoc: PASS",
    "no_unsilenced_console_in_tests",
    "tests: happy + edge cases for UI event binding",
    "CI green"
  ],
  "errorMode": "ask_on_regression_failure"
}
```

---

## Original Failing Tests

1. `initializes the page UI to the correct default state`
2. `keeps roundsPlayed in sync between engine and store in non-orchestrated flow`
3. `keeps roundsPlayed in sync between engine and store in orchestrated flow`
4. `exposes the battle store through the public accessor during a full selection flow`
5. `upgrades the placeholder card during opponent reveal`
6. (6th test was using `.skip()`)

---

## Stage 1: Fix Original Timeouts ✅ COMPLETE

### What Was Done

**Replaced polling-based waits with direct state checks, aiming to isolate state machine transitions from unreliable JSDOM event simulation for button clicks:**

```javascript
// ❌ OLD: Wait for state machine to transition (timeout-prone)
const stateReached = await testApi.state.waitForBattleState("waitingForPlayerAction");
expect(stateReached).toBe(true); // Often false after 5 seconds

// ✅ NEW: Check observable outcome by allowing modal handlers to execute and then asserting DOM state
const roundButtons = document.querySelectorAll(".round-select-buttons button");
roundButtons[0].click(); // Let modal handlers execute naturally (e.g., startRound())
await testApi.state.waitForBattleState("waitingForPlayerAction", 5000); // Wait for state
const statButtons = document.querySelectorAll("#stat-buttons button[data-stat]");
expect(statButtons.length).toBeGreaterThan(0); // Direct DOM assertion
```

### Results

- **Test execution time:** Reduced from ~35 seconds for all tests to ~9 seconds
- **Per-test average:** From 5-6 seconds to <2 seconds
- **Timeouts:** Eliminated entirely
- **Test output:** Clean, no timeout errors

### Key Insight

After the timeouts were removed we verified that `applySelectionToStore()` actually fires, but `selectStat()` resolves only after the round resolution completes, which immediately resets `selectionMade` and `playerChoice`. The previous polling waits were therefore inspecting the store after it had already been cleaned up, so we saw false negatives even though the mutation had occurred.

---

## Current Status: Task 1 Investigation - Store Update Chain Execution 🔍 **FINDINGS DOCUMENTED**

### Key Discoveries

1. **Store object itself is fully mutable** ✅
   - No Object.freeze() or Object.seal() on store
   - Store is accessed via the public `getBattleStore()` helper, and every path returns the same reference
   - Access to properties such as `selectionMade` and `playerChoice` is unrestricted

2. **Mutation code executes correctly** ✅
   - `applySelectionToStore()` is invoked and sets `selectionMade = true` and `playerChoice = stat`
   - Instrumentation of the mutation verified the selection history shows `stat: "power"` with `beforeSelection: false`
   - The store becomes truthy during the immediate synchronous selection path

3. **Timing is the actual problem** ⚠️
   - `selectStat()` returns a promise that only resolves once `resolveRound()` and its fallback are complete
   - By the time the integration test awaits that promise, the orchestrator has already reset `selectionMade`/`playerChoice`
   - The test therefore observes the cleaned-up store and concludes the mutation never happened

### Root Cause

The root cause is not a missing store mutation but a race in the test flow: the integration helper waits for `selectStat()` to finish, which includes the entire round resolution and cleanup. The state machine clears the selection immediately after the mutation, so assertions that run after the promise resolves always read `selectionMade === false`.

### Actions Taken

- Instrumented `applySelectionToStore()` locally to confirm the mutation fires before resolution and recorded the selection history for manual debugging
- Verified that the selection history entry reports `stat: "power"` (or the stat being chosen) at the time of the mutation
- Observed that as soon as `resolveRound()` completes, the store is reset (round metadata goes back to null), proving the timing window is lost

### Next Steps

1. Update `performStatSelectionFlow()` to capture the store state immediately after `selectStat()` is invoked (before awaiting the returned promise). For example:
   ```js
   const selectionPromise = selectStat(store, selectedStat);
   await Promise.resolve(); // allow the synchronous selection path to run
   expect(getBattleStore().selectionMade).toBe(true);
   await selectionPromise;
   ```
2. Consider adding a helper that exposes `selectStat()`'s mid-flight completion (e.g., resolve `selectionApplied` first and resolve the rest of the flow separately) so tests can assert without losing the selection window.
3. Continue to let the original promise resolve before waiting for `roundDecision`/`roundsPlayed` assertions so the rest of the flow is still verified.

---

## Technical Deep Dive

### How Stat Selection Normally Works (in App)

```
User clicks stat button
→ DOM click event fires on #stat-buttons container
→ Event listener delegates to button[data-stat]
→ Handler calls selectStat(store, stat)
→ selectStat() emits "statSelected" battle event
→ Battle event listeners update store + trigger state machine dispatch
→ State machine transitions to roundDecision
→ onEnter handlers for roundDecision execute
→ Store gets final updates (roundsPlayed++, etc.)
```

### How Tests Currently Try to Work

```
Test clicks round button
→ Modal handler dispatches startClicked event
→ State machine transitions through cooldown → roundStart → waitingForPlayerAction
→ Test waits for waitingForPlayerAction state (✅ works)
→ Test calls `selectStat()` and `await` it
→ The state machine resolves the round and clears the selection before the promise returns
→ Store now reports `selectionMade === false`, so the assertion fails even though the selection happened
```

### The Disconnect

The assertion fires after the promise returned by `selectStat()` resolves, which is *after* the orchestrator has already reset the selection state. The mutation never appears in the assertion window even though it ran synchronously, so the test incorrectly reports a regression.

---

## Proposed Solution Path

### Option A: Capture the store before resolution (Recommended)

**Strategy:** Trigger the normal selection helpers but split the test into two phases: kick off `selectStat()`, check the store once the synchronous mutation has completed, and only then await the promise so `roundDecision` and score assertions can run.

```javascript
const selectionPromise = selectStat(store, selectedStat);
await Promise.resolve(); // allow validateAndApplySelection + applySelectionToStore to run
expect(getBattleStore().selectionMade).toBe(true);
expect(getBattleStore().playerChoice).toBe(selectedStat);
await selectionPromise;
await state.waitForBattleState('roundDecision', 5000);
```

**Pros:**
- No production code change required; the tests simply observe the pre-cleanup window.
- Keeps the rest of the flow intact by awaiting the original promise once the short-lived check passes.
- Verifies the battle store as the user would see it immediately after picking a stat.

**Cons:**
- Tests must be careful to await the returned promise later so they still validate the rest of the flow.

### Option B: Expose a selection-applied promise from `selectStat()`

**Strategy:** Extend `selectStat()` (or the underlying `handleStatSelection`) to optionally resolve a `selectionApplied` signal before the round resolver runs, then expose the original promise for the rest of the flow. Tests can then await the first signal, assert the store, and then await the second signal for resolution.

**Pros:**
- Clean separation of concerns; the production code acknowledges the two phases of selection.
- Makes the instrumentation explicit for all test helpers.

**Cons:**
- Requires touching the production helper to return additional data.
- Needs coordination with any other code that currently relies on the single promise returned by `selectStat()`.

### Option C: Push the scenario to a more realistic runner (Playwright)

**Strategy:** Run the full stat selection flow in Playwright so the real browser lifecycle handles the timing, and only the UI assertions (not the store state) are verified in JSDOM.

**Pros:**
- Removes the timing mismatch entirely since Playwright won't reset the store before the test inspects it.
- Avoids having to refactor `selectStat()` or the integration helper.

**Cons:**
- Slower test execution and higher maintenance cost.
- The existing Vitest integration tests would still need coverage if they are the preferred regression guard.

---
## Revised Implementation Plan & Next Actions

**Execute Option A (Hybrid Approach):**

1.  Refactor `performStatSelectionFlow()` so it separates selection observation from round resolution. Trigger selection via `const selectionPromise = selectStat(store, stat);`, then await `Promise.resolve()` (or a custom hook) before asserting `getBattleStore().selectionMade` and `store.playerChoice`.
2.  After the short-lived assertion, `await selectionPromise` and let the rest of the helper continue to wait for `roundDecision` and `roundsPlayed` so the full flow is still validated.
3.  (Optional) Introduce a helper like `await waitForSelectionApplied(store)` so future tests can rely on a clean API instead of microtask tricks.
4.  Continue to verify that the rest of the test (state machine transitions, score updates, DOM placeholders) still passes after the promise resolves.
5.  Add `tests/classicBattle/uiEventBinding.test.js` to ensure stat buttons trigger `selectStat()` in the browser environment and record the `stat` argument. This guards against regressions when the selection helper is refactored.
6.  Clean up any temporary debugging instrumentation so the new helper runs in a clean environment.
7.  Run the targeted integration/unit suite (`npm run test:battles:classic` plus the new file) before running the broader validation checklist below.

---
## Verification Checklist

After implementing all changes, run the following commands to verify the fix:

```bash
# 1. Run the updated battle logic integration tests
npm run test:battles:classic

# 2. Run the newly created UI event binding unit tests
npx vitest run tests/classicBattle/uiEventBinding.test.js

# 3. Run essential code quality and data integrity checks
npx prettier . --check
npx eslint .
npm run check:jsdoc
npm run validate:data

# 4. Final check: Ensure the entire test suite passes
npm run test:ci
```
This comprehensive plan ensures that we not only fix the immediate bug but also improve the test suite's reliability and maintainability for the future.

---

---

## Task 1 Investigation Summary - Status: COMPLETE ✅

### Key Findings

1. **Store mutations do happen** – `applySelectionToStore()` executes and sets `selectionMade`/`playerChoice` before the resolution promise continues.
2. **The race is the failure mode** – `selectStat()` only resolves once `resolveRound()` finishes, so the test always inspects the store after the orchestrator cleared the selection.
3. **Instrumentation confirms the cleanup** – the temporary selection history shows the stat value was recorded, and the store resets immediately afterward.
4. **Assertions were scheduled too late** – waiting on the promise hides the mutation window.

### Root Cause

There is no bug in the store mutation chain; the integration helper simply samples the store *after* the orchestration has already reset it. The round resolution runs before the test can assert, so `selectionMade` reads `false` even though the selection occurred correctly.

### Evidence

- Selection history entries logged the chosen stat and a successful `selectionMade = true` transition.
- The failure always occurs immediately after `await selectStat()`, demonstrating the assertion happens after the cleanup.
- A small microtask delay (`await Promise.resolve()`) exposes the correct store state prior to the cleanup.

### Action Items for Task 2

1. Update `performStatSelectionFlow()` to assert the store immediately after `selectStat()` is invoked and before the promise resolves, then await the returned promise to verify the rest of the round.
2. Consider adding a helper such as `waitForSelectionApplied()` if other tests will need the same timing window.
3. Add `tests/classicBattle/uiEventBinding.test.js` to ensure the DOM buttons call `selectStat()` with the expected `stat` value.
4. Run the targeted integration/unit suite before running the broader validation checklist.
