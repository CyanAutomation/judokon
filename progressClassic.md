# Bug Investigation: Classic Battle Test Harness Mock Registration

## Executive Summary

**Status**: Investigation Complete. Root cause verified.

**Bug**: Multiple tests in `tests/classicBattle/resolution.test.js` are failing because mocks are not being correctly applied.

**Root Cause**: The test harness at `tests/helpers/integrationHarness.js` incorrectly calls `vi.resetModules()` _before_ it registers the mocks via `vi.doMock()`.

---

## Resolution: Superseded by Test Harness Refactoring

The root cause and the immediate fix identified in this document are correct. However, this simple fix has been **superseded by a more comprehensive test harness refactoring** designed to solve this entire class of problem and align our testing strategy with Vitest best practices.

The definitive, forward-looking implementation plan is now documented in **`progressHarness.md`**.

That plan includes not only correcting the operation order but also redesigning the harness to rely on top-level `vi.mock()` calls, which is a more robust and maintainable solution. The plan outlined below should be considered **outdated**.

---


### Step 1: Correct the Mock Registration Order

Modify the `setup` function in `tests/helpers/integrationHarness.js`.

**Current Code (Incorrect):**

```javascript
// in tests/helpers/integrationHarness.js

async function setup() {
  // 1. Reset modules to ensure clean state (WRONG ORDER)
  vi.resetModules();

  // 2. Apply mocks after reset (TOO LATE)
  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    // ... mock registration logic
  }
  // ... rest of setup
}
```

**Proposed Code (Correct):**

```javascript
// in tests/helpers/integrationHarness.js

async function setup() {
  // 1. Apply mocks FIRST
  // This queues the mocks to be used in the next import cycle.
  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    const resolvedPath = resolveMockModuleSpecifier(modulePath);
    mockRegistrar(resolvedPath, createMockFactory(mockImpl));
  }

  // 2. THEN, reset modules
  // This clears the module cache but preserves the queued mocks.
  vi.resetModules();

  // ... rest of setup proceeds as before
}
```

_Note: The debugging code that pushes to `globalThis.__registeredMockPaths` should also be moved along with the mock registration loop._

### Step 2: Verify the Fix

After applying the change, run the affected test file to confirm the fix.

```bash
npx vitest run tests/classicBattle/resolution.test.js
```

All four previously failing tests should now pass.

### Step 3: Run Regression Tests

Ensure the change has not introduced any side effects in other parts of the test suite.

```bash
npm run test:battles
```

All battle-related tests should continue to pass.

---

## Files to Modify

- **`tests/helpers/integrationHarness.js`**: Reorder the mock registration loop and the `vi.resetModules()` call within the `setup` function.
