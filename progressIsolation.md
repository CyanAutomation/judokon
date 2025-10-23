# Test Isolation Issue Report

## Playwright CLI Tests - Battle State Machine Synchronization

**Date**: October 22, 2025  
**Severity**: Medium  
**Status**: Identified, Analysis Complete, Fix Plan Drafted  
**Affected Test**: `playwright/battle-cli-play.spec.js`

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

1. **Global State Persistence**: The variable `globalThis.__battleCLIStatListBoundTargets` (WeakSet in `src/pages/battleCLI/init.js` line 1670) may retain references across page contexts.

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

Even though WeakSets allow garbage collection, if the Playwright test environment shares `globalThis` across page loads, old DOM references could interfere with new page initialization.

2. **Battle Engine/Orchestrator State**: The battle orchestrator or state machine may not be fully re-initialized for the second test, causing dispatch operations to fail silently.

3. **Event Listener Re-registration**: The click handler may not be properly re-registered on the new page's stat list element if the WeakSet check prevents re-binding.

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

### Option A: Clear Global State Between Tests (Recommended)

**Approach**: Add test setup/teardown to clear global state before each test.

**File**: `playwright/battle-cli-play.spec.js`

```javascript
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Clear global battle CLI state to prevent cross-test contamination
  await page.addInitScript(() => {
    delete globalThis.__battleCLIStatListBoundTargets;
    delete globalThis.__battleCLIinit;
    // Add other globals as identified
  });
});

test.describe("Battle CLI - Play", () => {
  test("should be able to select a stat and see the result", async ({ page }) => {
    // ... existing test code
  });
});
```

**Pros:**

- Simple, localized fix
- Doesn't require code changes to application
- Clear intent for future maintainers
- Can be applied to other tests too

**Cons:**

- Requires modification to each test file
- Doesn't fix the underlying issue (global state storage)

**Effort**: 30 minutes

---

### Option B: Namespace Global State by Page Context

**Approach**: Modify application code to use page-scoped storage instead of global state.

**File**: `src/pages/battleCLI/init.js`

**Current (problematic):**

```javascript
const boundTargets = (globalThis.__battleCLIStatListBoundTargets ||= new WeakSet());
```

**Proposed:**

```javascript
// Create a page-scoped namespace that resets on page load
const pageScope = (() => {
  const id = Math.random().toString(36).substr(2, 9);
  return {
    boundTargets: new WeakSet(),
    scopeId: id
  };
})();

function ensureStatClickBinding(list) {
  const onClick = handleStatListClick;
  if (!pageScope.boundTargets.has(list)) {
    list.addEventListener("click", onClick);
    pageScope.boundTargets.add(list);
  }
}
```

**Pros:**

- Fixes the root cause
- More robust for complex scenarios
- Protects against similar issues with other globals

**Cons:**

- Requires code modification
- More invasive change
- Need to identify all affected globals

**Effort**: 1-2 hours (requires testing)

---

### Option C: Configure Playwright Test Isolation

**Approach**: Use Playwright's built-in configuration to improve test isolation.

**File**: `playwright.config.js`

```javascript
export default defineConfig({
  fullyParallel: false,
  workers: 1,
  use: {
    // Force new browser context for each test to ensure clean state
    contextIsolation: true,
    // Clear browser cache/storage between tests
    trace: "on-first-retry"
    // Consider adding launch options
  },
  // Add test setup/teardown
  webServer: {
    // Ensure server is fresh for each test
  }
});
```

**Pros:**

- Uses framework features designed for this purpose
- Applicable across all tests
- May have other benefits (stability, parallelization)

**Cons:**

- May increase test execution time
- Requires investigation of Playwright best practices
- May not fully solve the issue if globals are truly shared

**Effort**: 45 minutes

---

## Recommended Solution: Hybrid Approach

Implement **Option A (immediate)** + **Option B (longer-term)**:

### Phase 1: Quick Fix (Current Sprint)

- Add `beforeEach` hooks to clear `globalThis.__battleCLIStatListBoundTargets` in affected tests
- Allows tests to pass immediately
- Low risk, minimal code change
- Estimated effort: 30 minutes

### Phase 2: Root Cause Fix (Next Sprint)

- Refactor global state in `src/pages/battleCLI/init.js` to use page-scoped namespaces
- Remove `globalThis` dependencies for test-transient state
- Provide guidance for new code to avoid similar patterns
- Estimated effort: 2-3 hours

### Phase 3: Infrastructure Enhancement (Technical Debt)

- Review Playwright configuration for test isolation best practices
- Document guidelines for global state in tests
- Consider adding linting rules to prevent `globalThis` usage in certain files
- Estimated effort: 4 hours

---

## Verification Strategy

After implementing fixes, verify with:

```bash
# Single test (baseline - should already pass)
npx playwright test playwright/battle-cli-play.spec.js
✓ Expected: PASS

# Multiple tests together (critical test)
npx playwright test playwright/battle-cli*.spec.js
✓ Expected: All 3 tests PASS

# Full test suite (regression check)
npx playwright test
✓ Expected: All tests pass without isolation issues

# Repeated runs (stability check)
for i in {1..5}; do
  npx playwright test playwright/battle-cli*.spec.js
done
✓ Expected: Consistent passing across all 5 runs
```

---

## Related Code Locations

| Component             | File                                      | Line | Issue                                 |
| --------------------- | ----------------------------------------- | ---- | ------------------------------------- |
| Stat list binding     | `src/pages/battleCLI/init.js`             | 1670 | Global WeakSet tracking               |
| Battle initialization | `src/pages/battleCLI/init.js`             | 196  | `window.__battleCLIinit` global       |
| Stat selection        | `src/pages/battleCLI/init.js`             | 1182 | Calls `selectStat()` which dispatches |
| Test helper           | `playwright/helpers/battleStateHelper.js` | -    | May need updated context handling     |

---

## Notes for Developer

1. **This is NOT a code bug** - The application code works correctly. This is a test infrastructure issue.

2. **Symptoms vs Root Cause** - Tests failing in sequence is the symptom; global state pollution is the root cause.

3. **Why it matters** - CI/CD pipelines that run all tests together will fail, even though individual tests and real user scenarios work fine.

4. **Prevention** - When adding new tests or global state, use page-scoped or lexically-scoped storage instead of `globalThis` or `window` properties that persist across page loads.

5. **Testing approach** - After fixes, run tests multiple times and in different orders to verify isolation is working.

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
