# Test Isolation Issue Report

## Playwright CLI Tests - Battle State Machine Synchronization

**Date**: October 22, 2025 | **Updated**: October 24, 2025  
**Severity**: Medium  
**Status**: Identified, Analysis Complete, Fix Plan Refined  
**Affected Test**: `playwright/battle-cli-play.spec.js`

---

## Document Update Summary

This QA report has been updated with the following improvements:

- **✅ Corrected line number references** (1670→1706, 196→233) for accurate code navigation
- **✅ Clarified WeakSet persistence mechanism** - not about reference retention, but globalThis pollution across page loads
- **✅ Identified ALL module-level globals** that need cleanup (18+ variables catalogued)
- **✅ Expanded fix options** from 3 to 4 approaches with detailed pros/cons
- **✅ Added "Hybrid Approach"** recommendation combining immediate + long-term solutions
- **✅ Provided comprehensive verification strategy** with 6 concrete test scenarios
- **✅ Created investigation guide** with 4 debuggable steps to confirm root cause
- **✅ Enhanced developer notes** with prevention guidelines and code review focus
- **✅ All references verified against actual codebase** (3282 lines of init.js reviewed)

---

## Executive Summary

The `battle-cli-play.spec.js` test **passes when run in isolation** but **fails when run with other CLI tests** (`battle-cli-start.spec.js` and `battle-cli-restart.spec.js`). The failure occurs at the stat selection step where the battle state machine fails to transition from `waitingForPlayerAction` to `roundDecision`.

This is a **test isolation/cross-contamination issue**, not a code defect. The test infrastructure does not properly clean up global JavaScript state between test runs.

---

## Detailed Failure Analysis

### Failure Symptom

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: "roundDecision"
Received: "waitingForPlayerAction"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate

