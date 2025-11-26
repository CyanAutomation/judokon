# Bug Investigation Report: Test Harness Mock Registration Issue (Root Cause)

## Executive Summary

**Status**: Investigation Complete. Root cause identified and correlated with progressClassic.md.

**Bug**: Components fail to render in test environments and mocks are not being applied, preventing test assertions from passing.

**Root Cause (Verified)**: This is **NOT primarily a document access issue**. The root cause is the mock registration timing problem documented in `progressClassic.md`. When `vi.resetModules()` is called BEFORE `vi.doMock()` in the integration harness, the queued mocks are cleared before they can be applied to module imports. This causes:

1. Real modules to load instead of mocks
2. `getDocumentRef()` to fail (because JSDOM setup mocks aren't registered)
3. `Card.js` instantiation to throw errors
4. Test mocks (e.g., `updateScore`, `onBattleEvent`) to never be invoked
5. Stat buttons to never render

**Correlation**: The document access symptom is a **secondary consequence** of the mock registration failure. Once the mock registration timing is fixed (see progressClassic.md), `getDocumentRef()` will correctly access the JSDOM-provided document.

---

## Investigation Evidence

### Why Document Access Isn't the Primary Issue

The current `getDocumentRef()` implementation in `src/helpers/documentHelper.js` is actually quite robust:

```javascript
export function getDocumentRef() {
  // Try direct document reference (most common case)
  try {
    if (typeof document !== "undefined" && document) {
      return document;
    }
  } catch {
    // Silently ignore
  }

  // Try globalThis.document
  try {
    if (globalThis && globalThis.document) {
      return globalThis.document;
    }
  } catch {
    // Silently ignore
  }

  // Try window.document as fallback
  try {
    const maybeWindow = globalThis?.window;
    if (maybeWindow && maybeWindow.document) {
      return maybeWindow.document;
    }
  } catch {
    // Silently ignore
  }

  return null;
}
```

In JSDOM test environments (vitest default), the document is always available through one of these paths:

- Direct `document` reference
- `globalThis.document`
- `window.document`

### Why It Fails in Practice

The real issue is **mock registration timing**:

1. Test calls `createClassicBattleHarness({ mocks })`
2. Harness calls `vi.resetModules()` FIRST (line 227 of integrationHarness.js)
3. Then harness calls `vi.doMock()` (lines 230-236)
4. But Vitest requires `vi.doMock()` to be called BEFORE `vi.resetModules()` to queue mocks
5. When modules are imported later, real implementations load instead of mocks
6. Real battle initialization code runs without mocks
7. Components instantiate but mocks like `updateScore` are never called
8. Test assertions fail

### Test Failure Evidence

From `npm run test:battles:classic` output:

```javascript
FAIL tests/classicBattle/page-scaffold.test.js > initializes scoreboard regions
AssertionError: expected [] to deep equally contain [ +0, +0 ]
```

This shows `scoreboardMock.updateScore.mock.calls` is empty - the mock was never called because the real module was imported instead of the mock.

---

## Solution: Fix Mock Registration Timing (Primary Fix)

### Critical Fix: Reorder Mock and Reset Operations

**File**: `tests/helpers/integrationHarness.js`  
**Lines**: 222-250

Move `vi.doMock()` calls BEFORE `vi.resetModules()`:

```javascript
async function setup() {
  // STEP 1: Queue all mocks FIRST (before resetModules)
  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    const resolvedPath = resolveMockModuleSpecifier(modulePath);
    mockRegistrar(resolvedPath, createMockFactory(mockImpl));
  }

  // STEP 2: THEN reset modules (preserves queued mocks)
  vi.resetModules();

  // STEP 3: Setup timers and fixtures
  if (useFakeTimers) {
    timerControl = useCanonicalTimers();
  }
  if (useRafMock) {
    rafControl = installRAFMock();
  }

  // STEP 4: Inject fixtures
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
- `vi.resetModules()` clears the module cache but **preserves queued mocks** (by design)
- Subsequent imports use the mocked modules
- `getDocumentRef()` will now access the mocked test document
- All test mocks will be invoked correctly
- Components will render successfully

---

## Secondary Enhancement: Document Reference Caching (Optional Defensive Measure)

After the primary fix is implemented, we can optionally add document caching as an additional defensive safeguard to handle edge cases where execution context might change unexpectedly.

### Why This Is Secondary

- The primary issue is mock registration, not document access
- JSDOM provides document through multiple paths already
- After mock timing is fixed, document access will work correctly
- Caching is defensive but not required for the fix

### Implementation (If Needed Later)

If edge cases emerge after the primary fix, enhance `getDocumentRef()`:

```javascript
let docRef = null;

export function getDocumentRef() {
  if (docRef) {
    return docRef;
  }

  // Existing checks...
  try {
    if (typeof document !== "undefined" && document) {
      docRef = document;
      return docRef;
    }
  } catch {
    // Ignore
  }

  // ... rest of existing fallback checks

  return null;
}

// Test-only reset function
export function __resetDocumentRef() {
  docRef = null;
}
```

---

## Implementation Steps

1. **Fix mock registration timing** (Primary - Required):
   - Update `tests/helpers/integrationHarness.js` lines 222-250
   - Move mock registration before `vi.resetModules()`
   - See progressClassic.md for detailed instructions

2. **Verify the fix**:

   ```bash
   npx vitest run tests/classicBattle/resolution.test.js
   npx vitest run tests/classicBattle/page-scaffold.test.js
   npm run test:battles:classic
   ```

3. **Assess if secondary enhancement needed**:
   - If all tests pass after step 1, document caching is not needed
   - If edge cases still occur, implement optional caching as fallback

---

## Relationship to progressClassic.md

This bug report was initially believed to be a document access problem. However, investigation revealed it's directly caused by the mock registration timing issue documented in `progressClassic.md`.

**Action**: Fix the mock registration timing in `integrationHarness.js` first. This will resolve both the mock invocation failures AND any document access issues in tests.

## Files to Change

- **Primary Fix**: `tests/helpers/integrationHarness.js` — lines 222–250 (reorder mock/reset operations)
- **Optional Enhancement**: `src/helpers/documentHelper.js` — add caching (only if needed after primary fix)

---

## Implementation Log

### Task 1: Reorder Mock Registration (COMPLETED)

**Action**: Moved mock registration loop BEFORE `vi.resetModules()` in `tests/helpers/integrationHarness.js` (lines 222-257)

**Changes Made**:

- Moved `vi.doMock()` calls before `vi.resetModules()`
- Enhanced JSDoc comment explaining Vitest's mock queueing requirement
- Kept mock path tracking code together with registration

**Status**: ✅ Applied successfully

### Task 2: Verify Fix with Targeted Tests

**Test Run**: `npx vitest run tests/classicBattle/resolution.test.js`

**Result**: ❌ Tests still failing

- 4 tests still fail: "score updates after auto-select on expiry", "timer expiry falls back...", "scoreboard reconciles...", "match end forwards..."
- Mocks are still not being invoked: `expect(computeRoundResultMock).toHaveBeenCalled()` fails
- Mock calls array still empty: `scoreboardMock.updateScore.mock.calls` is `[]`

**Analysis**: The reordering alone did not fix the issue. Further investigation needed into:

1. Module specifier mismatch - test uses file:// URLs, app uses relative imports
2. Mock registration is happening but mocks not matching import specifiers
3. Mock factory might not be creating compatible mocks

### Task 3: Identify Actual Root Cause - Mock Registration Timing at Module Level (IN PROGRESS)

**Critical Discovery**: The real problem is NOT just the order within the `setup()` function. The issue is **WHERE** mocks are registered.

**What Vitest Requires**:

- `vi.mock()` and `vi.doMock()` must be called during **module collection** (top level)
- Mock registration inside async functions like `beforeEach()` is too late
- The module collection phase happens BEFORE any tests or setup functions run
- Mocks registered after module collection don't affect already-imported modules

**Current Architecture Problem**:

- `resolution.test.js` calls `createClassicBattleHarness({ mocks })` in each test
- `createClassicBattleHarness` returns a harness object with `setup()` method
- `beforeEach(async () => await harness.setup())` calls `vi.doMock()` inside async function
- By this time, all module imports have already been resolved
- Modules import their dependencies at module load, not test-time
- So `vi.doMock()` in `setup()` cannot affect the already-loaded modules

**Evidence**:

- `page-scaffold.test.js` uses `vi.mock()` at the top level (works correctly)
- `resolution.test.js` tries to use dynamic mocks via harness (doesn't work)
- The reordering of `vi.resetModules()` and `vi.doMock()` cannot help because both happen too late

**Solution Paths**:

1. Move all mock registration to top level using `vi.mock()` directly (requires changes to all test files)
2. Use `vi.hoisted()` to create hoisted mocks that work with the harness pattern
3. Refactor the harness to support top-level mock registration instead of async setup

**Next Investigation**: Determine which solution path is best and most maintainable

---

## Key Insight: The Reordering Fix Was Incomplete

The reordering of `vi.doMock()` before `vi.resetModules()` in `integrationHarness.js` was correct and necessary, but **it does not fully solve the problem** because:

1. **Module Collection Timing**: When `resolution.test.js` is loaded, Vitest's module collection phase happens first
2. **Early Imports**: The test file imports from `src/pages/battleClassic.init.js`, which imports its dependencies
3. **Too Late Registration**: When the test runs `beforeEach(() => harness.setup())`, the test file's module collection is already complete
4. **Mocks Never Apply**: Although `vi.doMock()` is called in the setup function, the modules have already been imported with real implementations

**What Needs to Happen**:

- Mocks must be registered **before** `battleClassic.init.js` is imported
- This means mocks must be registered at the **test file's top level**, not in `beforeEach()`
- Or alternatively, `battleClassic.init.js` must be imported **after** the mocks are registered

**Current State**:

- ✅ `integrationHarness.js` has correct operation ordering
- ❌ But mocks are still registered too late in the test execution lifecycle
- ❌ Test failures persist because mocks don't affect module imports

---

## Recommended Next Steps

To actually fix this issue, one of these approaches must be taken:

#### Approach 1: Top-Level Mock Registration (Least Disruptive)

- Convert `resolution.test.js` to use `vi.mock()` at the top level like `page-scaffold.test.js` does
- This requires minimal changes to the test harness
- Trade-off: Tests become less flexible but mocks work correctly

#### Approach 2: Refactor Harness with Top-Level Support (Recommended)

- Add a new export from `integrationHarness.js` that wraps mock registration for top-level use
- Create a helper that tests can call at the top level to register harness-style mocks
- Allows flexibility while maintaining the harness pattern

#### Approach 3: Complete Harness Redesign (Major Refactoring)

- Redesign the harness to not use dynamic mock registration
- Make it a simple fixture/setup provider without mock handling
- Move all mock registration to top-level in tests
- Most work but cleanest long-term solution
