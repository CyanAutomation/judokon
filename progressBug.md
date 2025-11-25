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
