# Refactoring the Vitest Test Harness

## 1. Executive Summary

**The Problem**: A significant number of Vitest tests (16+) are failing because mocked modules are not being applied correctly. The current test harness attempts to register mocks too late in Vitest's module-loading lifecycle, causing tests to receive real implementations instead of mocks.

**The Root Cause**: The harness calls `vi.doMock()` inside a `beforeEach` hook. Vitest requires mock registration via `vi.mock()` to occur at the **top level** of a test file, during its static analysis phase, before any modules are imported or executed.

**The Solution**: We will refactor the test harness architecture to align with Vitest's best practices. This involves a two-pronged strategy:

1.  **For Unit Tests**: Adopt a top-level `vi.mock()` pattern for declaring dependencies.
2.  **For Integration Tests**: Continue to use real module implementations but mock only true *external* dependencies (e.g., `fetch`, `localStorage`, Sentry).

A new, simplified `createSimpleHarness()` API has been introduced to manage the test environment (JSDOM, fake timers, fixtures) without handling mock registration, which is now the responsibility of individual tests. This refactor will resolve the failing tests and establish a more reliable and maintainable testing foundation.

---

## 2. Problem and Root Cause Analysis

The core issue is a fundamental misalignment between our test harness and Vitest's module lifecycle.

-   **Vitest Lifecycle**: Vitest first scans test files for top-level `vi.mock()` calls and queues them. Then, when a module is imported, it serves the mocked version from the queue.
-   **Current Harness Failure**: Our harness calls `vi.doMock()` inside `beforeEach`. By this point, the modules have already been imported and cached with their real implementations. The mock registration is too late to have any effect.

This leads to assertion failures where tests expect a mock to have been called, but the call was made to the real implementation instead (e.g., `expected [] to deep equally contain [0, 0]`).

Initial attempts to migrate all tests to a top-level `vi.mock()` pattern revealed a second problem: our **integration tests** rely on the complex inter-dependencies of real modules. Mocking these internal modules breaks the integration graph and causes different failures.

---

## 3. The New Test Harness Architecture

To address both issues, we are adopting a new architecture that separates environment setup from mock management and treats unit and integration tests differently.

### Guiding Principles

-   **Harness Manages Environment**: The test harness is responsible *only* for setting up the test environment: JSDOM, fake timers, `requestAnimationFrame` mocks, and injecting fixtures. It no longer manages mocks.
-   **Tests Declare Dependencies**: Each test file is responsible for declaring its own mocked dependencies. This makes dependencies explicit and easy to understand.
-   **Distinguish Test Types**: We recognize that unit and integration tests have different mocking needs.

### The `createSimpleHarness` API

A new `createSimpleHarness()` function is the foundation of this architecture.

-   **Accepts**: `{ fixtures, useFakeTimers, useRafMock, customSetup, customTeardown }`
-   **Does NOT Accept**: A `mocks` parameter.
-   **Responsibility**: Pure environment and fixture management.

### Architecture by Test Type

#### 1. Unit Test Pattern

For tests of isolated components or functions.

-   **Mocks**: Use top-level `vi.mock()` to mock all internal and external dependencies.
-   **Harness**: Use `createSimpleHarness()` for environment setup.
-   **Goal**: Isolate the unit under test.

#### 2. Integration Test Pattern

For tests that verify the interaction between multiple internal modules (e.g., the full battle flow).

-   **Mocks**: Mock **only true external dependencies** (e.g., network calls, browser storage, analytics). Do NOT mock internal project modules.
-   **Harness**: Use `createSimpleHarness()` to manage the environment and inject mock fixtures for externalities.
-   **Goal**: Test the integration of real modules in a controlled environment.

---

## 4. Implementation Plan

This plan is designed for a safe, incremental migration.

### Phase 1: Foundational API (Completed)

