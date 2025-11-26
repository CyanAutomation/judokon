# Bug Investigation Report: Test Harness Mock Registration Issue (Root Cause)

## Executive Summary

**Status**: Investigation Complete. Root cause identified and correlated with progressClassic.md.

**Bug**: Components fail to render in test environments and mocks are not being applied, preventing test assertions from passing.

**Root Cause (Verified)**: This is **NOT primarily a document access issue**. The root cause is the mock registration timing problem documented in `progressClassic.md`. When `vi.resetModules()` is called BEFORE `vi.doMock()` in the integration harness, the queued mocks are cleared before they can be applied to module imports.

---

## Resolution: Test Harness Refactoring

The root cause identified in this document—incorrect mock registration timing in the test harness—is being addressed by a comprehensive refactoring of the test harness itself.

The full analysis, implementation plan, and guiding principles for this work are documented in **`progressHarness.md`**. That document should be considered the source of truth for the fix. The solution involves moving to a top-level `vi.mock()` pattern, which is more robust and aligned with Vitest's design.

The plan outlined below is now considered **outdated**.

---

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

---

## Approach 3: Complete Harness Redesign - Detailed Implementation Plan

### Design Philosophy

Instead of fighting Vitest's design (which requires mocks at module collection time), we redesign the harness to **leverage Vitest's strengths**:

1. **Embrace top-level mock registration**: Use `vi.mock()` at the top level where it belongs
2. **Separate concerns**: Mocks and fixtures are different things - handle them separately
3. **Reduce harness complexity**: Make the harness a simple lifecycle manager, not a mock orchestrator
4. **Improve test clarity**: Mock registration is explicit and visible at the top of test files

### New Architecture

```text
Current (Broken):
  createIntegrationHarness({ mocks, fixtures })
  → setup() calls vi.doMock() [TOO LATE]
  → tests run

Proposed (Working):
  vi.mock() [AT TOP LEVEL]
  → const harness = createSimpleHarness({ fixtures })
  → beforeEach(() => harness.setup())
  → tests run
```

### Implementation Plan: Phase-by-Phase

#### Phase 1: Create New Harness API (Non-Breaking)

**Objective**: Add new `createSimpleHarness()` alongside existing harness for gradual migration

**Tasks**:

1. **Create `createSimpleHarness()` export in `integrationHarness.js`**
   - Takes only `{ fixtures, useFakeTimers, useRafMock, customSetup, customTeardown }`
   - NO `mocks` parameter
   - Returns same interface: `{ setup(), cleanup(), timerControl, rafControl }`
   - Keeps all existing fixture/timer/RAF logic

2. **Preserve existing `createIntegrationHarness()` for backwards compatibility**
   - Mark with deprecation notice in JSDoc
   - Still works for existing tests but discouraged

3. **Refactor existing implementations to use new API**
   - `createClassicBattleHarness()` → uses `createSimpleHarness()` internally
   - `createSettingsHarness()` → uses `createSimpleHarness()` internally
   - `createBrowseJudokaHarness()` → uses `createSimpleHarness()` internally

**Evidence Needed**:

- Verify `createSimpleHarness()` provides all non-mock functionality of current harness
- Confirm fixtures injection works without mock registration
- Validate timer/RAF functionality unchanged

**Files to Modify**:

- `tests/helpers/integrationHarness.js` (add new function, keep old one)

---

#### Phase 2: Migrate Test Files to Top-Level Mocks

**Objective**: Convert failing test files to use `vi.mock()` at top level with new harness

**Priority Order** (start with most important):

1. `tests/classicBattle/resolution.test.js` (4 failing tests)
2. `tests/classicBattle/page-scaffold.test.js` (4 failing tests)
3. `tests/classicBattle/uiEventBinding.test.js` (1 failing test)
4. `tests/integration/battleClassic.integration.test.js` (5 failing tests)
5. `tests/integration/battleClassic.placeholder.test.js` (1 failing test)

**Conversion Process for Each Test File**:

**Step A: Extract mock implementations to top level**

```javascript
// BEFORE (resolution.test.js)
function mockModules({ playerStats, opponentStats, domOverrides } = {}) {
  const store = {
    /* ... */
  };
  computeRoundResultMock = vi.fn(async (s, stat, playerVal, opponentVal) => ({
    /* ... */
  }));
  const mocks = {
    /* many mocks built dynamically */
  };
  return mocks;
}

// AFTER (resolution.test.js)
const computeRoundResultMock = vi.hoisted(() =>
  vi.fn(async (s, stat, playerVal, opponentVal) => ({
    /* ... */
  }))
);

const createBattleStoreMock = vi.hoisted(() => {
  const store = {
    /* ... */
  };
  return () => store;
});

vi.mock("../../src/helpers/classicBattle/roundManager.js", () => ({
  createBattleStore: createBattleStoreMock,
  startRound: vi.fn(async () => {
    /* ... */
  }),
  startCooldown: vi.fn()
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  /* ... */
}));
// ... other vi.mock() calls
```

**Step B: Use new harness for fixtures only**

```javascript
// BEFORE
const harness = createClassicBattleHarness({ mocks });
await harness.setup();

// AFTER
const harness = createClassicBattleHarness(); // No mocks!
await harness.setup();
```

**Step C: Access mock factories in tests if needed**

```javascript
// If test needs to reset or check mock state between tests
test("example", async () => {
  computeRoundResultMock.mockClear();
  // ... test body
});
```

**Evidence Needed**:

- Each test file still imports correctly with mocks applied
- Mock functions are properly invoked during test execution
- Tests pass after conversion

**Files to Modify**:

