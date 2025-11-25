# Bug Investigation: Classic Battle Test Harness Mock Registration

## Executive Summary

**Status**: Investigation Complete. Root cause verified. Ready for implementation.

**Bug**: Multiple tests in `tests/classicBattle/resolution.test.js` are failing because mocks are not being correctly applied. This causes tests to run against real module implementations instead of the intended mocks, leading to failures.

**Root Cause**: The test harness at `tests/helpers/integrationHarness.js` incorrectly calls `vi.resetModules()` *before* it registers the mocks via `vi.doMock()`. According to Vitest's design, mocks must be queued *before* the module cache is reset. The current order clears the module cache, and then queues mocks that are never used because the subsequent module imports load the original, non-mocked versions.

**Solution**: Reorder the operations in the `setup()` function within `createIntegrationHarness`. The mock registration loop must be executed **before** `vi.resetModules()` is called.

---

## Proposed Fix Plan

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

*Note: The debugging code that pushes to `globalThis.__registeredMockPaths` should also be moved along with the mock registration loop.*

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
