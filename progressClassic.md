# Classic Battle Test Harness: Mock Registration Bug

## Status

- Running `npx vitest run tests/classicBattle/resolution.test.js` reports four failing tests: `score updates after auto-select on expiry`, `timer expiry falls back to store stats when DOM is obscured`, `scoreboard reconciles directly to round result`, and `match end forwards outcome to end modal`.
- **Root cause verified**: Mocks are being discarded due to incorrect timing with `vi.resetModules()`.
- Symptoms: mocked `computeRoundResult` never invoked, stat buttons never render, `roundResolved` handler never registered.

## Root Cause Analysis (Verified)

### The Problem: Mock Registration Timing

Vitest's mock system requires a strict ordering:

1. Call `vi.doMock(modulePath, factory)` to queue mocks for the next import cycle
2. Call `vi.resetModules()` to clear the module cache (preserving queued mocks)
3. Import the module — it will use the mocked version

The current harness violates this order:

- **Line 227 in integrationHarness.js**: calls `vi.resetModules()` first
- **Lines 230-236**: then calls `mockRegistrar()` (which is `vi.doMock()`)
- When modules are imported later, they use the real implementations instead of mocks

### Evidence

1. Test output shows `computeRoundResultMock` never called (spy was created but never invoked)
2. The DOM query `document.querySelectorAll("#stat-buttons button[data-stat]")` returns 0 buttons — stat rendering is not triggered
3. The `onBattleEvent` mock never receives any calls with `"roundResolved"` event
4. All point to real runtime code executing: `beginSelectionTimer()` skips the Vitest branch, `computeRoundResult` is never called
5. Test has `globalThis.__TEST__ = true` and `process.env.VITEST = "true"` set correctly, confirming mocks would work if registered in time

### Why This Matters

When `vi.resetModules()` is called:

- **Before queuing mocks**: The reset clears any mocks that were queued, leaving real modules in place for the next import
- **After queuing mocks**: The queued mocks survive the reset and are applied to the next import

Current code does the former (reset, then mock), but needs the latter (mock, then reset).

## Solution: Reorder Mock and Reset Operations

### Approach

Restructure `integrationHarness.js` to apply mocks **before** calling `vi.resetModules()`:

```javascript
async function setup() {
  // 1. Queue all mocks FIRST
  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    const resolvedPath = resolveMockModuleSpecifier(modulePath);
    mockRegistrar(resolvedPath, createMockFactory(mockImpl));
  }

  // 2. THEN reset modules (preserves queued mocks)
  vi.resetModules();

  // 3. Setup timers and fixtures
  if (useFakeTimers) {
    timerControl = useCanonicalTimers();
  }
  if (useRafMock) {
    rafControl = installRAFMock();
  }
  
  // 4. Inject fixtures
  for (const [key, value] of Object.entries(fixtures)) {
    injectFixture(key, value);
  }

  if (customSetup) {
    await customSetup();
  }
}
```

### Why This Works

- Vitest queues mocks internally when `vi.doMock()` is called
- `vi.resetModules()` clears the module registry but **preserves queued mocks** (by design)
- Subsequent imports use the mocked modules
- Test mocks passed via `createClassicBattleHarness({ mocks })` are registered at the right time

## Implementation Steps

1. **Update `integrationHarness.js`** (lines 222–250):
   - Move the mock registration loop **before** `vi.resetModules()`
   - Keep all else the same

2. **Verify the fix**:

   ```bash
   npx vitest run tests/classicBattle/resolution.test.js
   ```

   Expected: All four tests pass
   - `computeRoundResultMock` is called
   - Stat buttons render successfully
   - `roundResolved` handler is registered

3. **Verify no regressions** in other tests:

   ```bash
   npm run test:battles
   ```

## Files to Change

- `tests/helpers/integrationHarness.js` — lines 222–250 (reorder mock/reset operations)
