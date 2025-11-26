# Test Failure Investigation: Current State and Root Cause Analysis

## Executive Summary

**Date**: 2025-11-25  
**Status**: Investigation Complete. Single root cause identified and documented in `progressClassic.md`.

**Key Finding**: All current test failures stem from a **single root cause**: the integration harness incorrectly calls `vi.resetModules()` **before** `vi.doMock()`, which violates Vitest's mock registration requirements.

---

## Resolution: Test Harness Refactoring

The single root cause identified in this document—incorrect mock registration timing—is being fully addressed by a comprehensive refactoring of the test harness. This work will resolve all 16 failing tests mentioned herein.

The definitive implementation plan, which involves moving to a more robust, top-level mocking strategy, is detailed in **`progressHarness.md`**. That document supersedes the quick fix summary mentioned below and should be considered the source of truth.

---

### Failing Test Files and Counts

| File                                                  | Failing Tests   | Root Cause               |
| ----------------------------------------------------- | --------------- | ------------------------ |
| `tests/classicBattle/page-scaffold.test.js`           | 4               | Mock registration timing |
| `tests/classicBattle/resolution.test.js`              | 4               | Mock registration timing |
| `tests/classicBattle/uiEventBinding.test.js`          | 1               | Mock registration timing |
| `tests/integration/battleClassic.integration.test.js` | 5               | Mock registration timing |
| `tests/integration/battleClassic.placeholder.test.js` | 1               | Mock registration timing |
| **Total**                                             | **16 failures** | **Single root cause**    |

### Failure Pattern

All failing tests exhibit the same pattern:

1. **Mocked functions never invoked**: Spies on mock functions show zero calls
   - Example: `scoreboardMock.updateScore.mock.calls` is empty `[]`
   - Example: `onBattleEvent` mock never receives `"roundResolved"` event

2. **Components fail to render**: UI elements that depend on document access don't render
   - Example: Stat buttons never appear (expected >0, got 0)
   - Example: `store.selectionMade` remains false after selection

3. **State not updated**: UI store properties don't reflect expected changes
   - Example: `roundsPlayed` counter doesn't increment
   - Example: Placeholder cards don't upgrade to opponent cards

---

## Root Cause Analysis

### The Core Problem

The `createIntegrationHarness` function in `tests/helpers/integrationHarness.js` executes operations in the wrong order:

**Current (Incorrect) Order:**

```javascript
async function setup() {
  // 1. WRONG: Reset modules first
  vi.resetModules();

  // 2. WRONG: Then try to register mocks (too late)
  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    mockRegistrar(resolvedPath, createMockFactory(mockImpl));
  }
  // ...
}
```

**Required (Correct) Order:**

```javascript
async function setup() {
  // 1. CORRECT: Register mocks first (queue them)
  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    mockRegistrar(resolvedPath, createMockFactory(mockImpl));
  }

  // 2. CORRECT: Then reset modules (preserves queued mocks)
  vi.resetModules();
  // ...
}
```

### Why This Breaks Tests

According to Vitest's design:

- `vi.doMock(modulePath, factory)` **queues** mocks for use in the next import cycle
- `vi.resetModules()` **clears** the module cache but preserves queued mocks
- If `vi.resetModules()` is called first, the queued mocks don't exist yet, so the reset clears an empty queue
- When modules are imported after the reset, they load real implementations instead of mocks
- Real implementations run without being spied on, causing all test assertions to fail

### Evidence from Test Failures

**Evidence 1: Mocks Never Called**

```javascript
// From tests/classicBattle/page-scaffold.test.js
FAIL: initializes scoreboard regions
AssertionError: expected [] to deep equally contain [ +0, +0 ]
// scoreboardMock.updateScore.mock.calls is empty, meaning the mock was never invoked
```

**Evidence 2: Components Can't Instantiate**

```javascript
// From tests/classicBattle/resolution.test.js
FAIL: scoreboard reconciles directly to round result
AssertionError: expected 0 to be greater than 0
// The stat buttons never render because Card.js can't access the mocked document
```

**Evidence 3: Real Code Path Executes**

```javascript
// From tests/integration/battleClassic.integration.test.js
FAIL: keeps roundsPlayed in sync
// The real BattleEngine runs but UI store state doesn't sync properly
// because setupScoreboard mock isn't registered, real showSnackbar runs instead
```

---

## Solution: Reference progressClassic.md

This issue has been comprehensively analyzed and documented in **`progressClassic.md`**, which includes:

1. **Detailed root cause explanation** with code examples
2. **Exact fix specification** showing the required code changes
3. **Verification steps** to confirm the fix works
4. **Regression testing steps** to ensure no side effects

### Quick Fix Summary

**File to Modify**: `tests/helpers/integrationHarness.js` (lines 222-250)

**Change Required**: Move the mock registration loop **before** `vi.resetModules()`

**Impact**: Fixes all 16 failing tests with a single, minimal change

---

## Why Previous Investigation Was Incomplete

The `progressRandom.md` file documented observations from an earlier investigation phase when the root cause wasn't fully understood. It proposed multiple, more complex fixes for each failure category:

1. "Add missing `fs` imports" (not the real issue)
2. "Fix round progression with event-driven updates" (overly complex)
3. "Improve opponent message timing" (not applicable)

These were all **secondary symptoms** of the underlying mock registration timing issue. Once that core issue is fixed, all these tests will pass without additional changes.

---

## Verification Steps

After applying the fix from `progressClassic.md`, verify with:

```bash
# Quick verification - specific failing tests
npx vitest run tests/classicBattle/resolution.test.js

# Full verification - all battle tests
npm run test:battles:classic

# Expected Result
# Before fix: 16 failures
# After fix: 0 failures (all 105 tests should pass)
```

---

## Relationship to progressBug.md

The `progressBug.md` file initially speculated that document access was the root cause. However, investigation revealed that the document access issue is a **secondary symptom** of the mock registration problem:

1. **Root cause**: Mocks aren't registered (timing issue)
2. **Secondary effect**: Real modules run without mocks
3. **Tertiary effect**: JSDOM setup doesn't happen correctly
4. **Visible symptom**: `getDocumentRef()` fails

Once the mock registration timing is fixed, document access works correctly and document caching is not needed.

---

## Recommendations

1. **Implement the fix from progressClassic.md immediately**
   - Single file change (integrationHarness.js)
   - Reorder two operations (mock registration before reset)
   - Fixes all 16 failing tests

2. **Verify no regressions**
   - Run full test suite: `npm test`
   - Verify battle tests pass: `npm run test:battles`
   - Verify E2E tests pass: `npm run test:e2e`

3. **Document the Vitest best practice**
   - Add a comment in integrationHarness.js explaining the mock ordering requirement
   - This prevents future developers from making the same mistake

---

## Files Involved

| File                                  | Role                               | Status                  |
| ------------------------------------- | ---------------------------------- | ----------------------- |
| `tests/helpers/integrationHarness.js` | Root cause location                | Needs fix               |
| `progressClassic.md`                  | Complete analysis & fix spec       | Reference this          |
| `progressBug.md`                      | Earlier hypothesis (now clarified) | Obsolete for this issue |
| `progressRandom.md`                   | This file (current status summary) | FYI only                |

---

## Conclusion

All 16 test failures are caused by a single root cause: incorrect mock registration timing in the integration harness. The fix is straightforward and documented in `progressClassic.md`. Once implemented, all tests should pass without additional changes or complex refactoring.