-   [x] **Create `createSimpleHarness()`**: A new, simplified harness API has been created in `tests/helpers/integrationHarness.js`.
-   [x] **Deprecate Old Harness**: The old `createIntegrationHarness` is marked as `@deprecated`.
-   [x] **Backward Compatibility**: Both harnesses coexist to allow for incremental migration without breaking the entire test suite at once.

### Phase 2: Test Migration (In Progress)

The core of the work is to migrate the ~16 failing tests to the appropriate new pattern.

**Migration Strategy Matrix**:

| Test File                                         | Strategy                                 | Status    | Notes                                       |
| ------------------------------------------------- | ---------------------------------------- | --------- | ------------------------------------------- |
| `tests/classicBattle/page-scaffold.test.js`       | Integration Pattern                      | Pending   | Integration-heavy; keep real battle flow.   |
| `tests/classicBattle/resolution.test.js`          | Integration Pattern                      | Pending   | Needs external fixture seeding for DOM/state. |
| `tests/classicBattle/uiEventBinding.test.js`      | Unit Test Pattern                        | Pending   | More isolated; can use top-level mocks.     |
| `tests/integration/battleClassic.integration.test.js` | Integration Pattern                      | Pending   | Real store rendering; mock only externalities.  |
| `tests/integration/battleClassic.placeholder.test.js` | Integration Pattern                      | Pending   | Visuals rely on real components.              |

**Developer Workflow for Migration**:

1.  Pick a failing test file from the matrix.
2.  Apply the designated pattern (Unit or Integration). See the **Developer Guide** below for code examples.
3.  Remove the `mocks` parameter from the harness creation call.
4.  Run the test file and verify all tests within it now pass.
5.  Run the relevant suite (`npm run test:battles:classic`) to check for regressions.

### Phase 3: Verification and Cleanup (Future)

-   [ ] **Full Suite Verification**: Run `npm test` and `npm run test:ci` to confirm all tests pass and there are no regressions.
-   [ ] **Remove Old Logic**: Once all tests are migrated, remove the mock-handling logic from `createIntegrationHarness` and other deprecated helpers.
-   [ ] **Update Documentation**: Ensure `AGENTS.md` and other guides reference the new patterns.

---

## 5. Developer Guide: Writing Tests

### Pattern 1: Unit Tests

Use this for testing isolated components or helpers.

```javascript
// tests/classicBattle/uiEventBinding.test.js (Example)

import { vi } from 'vitest';
import { createSimpleHarness } from '../helpers/integrationHarness.js';

/**
 * STEP 1: Mock all dependencies at the top level.
 * Use vi.hoisted() to share mock instances with tests.
 */
const mockShowSnackbar = vi.hoisted(() => vi.fn());
vi.mock('../../src/helpers/showSnackbar.js', () => ({ default: mockShowSnackbar }));

describe('UI Event Binding', () => {
  let harness;

  beforeEach(async () => {
    // STEP 2: Use the simple harness for environment setup.
    harness = createSimpleHarness({ useFakeTimers: true });
    await harness.setup();
  });

  afterEach(async () => {
    await harness.teardown();
  });

  test('should show snackbar on key press', async () => {
    // STEP 3: Import the module under test and run assertions.
    const { bindUIEvents } = await harness.importModule('../../src/helpers/uiEventBinding.js');
    bindUIEvents();

    // Simulate event
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    
    expect(mockShowSnackbar).toHaveBeenCalledWith('Help message');
  });
});
```

### Pattern 2: Integration Tests

Use this for testing complex workflows that involve multiple internal modules.