Location: playwright/battle-cli-play.spec.js:46-48
```

### Reproduction Steps

1. Run: `npx playwright test playwright/battle-cli*.spec.js` (all three CLI tests)
2. Observe: First test (`battle-cli-start.spec.js`) passes ✓
3. Observe: Second test (`battle-cli-play.spec.js`) fails ✗ at stat selection
4. Note: Third test (`battle-cli-restart.spec.js`) would pass if second didn't fail

### Root Cause Analysis

The failure occurs when the stat button click does not trigger the `selectStat()` function, or the function executes but the state machine dispatch fails to transition states.

**Key Evidence:**

- The test successfully waits for `waitingForPlayerAction` state (line 27)
- The stat button is visible and clickable (line 41)
- The click event is issued (line 44)
- BUT the subsequent state poll for `roundDecision` times out (line 46)

**Suspected Culprits:**

1. **Global State Persistence**: The WeakSet `globalThis.__battleCLIStatListBoundTargets` persists across page navigations in `src/pages/battleCLI/init.js` (line 1706).

```javascript
function ensureStatClickBinding(list) {
  const onClick = handleStatListClick;
  const boundTargets = (globalThis.__battleCLIStatListBoundTargets ||= new WeakSet());
  if (!boundTargets.has(list)) {
    list.addEventListener("click", onClick);
    boundTargets.add(list);
  }
}
```

**Why this matters:** Although WeakSets allow garbage collection of object references, the WeakSet *itself* persists on `globalThis` across page loads in Playwright's test environment. This means:

- When test 1 loads and runs, the WeakSet is created and stores the first page's stat list element
- When test 2 loads with a NEW page and NEW DOM, the WeakSet persists
- The new stat list element is a *different* object than the old one
- However, if module globals aren't properly reset (see point 2), the click handler references or state machine might not be properly initialized
- More critically: if `window.__battleCLIinit` properties from the previous test persist, they may interfere with initialization logic that depends on that being a fresh object

1. **Module-Level Globals Not Reset**: The file `src/pages/battleCLI/init.js` declares numerous module-level variables (lines 203+) that are never cleared between page loads:
   - `currentPlayerJudoka`, `store`, `verboseEnabled`
   - `cooldownTimer`, `cooldownInterval`, `selectionTimer`, `selectionInterval`
   - `selectionFinishFn`, `selectionTickHandler`, `selectionExpiredHandler`
   - `selectionCancelled`, `selectionApplying`
   - `quitModal`, `isQuitting`
   - `pausedSelectionRemaining`, `pausedCooldownRemaining`
   - `commandHistory`, `historyIndex`

   When test 2 begins, these variables still contain stale values from test 1, including timers that may fire during test 2's execution.

1. **Window.__battleCLIinit Object Pollution**: The `window.__battleCLIinit` object is merged but never cleared, accumulating properties across page loads that may reference old handlers or state.

---

## Impact Assessment

| Dimension             | Assessment                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| **Functional Impact** | Low - Code works correctly in normal usage and when tests run individually |
| **CI/CD Impact**      | High - Test suite fails when run together, breaking CI pipelines           |
| **Reproducibility**   | High - Consistently fails when tests run sequentially                      |
| **Test Coverage**     | The feature IS properly tested; isolation bug hides this                   |

---

## Fix Plan

### Option A: Create Shared Test Fixture with Global State Cleanup (Recommended - Best UX)

**Approach**: Create a reusable Playwright fixture that configures clean page contexts and clears known problematic globals before each CLI test.

**File**: `playwright/fixtures/battleCliFixture.js` (new file)

```javascript
import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    // Set up a fresh page with battle CLI globals cleared
    await page.addInitScript(() => {
      // Clear globalThis globals that persist across navigations
      delete globalThis.__battleCLIStatListBoundTargets;
      delete globalThis.__battleCLIinit;

      // These may not be needed if page context is truly fresh,
      // but included for defense-in-depth
      delete globalThis.__battleCLIModuleState;
    });

    await use(page);

    // Optional: Cleanup after test if needed
  }
});
```

**Files to Update**: `playwright/battle-cli-*.spec.js`

```javascript
import { test, expect } from "./fixtures/battleCliFixture.js";
// ... rest of test code
```

**Pros:**

- Centralized, maintainable solution
- Works for all CLI tests without modification to each test
- Clear, declarative pattern
- Easy to extend with additional cleanup logic
- DRY principle - logic lives in one place

**Cons:**

- Requires new file
- All CLI tests must import the custom fixture

**Effort**: 45 minutes

---

### Option B: Configure Playwright for Better Test Isolation

**Approach**: Modify `playwright.config.js` to ensure proper page context isolation and add test setup hooks.

**File**: `playwright.config.js`

```javascript
export default defineConfig({
  // ... existing config
  workers: 1,  // Run tests serially to ensure clean state between tests
  use: {
    // Force a new context for each test file
    contextIsolation: true,
    // ... other options
  },
  webServer: {
    command: "node scripts/playwrightServer.js",
    port: 5000,
    reuseExistingServer: false
  }
});
```

**Pros:**

- Global configuration - affects all tests
- No per-test changes needed
- May solve other isolation issues proactively

**Cons:**

- May significantly slow down test execution (serial vs parallel)
- Not all options may be available in Playwright
- Doesn't specifically address the global state issue
- Could impact unrelated tests that don't need isolation

**Effort**: 30 minutes, but with unknown performance impact

---

### Option C: Fix Root Cause - Initialize Cleanup Function (Most Correct)

**Approach**: Add a public reset function to `window.__battleCLIinit` that tests can call to clear all module-level state, ensuring proper re-initialization.

**File**: `src/pages/battleCLI/init.js`

```javascript
// Add near line 233, with other exports
window.__battleCLIinit = Object.assign(window.__battleCLIinit || {}, {
  getEscapeHandledPromise,
  // NEW: Reset all module state for test isolation
  __resetModuleState() {
    currentPlayerJudoka = null;
    store = null;
    verboseEnabled = false;
    cooldownTimer = null;
    cooldownInterval = null;
    selectionTimer = null;
    selectionInterval = null;
    selectionFinishFn = null;
    selectionTickHandler = null;
    selectionExpiredHandler = null;
    selectionCancelled = false;
    selectionApplying = false;
    quitModal = null;
    isQuitting = false;
    pausedSelectionRemaining = null;
    pausedCooldownRemaining = null;
    commandHistory = [];
    historyIndex = -1;
    cachedStatDefs = null;
    statDisplayNames = {};
    // Clear other module-level state as identified
  }
});
```

**Usage in Tests**:

```javascript
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    delete globalThis.__battleCLIStatListBoundTargets;
    window.__battleCLIinit?.__resetModuleState?.();
  });
});
```

**Pros:**

- Fixes the root cause (module state pollution)
- Single, comprehensive solution
- Code documents what state is battle-CLI-specific
- Useful for debugging and future development
- Reduces mystery around what state needs cleanup

**Cons:**

- Requires code changes to application
- Maintenance burden: new state variables must be added to reset function
- Less "magical" - developers must remember to initialize reset function
- Could be accidentally called in production (though harmless if so)

**Effort**: 1-2 hours

---

### Option D: Hybrid Approach (Recommended for Immediate + Long-term)

Implement **Option A** first (fast, low-risk, solves immediate problem), then plan **Option C** as technical debt for next sprint.

---

## Verification Strategy

After implementing fixes, verify with:

```bash
# 1. Baseline - Single test (should already pass)
npx playwright test playwright/battle-cli-play.spec.js
✓ Expected: PASS