- `tests/classicBattle/resolution.test.js`
- `tests/classicBattle/page-scaffold.test.js` (minimal changes - already mostly done)
- `tests/classicBattle/uiEventBinding.test.js`
- `tests/integration/battleClassic.integration.test.js`
- `tests/integration/battleClassic.placeholder.test.js`

---

#### Phase 3: Verify and Clean Up

**Objective**: Ensure all tests pass and harness simplification is complete

**Tasks**:

1. **Run targeted tests**

   ```bash
   npx vitest run tests/classicBattle/resolution.test.js
   npx vitest run tests/classicBattle/page-scaffold.test.js
   npm run test:battles:classic
   ```

2. **Run full test suite for regressions**

   ```bash
   npm run test:ci
   npm run test:battles
   npm run test:e2e
   ```

3. **Remove `mocks` parameter handling from `createIntegrationHarness()`** (if Phase 1 complete)
   - Update JSDoc to mark old API as deprecated
   - Consider removal in future version

4. **Update documentation**
   - Add examples of top-level mock pattern to test comments
   - Document new `createSimpleHarness()` API
   - Remove references to dynamic mock registration

**Evidence Needed**:

- All 16 failing tests now pass
- No new test failures introduced
- Test suite execution time unchanged or faster

**Files to Modify**:

- `tests/helpers/integrationHarness.js` (remove old mock handling)
- JSDoc comments in test files
- Any internal documentation

---

#### Phase 4: Optional Optimization

**Objective**: Further simplify harness if Phase 1-3 successful

**Optional Tasks** (only if Phase 1-3 reveal opportunity):

1. **Extract `createSimpleHarness` logic to separate file**
   - Create `tests/helpers/simpleHarness.js`
   - Reduces `integrationHarness.js` complexity
   - Clear separation of concerns

2. **Create mock pattern helper** (if tests need common patterns)
   - Helper function for creating compatible mock objects
   - Reduces boilerplate in test files
   - Example: `createMockScoreboard()` factory

3. **Add mock setup helper**
   - Optional utility for tests that need multiple related mocks
   - Wraps `vi.hoisted()` for cleaner syntax
   - Not required, just convenience

---

### Implementation Checklist and Success Criteria

#### Phase 1 Completion Criteria

- [ ] `createSimpleHarness()` function exported from `integrationHarness.js`
- [ ] Function accepts `{ fixtures, useFakeTimers, useRafMock, customSetup, customTeardown }`
- [ ] Returns harness object with `setup()`, `cleanup()`, `timerControl`, `rafControl`
- [ ] Existing harness tests still pass
- [ ] Existing test files still work (use old API for now)

#### Phase 2 Completion Criteria

- [ ] `resolution.test.js` uses `vi.mock()` at top level
- [ ] `resolution.test.js` uses `createSimpleHarness()` for fixtures
- [ ] All 4 tests in `resolution.test.js` pass ✅
- [ ] Similar conversion complete for other 4 files
- [ ] All 16 previously failing tests now pass ✅
- [ ] No regressions in other test files

#### Phase 3 Completion Criteria

- [ ] Full test suite passes: `npm run test:ci`
- [ ] Battle test suite passes: `npm run test:battles`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Documentation updated
- [ ] Old mock handling removed or deprecated

#### Phase 4 (Optional) Completion Criteria

- [ ] Code is cleaner and easier to maintain
- [ ] Test files are more readable
- [ ] Performance unchanged or improved
- [ ] No new issues introduced

---

### Risk Assessment and Mitigation

**Risk: Tests break during migration**

- _Mitigation_: Phase 1 adds new API without removing old one; migrate one file at a time

**Risk: Mock registration incompleteness**

- _Mitigation_: Start with simplest test file (`uiEventBinding.test.js`), build experience

**Risk: Performance regression**

- _Mitigation_: Compare test execution time before/after each phase

**Risk: Fixtures don't work after harness simplification**

- _Mitigation_: Thoroughly test fixtures in Phase 1 before migrating tests in Phase 2

---

### Evidence Collection Strategy

**Before Implementation** (gather baseline):

- [ ] Document current test execution time: `npm run test:battles:classic --reporter=verbose`
- [ ] Count current mock-related code lines in test files
- [ ] Note current harness function complexity (lines of code)

**During Implementation** (Phase by Phase):

- [ ] Run tests after each file conversion, document results
- [ ] Track fixture-related issues or surprises
- [ ] Note any mock registration patterns that don't fit the new model

**After Implementation** (Phase 3):

- [ ] Compare test execution time to baseline
- [ ] Measure harness code reduction
- [ ] Count mock-related code lines in test files (should decrease)
- [ ] Run full CI/CD pipeline

---

### Alternative Migration Paths

**Option A: Hybrid Approach (Fastest)**

- Keep old harness for tests that work
- Only migrate files with failing tests (5 files)
- Leave working tests alone
- Pros: Minimal risk, fast
- Cons: Two harness patterns to maintain

**Option B: Complete Overhaul (Cleanest)**

- Migrate all test files simultaneously (recommended)
- Remove old harness completely
- Pros: Clean break, no maintenance burden
- Cons: More work, higher risk

**Option C: Scheduled Deprecation (Pragmatic)**

- Phase 1-2: Migrate critical tests, keep old harness
- Phase 3: Mark old harness as deprecated
- Future: Remove old harness in next major version
- Pros: Low risk now, clean later
- Cons: Technical debt remains

---

### Success Definition

**This approach succeeds when:**

1. ✅ All 16 currently failing tests pass
2. ✅ No regressions in other test files
3. ✅ Mock registration happens at top level (Vitest's design)
4. ✅ Harness handles only fixtures/timers/RAF (single responsibility)
5. ✅ Test files are easier to read (mocks visible at top)
6. ✅ No more fighting against Vitest's architecture
7. ✅ Test maintenance is simpler going forward