```javascript
// tests/classicBattle/resolution.test.js (Example)

import { vi } from 'vitest';
import { createSimpleHarness } from '../helpers/integrationHarness.js';
import { createMockLocalStorage } from '../fixtures/createMockLocalStorage.js';

/**
 * STEP 1: Mock ONLY true external dependencies.
 * (e.g., network, storage, analytics).
 * DO NOT mock internal modules like 'setupScoreboard' or 'gameOrchestrator'.
 */
vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_, fn) => fn()),
}));

describe('Classic Battle Resolution', () => {
  let harness;

  beforeEach(async () => {
    // STEP 2: Use the simple harness to inject mock fixtures for externalities.
    const mockLocalStorage = createMockLocalStorage();
    harness = createSimpleHarness({
      useFakeTimers: true,
      fixtures: { localStorage: mockLocalStorage },
    });
    await harness.setup();
    vi.spyOn(mockLocalStorage, 'setItem');
  });

  afterEach(async () => {
    await harness.teardown();
  });

  test('should save score to localStorage on match end', async () => {
    // STEP 3: Import and test the REAL modules.
    const { init: initClassicBattle } = await harness.importModule('../../src/pages/battleClassic.init.js');
    await initClassicBattle();

    // ... trigger a full match completion ...

    expect(harness.fixtures.localStorage.setItem).toHaveBeenCalledWith('lastMatchResult', expect.any(String));
  });
});
```

---

## 6. Opportunities for Improvement & Next Steps

This refactor establishes a solid foundation. We can build on it by:

-   **Creating a Test Example Directory**: Add a `tests/examples/` directory with `unit.test.js` and `integration.test.js` files that serve as canonical, working templates for developers to copy.
-   **Automating Pattern Detection**: Create a script (e.g., `npm run check:test:patterns`) that warns if a test file uses the deprecated `mocks` parameter, helping to enforce the migration.
-   **Refining Fixture Management**: Improve the `createMockLocalStorage` and other fixture creators to be more robust and reusable across the test suite.
-   **Updating Onboarding Docs**: Add a link to this document (`progressHarness.md`) in the main `CONTRIBUTING.md` so that new contributors learn the correct patterns from day one.

---

## 7. Success Criteria

The refactor will be successful when:

-   [ ] All 16+ failing tests in `tests/classicBattle/` and `tests/integration/` are passing.
-   [ ] The full test suite (`npm test` and `npm run test:ci`) runs without regressions.
-   [ ] The harness API is simplified: `createIntegrationHarness` no longer accepts a `mocks` parameter.
-   [ ] Migrated tests clearly declare their dependencies using the patterns described above.
-   [ ] The new test patterns are documented and discoverable.

---

## 8. IMPLEMENTATION LOG

### Phase 1: Validation & Documentation (IN PROGRESS)

#### Task 1: Validate createSimpleHarness() Production Readiness ✅ COMPLETED

**Findings**:

- ✅ `createSimpleHarness()` exists and is fully functional (lines 168–329 in `tests/helpers/integrationHarness.js`)
- ✅ Correctly implements top-level vi.mock() pattern with vi.resetModules()
- ✅ Does NOT have a `mocks` parameter (enforces top-level pattern)
- ✅ Already has example working test: `tests/classicBattle/examples/simpleHarnessPattern.test.js`
- ✅ API surface: `setup()`, `cleanup()`, `importModule()`, timer/raf accessors
- ✅ Fixture injection works: localStorage, fetch, matchMedia, custom globals

**Outcome**: `createSimpleHarness()` is production-ready and can serve as the foundation for migration.

---

#### Task 2: Document Failing Test Files & Dependencies (IN PROGRESS)

**Files Using Deprecated `mocks` Parameter** (10 matches found):

| File | Line(s) | Usage | Status | Notes |
|------|---------|-------|--------|-------|
| `tests/helpers/classicBattle/scheduleNextRound.fallback.test.js` | 81, 201, 275, 347, 423 | `createClassicBattleHarness({ mocks: {...} })` inside `beforeEach` | ⚠️ **CRITICAL** | 5 test groups, mocks battleEngineFacade extensively |
| `tests/helpers/integrationHarness.test.js` | 31, 56, 78, 179 | `createIntegrationHarness({ mocks: {...} })` in tests | ⚠️ **SELF-TEST** | Tests the deprecated harness itself; needs conversion to new pattern |
| `tests/helpers/settingsPage.test.js` | 45 | `createSettingsHarness({ mocks: {...} })` | ⚠️ **CRITICAL** | Settings page test, mocks 7+ helpers |