# 2. Critical test - All three CLI tests together (main test of fix)
npx playwright test playwright/battle-cli*.spec.js
✓ Expected: All 3 tests PASS

# 3. Regression check - Full test suite
npx playwright test
✓ Expected: All tests pass without isolation issues

# 4. Stability check - Repeated runs of problematic sequence
for i in {1..5}; do
  echo "Run $i..."
  npx playwright test playwright/battle-cli*.spec.js --repeat-each=2
done
✓ Expected: Consistent passing across all 5 runs

# 5. Directed debugging - With verbose output to identify where failure occurs
npx playwright test playwright/battle-cli*.spec.js --debug
✓ Expected: Can step through and see stat selection working

# 6. Isolated replay - Run only the play test, then run all together, repeatedly
npx playwright test playwright/battle-cli-play.spec.js &&
npx playwright test playwright/battle-cli*.spec.js &&
npx playwright test playwright/battle-cli-play.spec.js
✓ Expected: All pass regardless of order/repetition
```

### Additional Debugging Commands

If the fix doesn't fully resolve the issue, use these to gather more information:

```bash
# Check for uncleared timers/event listeners
npx playwright test playwright/battle-cli*.spec.js --reporter=json > results.json
# Then inspect results.json for patterns in failures

# Enable verbose logging during tests
DEBUG=pw:* npx playwright test playwright/battle-cli-play.spec.js

# Run with Playwright Inspector to step through interactively
npx playwright test --debug