**Migration Categorization**:

**UNIT TEST FILES** (mock all dependencies):

- None identified yet; most tests are integration-heavy

**INTEGRATION TEST FILES** (mock only externals):

1. **`scheduleNextRound.fallback.test.js`** (494 lines)
   - Current: Uses deprecated mocks parameter with `createClassicBattleHarness`
   - Dependencies: battleEngineFacade (complex battle engine simulator)
   - Plan: Convert mocks to top-level `vi.mock()` + `vi.hoisted()`; use `createSimpleHarness()` instead
   - Risk: High—complex mock setup; must preserve mock factory behavior

2. **`settingsPage.test.js`** (578 lines)
   - Current: Uses deprecated mocks with `createSettingsHarness`
   - Dependencies: displayMode, motionUtils, featureFlags, layoutDebugPanel, domReady, etc.
   - Plan: Similar—top-level mocks + `createSimpleHarness()`
   - Risk: Medium—7+ helpers mocked, some with complex state management

3. **`integrationHarness.test.js`** (self-test of harness)
   - Current: Tests the deprecated `createIntegrationHarness` function
   - Plan: Rewrite to test `createSimpleHarness()` instead
   - Risk: Low—contained test file

**Outcome**: 3 high-priority files identified. Strategy: Migrate `scheduleNextRound.fallback.test.js` first (most complex), then settingsPage, then harness self-test.

---

### Phase 2: Test Migration (IN PROGRESS)

#### Implementation Attempt 1: scheduleNextRound.fallback.test.js

**Attempt**: Convert all 5 describe blocks to use top-level `vi.mock()` + `vi.hoisted()` + `createSimpleHarness()`

**Challenges Encountered**:

1. **Dynamic Mock Values**: The test file creates different mocks for each describe block (e.g., different `computeNextRoundCooldown` return values, different dispatcher implementations).
2. **Vitest Static Analysis Limitation**: `vi.mock()` must be top-level during static analysis. Cannot use `for` loops to dynamically create mocks based on arrays.
3. **Mock State Sharing**: Using `vi.hoisted()` to share spy instances is possible, but the test expects the mocks to change behavior between test suites (e.g., sometimes return `undefined`, sometimes return `true`, sometimes return `false`).
4. **Complexity**: 5 separate test suites + multiple configuration combinations = difficult to refactor without breaking the contract.

**Outcome**: ❌ **BLOCKED** - This file is too complex for the top-level mocking pattern without significant refactoring of test structure.

**Revised Strategy**:

- **Skip this file for now** — Will revisit after establishing the pattern with simpler files
- **Focus on simpler targets**:
  1. `integrationHarness.test.js` (self-tests of the harness itself) — SIMPLER, can test both patterns
  2. `settingsPage.test.js` — More manageable, fewer test suites with clearer mock needs

---

#### Next Task: Migrate simpler file first

Moving to `integrationHarness.test.js` to establish a working pattern, then return to complex files with lessons learned.

---

## Appendix A: Vitest Quick Reference

- **`vi.mock(path, factory)`**: Must be at the top level. Replaces a module with your factory function.
- **`vi.hoisted(factory)`**: Creates a variable that can be shared between a top-level `vi.mock()` factory and the test body. Essential for accessing the mock instance within a test.
- **`vi.importActual(path)`**: Used inside a mock factory to get a handle on the original module, allowing for partial mocks.
- **`vi.clearAllMocks()` / `vi.resetAllMocks()`**: Use in `afterEach` to reset mock call history and implementations between tests, ensuring test isolation.
- **`harness.importModule(path)`**: A helper in our harness that should be used to dynamically import modules *after* `harness.setup()` has run, ensuring they execute in a controlled environment.