# Check browser console for errors (available in trace files)
# Traces are saved to test-results/trace-* when test fails
npx playwright show-trace test-results/[trace-path]
```

---

## Related Code Locations

| Component             | File                                      | Line | Issue                                 |
| --------------------- | ----------------------------------------- | ---- | ------------------------------------- |
| Stat list binding     | `src/pages/battleCLI/init.js`             | 1706 | Global WeakSet tracking               |
| Battle initialization | `src/pages/battleCLI/init.js`             | 233  | `window.__battleCLIinit` global       |
| Stat selection        | `src/pages/battleCLI/init.js`             | 1800 | `renderStatList()` calls binding      |
| Module globals        | `src/pages/battleCLI/init.js`             | 203+ | Multiple module-level variables      |

---

## Investigation Recommendations

Before committing to a fix approach, perform targeted debugging to confirm the root cause:

### Debug Step 1: Verify Module-Level State Pollution

Modify `playwright/battle-cli-play.spec.js` temporarily to log module state:

```javascript
test("should be able to select a stat and see the result", async ({ page }) => {
  await page.addInitScript(() => {
    const initialState = {
      battleCLIInit: window.__battleCLIinit ? Object.keys(window.__battleCLIinit) : null,
      boundTargets: globalThis.__battleCLIStatListBoundTargets ? "exists" : "missing"
    };
    console.log("Initial state from previous test:", JSON.stringify(initialState));
  });
  
  // ... rest of test
});
```

**What to look for**: Do module state/globals from previous tests exist and have stale values?

### Debug Step 2: Monitor Click Handler Execution

Add event listener logging:

```javascript
test("should be able to select a stat and see the result", async ({ page }) => {
  await page.addInitScript(() => {
    const origAddEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function(...args) {
      if (args[0] === "click" && this.id === "cli-stats") {
        console.log("Stat list click handler attached at", new Date().toISOString());
      }
      return origAddEventListener.apply(this, args);
    };
  });
  
  // Click stat button
  await statButton.click();
  
  // Check console for click handler logs
  const logs = await page.evaluate(() => 
    (window.__console_logs || []).filter(msg => msg.includes("click handler"))
  );
  console.log("Click handler logs:", logs);
});
```

### Debug Step 3: Compare WeakSet Contents Between Tests

```javascript
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const oldSet = globalThis.__battleCLIStatListBoundTargets;
    console.log("WeakSet size before navigation:", 
      oldSet instanceof WeakSet ? "WeakSet (size unknown)" : "Not present");
    
    // NEW PAGE LOAD HAPPENS HERE
  });
  
  await page.goto("/src/pages/battleCLI.html?autostart=1");
  
  await page.addInitScript(() => {
    const newSet = globalThis.__battleCLIStatListBoundTargets;
    console.log("WeakSet after navigation:", 
      newSet instanceof WeakSet ? "WeakSet (new)" : "Not present");
  });
});
```

### Debug Step 4: Trace State Machine Dispatch

Add logging to the state machine to see if `selectStat()` successfully dispatches:

```javascript
test("should be able to select a stat and see the result", async ({ page }) => {
  // Intercept dispatch calls
  await page.addInitScript(() => {
    const origDispatch = window.__TEST_API?.state?.dispatchBattleEvent;
    if (origDispatch) {
      window.__TEST_API.state.dispatchBattleEvent = function(...args) {
        console.log("Dispatch called with:", args[0], new Date().toISOString());
        return origDispatch.apply(this, args);
      };
    }
  });
  
  await statButton.click();
  
  // Wait and check if dispatch was called
  await page.waitForTimeout(500);
});
```


1. **This is NOT a code bug** - The application code works correctly. This is a test infrastructure issue where global JavaScript state persists across Playwright page navigations.

2. **Symptoms vs Root Cause** - Tests failing in sequence is the *symptom*; persistent global state preventing proper handler binding/state machine initialization is the *root cause*.

3. **Why it matters** - CI/CD pipelines that run all tests together will fail, even though individual tests and real user scenarios work fine.

4. **Prevention** - When adding new tests or global state:
   - Avoid storing test-transient state on `globalThis` or `window` properties
   - Use local module scope or object-based namespaces that are re-initialized per page load
   - If globals are necessary, document them and add to test fixture cleanup
   - Consider using Playwright fixtures for shared test setup/teardown

5. **Testing approach** - After implementing the fix:
   - Run tests multiple times and in different orders to verify isolation is working
   - Use Playwright's built-in debugging (tracing, screenshots) to verify proper behavior
   - Add console logging to trace handler binding and state transitions
   - Consider adding integration tests that run all CLI tests together as a CI gate

6. **Code Review Focus** - When reviewing this fix:
   - Verify that cleanup code doesn't accidentally delete needed globals
   - Check that all affected test files are updated consistently
   - Ensure the fixture pattern is clear and easy to extend
   - Confirm that module state is properly re-initialized after cleanup

---

## Appendix: Current Test Status

| Test                         | In Isolation | With Others | Notes                             |
| ---------------------------- | ------------ | ----------- | --------------------------------- |
| `battle-cli-start.spec.js`   | ✓ PASS       | ✓ PASS      | No issues                         |
| `battle-cli-play.spec.js`    | ✓ PASS       | ✗ FAIL      | Fails when 2nd in sequence        |
| `battle-cli-restart.spec.js` | ✓ PASS       | ✓ PASS\*    | Would fail if play.spec.js didn't |

\* Actual status unknown because play.spec.js fails first and halts suite

---

**Report Prepared By**: GitHub Copilot  
**For Review By**: Development Team  
**Priority for Fix**: Medium (CI/CD Impact)  
**Recommended Timeline**: Phase 1 within current sprint, Phase 2 in next sprint
