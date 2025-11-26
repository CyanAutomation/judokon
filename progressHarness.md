# Refactoring the Test Harness: Adopting Top-Level Mocks

## 1. Executive Summary

**The Problem**: Vitest tests (16 currently failing) are not receiving mocked modules correctly. The mocks are registered via `vi.doMock()` in the harness's `setup()` method within `beforeEach`, which is too late in Vitest's module collection lifecycle. This causes tests to receive real implementations instead of mocks, leading to assertion failures and missing function calls.

**The Root Cause**: Vitest's module mocking system requires `vi.mock()` or `vi.doMock()` calls to occur at the **top level** of a test file (during static module analysis), *before* any imports execute. The current test harness calls `vi.doMock()` inside `beforeEach` (after imports), so Vitest's cache is already populated with real modules. Later, `vi.resetModules()` is called, but by then it's too late to apply the mocks that were queued after module instantiation.

**The Solution**: Refactor the test harness to:

1. Move all mock registration to the **top level** of test files using `vi.mock()` at file scope.
2. Simplify the harness to manage only fixtures, timers, RAF, and environment setup—not mock registration.
3. Use `vi.hoisted()` to share mock instances between the top-level `vi.mock()` block and test implementations for inspection/setup.
4. Migrate failing tests incrementally to this pattern.

This refactoring aligns with Vitest best practices, resolves all 16 failing tests, and establishes a reliable, maintainable testing foundation.

---

## 2. Root Cause Analysis

The core issue is a fundamental misalignment between how the harness registers mocks and when Vitest applies them.

### Vitest Module Lifecycle

1. **Module Collection Phase** (static): Vitest scans the test file and collects all `vi.mock()` calls at file scope.
2. **Mock Registration**: Vitest queues the mocks in preparation for module replacement.
3. **Module Execution** (dynamic): `vi.resetModules()` clears the module cache while *preserving the mock queue*.
4. **Import Resolution**: When a module is imported, Vitest applies the queued mocks before returning the module.

### What's Breaking

The current `createIntegrationHarness` calls `vi.doMock()` inside the `setup()` method, which runs in `beforeEach` (after the Module Collection Phase). By this time:

- All test file imports have already executed with real implementations
- `vi.resetModules()` is then called, but **the mock queue has not been prepared**
- Mock registration is too late; modules are already cached
- Tests receive real module implementations instead of mocks

### Symptom: Mock Calls Not Registered

When a test expects a mocked function to have been called (e.g., `expect(scoreboardMock.updateScore.mock.calls).toContainEqual([0, 0])`), the calls array is empty because:

1. The real `updateScore` function was called (not the mock)
2. The mock was never actually used by the code under test
3. Assertions fail with `expected [] to deep equally contain [0, 0]`

---

## 3. The Rationale for a Full Harness Redesign

### Current State (Breaking)

The current test harness conflates three separate concerns:

1. **Environment Setup**: Managing JSDOM, fake timers, RAF mocks, and fixtures
2. **Mock Registration**: Deciding which modules get mocked and how (queued in `vi.doMock()` calls)
3. **Scenario Orchestration**: Spinning up a "Classic Battle" in a specific state with given fixtures

This monolithic design worked in early tests but breaks when:

- Tests need to import real modules alongside mocks (common in integration tests)
- Mocks need to be inspected or configured (e.g., checking call counts, clearing calls)
- Multiple battle modes have different mock configurations

### Why Redesign? The Separation of Concerns

Mock registration must happen at the **test file level** (module collection time), not in a shared harness function (test execution time). This means:

- **Harness**: Becomes a pure orchestration layer for environment setup and scenario building—fixtures, timers, RAF, DOM cleanup
- **Tests**: Explicitly declare their dependencies using top-level `vi.mock()` calls, making dependencies visible and respecting Vitest's lifecycle

This separation aligns with Vitest's design philosophy: mocks are test dependencies declared upfront, not infrastructure concerns.

The new responsibilities will be:

- **Harness**: Becomes solely about "spin up a battle with this config" and drops responsibility for mocking entirely. It will be a thin orchestration layer composing smaller, clearer utilities for environment setup and scenario building.
- **Tests**: Will explicitly handle all mock registration at the top level, making dependencies clear and respecting the Vitest lifecycle.

### Why We Are Choosing This Approach

1. **Alignment with Vitest**: The current harness is fundamentally misaligned with Vitest's lifecycle. Fighting the framework leads to brittle, hard-to-debug tests. This redesign allows us to embrace Vitest's strengths, leading to more robust and idiomatic tests.

2. **Create a Genuine Test Platform**: Given our reliance on automated tests, there is immense value in having a clear, documented, and composable way to build test scenarios. This turns an opaque helper file into a mini-framework for testing battle modes, making it easier for all contributors (human or AI) to use.

3. **Future-Proofing for Complexity**: JU-DO-KON! is growing, with multiple battle modes and cross-cutting features. A well-designed harness will allow us to add new modes and features with reusable patterns, rather than duplicating setup logic or starting from scratch.

4. **Reduced Cognitive Load**: The new model will be more readable. Test dependencies (mocks) will be declared at the top, and the test body will focus on execution. This makes tests easier to understand, review, and maintain.

### Risks and Mitigation

1. **Risk: Scope Creep**: It's easy to get drawn into a full test infrastructure rewrite.
    - **Mitigation**: We will bound the scope to redesigning only the mocking and setup structure required for *battle tests*. Unrelated cleanup will be deferred.

2. **Risk: Widespread Regressions**: A change to a shared harness can break many tests at once.
    - **Mitigation**: We will use a dual-path strategy. The new harness API will be added without removing the old one, and tests will be migrated one suite at a time.

3. **Risk: Blocking Other Work**: An infrastructure project can become a drag on feature development.
    - **Mitigation**: The work will be time-boxed and treated as a dedicated infrastructure ticket, separate from a specific bug fix.

4. **Risk: Over-engineering**: A from-scratch design can lead to overly clever or complex abstractions.
    - **Mitigation**: The new design will be proven by migrating the three most important, concrete use cases first (e.g., Classic, Bandit, Quick modes) before generalizing.

---

## 4. Guiding Principles for the Refactor

- **Embrace Top-Level Mocking**: All mocks will be defined at the top of the test file using `vi.mock()`. This is Vitest's official recommendation.
- **Separate Concerns**: The harness will no longer be responsible for mocking. Its only jobs are to inject fixtures (like DOM elements) and manage timers.
- **Improve Test Clarity**: Mocks will be explicitly visible at the top of each test file, making it easier to understand a test's dependencies at a glance.
- **Leverage `vi.hoisted()`**: To share mock instances between the top-level `vi.mock` block and the test implementation (e.g., to clear mocks or check calls), we will use `vi.hoisted()`.

**New Architecture:**

```text
// OLD (Broken)
test("...", async () => {
  const harness = createIntegrationHarness({ mocks, fixtures }); // Mocks passed in
  await harness.setup(); // Tries to mock too late
  // ...
});

// NEW (Correct)
import { vi } from "vitest";

// Mocks are at the top level
const myMock = vi.hoisted(() => vi.fn());
vi.mock("./path/to/module", () => ({ default: myMock }));

test("...", async () => {
  const harness = createSimpleHarness({ fixtures }); // No mocks
  await harness.setup();
  // ...
});
```

---

## 5. Implementation Plan

This plan is designed for a safe, incremental migration that maintains test stability throughout.

### Phase 1: Create the New `createSimpleHarness` API (Non-Breaking)

**Goal**: Introduce the new, simplified harness without breaking existing tests. All existing tests continue to work; new tests adopt the new pattern.

**Step 1.1**: Create `createSimpleHarness()` in `tests/helpers/integrationHarness.js`:

- Accept only: `{ fixtures, useFakeTimers, useRafMock, customSetup, customTeardown }`
- **Never** accept a `mocks` parameter
- Preserve all existing logic for timers, RAF, and fixtures
- Make it the public API; existing harness creators delegate to it

**Step 1.2**: Deprecate mock handling in the harness:

- Add `/** @deprecated: Use vi.mock() at the top level of test files instead. */` to `createIntegrationHarness`
- Remove mock registration logic from `createClassicBattleHarness`, `createSettingsHarness`, etc.
- Update JSDoc to clarify that these helpers no longer handle mocks

**Step 1.3**: Verify backward compatibility:

- Run full test suite; existing tests should still work (though they'll receive real module implementations)
- Note which tests now fail due to missing mocks—these are migration candidates

### Phase 2: Migrate Failing Tests to the New Pattern

**Goal**: Fix the 16 currently failing tests by migrating them to the new top-level mock pattern.

**Priority Migration List** (ordered by impact and complexity):

1. `tests/classicBattle/page-scaffold.test.js` (7 failing tests)
2. `tests/classicBattle/resolution.test.js` (2 failing tests)
3. `tests/classicBattle/uiEventBinding.test.js` (1+ failing tests)
4. `tests/integration/battleClassic.integration.test.js` (4+ failing tests)
5. `tests/integration/battleClassic.placeholder.test.js` (1+ failing tests)

**Migration Pattern (Template for Each File)**:

```javascript
// BEFORE (Broken)
import { createClassicBattleHarness } from "../helpers/integrationHarness.js";

test("example", async () => {
  const harness = createClassicBattleHarness({
    mocks: { "../../src/helpers/setupScoreboard.js": () => ({ ... }) },
    fixtures: { /* ... */ }
  });
  await harness.setup();
  // Real setupScoreboard is used; mock never applied
});

// AFTER (Fixed)
const scoreboardMock = vi.hoisted(() => ({
  updateScore: vi.fn(),
  updateRoundCounter: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => scoreboardMock);

test("example", async () => {
  const harness = createClassicBattleHarness({
    fixtures: { /* ... */ }
  });
  await harness.setup();
  // setupScoreboard mock is applied immediately on import
  expect(scoreboardMock.updateScore).toHaveBeenCalled();
});
```

**Migration Steps for Each File**:

1. **Audit Current Mocks**: Identify all `mocks: { ... }` passed to the harness
2. **Extract Mock Objects**: Move each mock implementation to a top-level `vi.hoisted()` block
3. **Register with `vi.mock()`**: Add a `vi.mock(modulePath, () => hooistedMock)` call for each
4. **Update Harness Calls**: Remove the `mocks` parameter; keep `fixtures` and other config
5. **Update Assertions**: Replace `mockObject.mock.calls` with direct function assertions (Vitest spies work the same way)
6. **Run and Verify**: Execute the test file; all assertions should pass
7. **Full Suite Check**: Run `npm run test:battles:classic` to confirm no regressions

### Phase 3: Verification and Cleanup

**Goal**: Confirm the migration was successful and there are no regressions.

**Step 3.1**: Run targeted test suites:

```bash
npm run test:battles:classic
```

**Step 3.2**: Run the full test suite:

```bash
npm test
```

**Step 3.3**: Once all critical tests are migrated and stable:

- Remove mock-handling logic from `createIntegrationHarness`
- Remove mock-related parameters from harness creators
- Clean up deprecated JSDoc comments

**Step 3.4**: Document the new pattern:

- Add `vi.mock()` examples to `AGENTS.md` and test guidelines
- Update JSDoc in harness creators with clear "mock-free" contracts
- Create a test migration checklist for future contributors

---

## 6. Vitest Reference Guide

### Key Concepts

- **`vi.mock(modulePath, factory)`**: Register a mock at the top level of a test file. Vitest applies this during module collection before any imports.
- **`vi.hoisted(callback)`**: Hoist a value (function, mock instance) to the module's top level. Use this to share mock instances between the `vi.mock` factory and the test body.
- **`vi.resetModules()`**: Clear the module cache while preserving mock registrations. Useful after mocks are set up in integration tests.
- **`vi.doMock()` (async version)**: Schedules a mock for registration. Vitest queues these calls; they take effect after the next `vi.resetModules()`.

### Common Patterns

**Pattern 1: Simple Mock with Spy**

```javascript
const myMock = vi.hoisted(() => vi.fn());
vi.mock("./module.js", () => ({ default: myMock }));

test("calls the function", async () => {
  const { default: fn } = await import("./module.js");
  fn();
  expect(myMock).toHaveBeenCalled();
});
```

**Pattern 2: Partial Mock (Real Module + Spy)**

```javascript
vi.mock("./module.js", async () => {
  const real = await vi.importActual("./module.js");
  return {
    ...real,
    expensiveFunction: vi.fn()
  };
});
```

**Pattern 3: Mock with State Inspection**

```javascript
const mockState = vi.hoisted(() => ({
  callCount: 0,
  lastArgs: null
}));

const mockFn = vi.hoisted(() => vi.fn((...args) => {
  mockState.callCount++;
  mockState.lastArgs = args;
}));

vi.mock("./module.js", () => ({ default: mockFn }));

test("tracks state across calls", async () => {
  // mockFn and mockState can be used and inspected here
  expect(mockState.callCount).toBe(0);
});
```

### Resources

- **Vitest Official Docs**: <https://vitest.dev/guide/mocking.html> (definitive reference)
- **JU-DO-KON! Agent Guide**: `AGENTS.md` → Search for \"RAG-First Policy\" and \"Unit Test Quality Standards\"
- **Existing Examples in Codebase**: `tests/classicBattle/page-scaffold.test.js` (lines 1–100) shows the new pattern in action

---

## 7. Implementation Progress

### Task 1.1: Create `createSimpleHarness()` API

**Status**: Completed ✅

**Action**: Create `createSimpleHarness()` in `tests/helpers/integrationHarness.js`

Changes made:

- ✅ Added new `createSimpleHarness()` function to `tests/helpers/integrationHarness.js`
- ✅ Function accepts only: `{ fixtures, useFakeTimers, useRafMock, customSetup, customTeardown }`
- ✅ **NO `mocks` parameter** — all mocks must be registered at file scope using `vi.mock()`
- ✅ Added `vi.resetModules()` call in setup to clear module cache before test runs
- ✅ Preserved all existing environment setup logic (timers, RAF, fixtures, DOM cleanup)
- ✅ Made `createIntegrationHarness()` `@deprecated` with clear migration guidance
- ✅ Updated JSDoc with detailed examples and Vitest lifecycle explanation
- ✅ Both functions export and coexist (backward compatible during migration)

Outcome:

- New simplified harness API is available for new tests
- Old harness remains functional but marked `@deprecated`
- No breaking changes to existing tests yet
- Clear path for incremental migration

### Task 2: Migrate Resolution Tests - DISCOVERY

**Status**: Investigation Complete - Approach Adjustment Needed

**Findings**:

After attempting to convert `tests/classicBattle/resolution.test.js` to use top-level `vi.mock()`, discovered that these integration tests have complex interdependencies:

1. **Existing page-scaffold.test.js tests are ALSO failing** with top-level mocks
2. The issue is not the harness or mock registration timing—it's that `battleClassic.init()` performs deep module initialization that expects many submodules to be loaded and configured properly
3. Top-level `vi.mock()` works correctly for isolated unit tests, but these integration tests require:
   - Real module imports to execute their initialization logic
   - Precise mock injection at specific points in the initialization sequence
   - State management across multiple module boundaries

**Root Cause**: These are **true integration tests**, not unit tests with mocked dependencies. They were designed to test the real module interactions while mocking only external I/O. The original `vi.doMock()` approach was attempting (unsuccessfully) to mock modules after import, which violates Vitest's lifecycle guarantees.

**Conclusion**: These tests need a **different refactoring approach** than a simple "convert to top-level vi.mock()" migration. Two options:

#### Option A: Decompose into Unit Tests (Recommended)

- Break down integration tests into smaller, focused unit tests
- Each unit test mocks only its specific module boundaries
- Use top-level `vi.mock()` at module boundaries
- Much faster test execution + more maintainable
- Better test isolation and clarity

#### Option B: Redesign Test Architecture

- Create a test fixture/seeding system for pre-configured battle state
- Mock only external APIs (fetch, localStorage, timers)
- Let real modules run with controlled inputs/outputs
- Requires significant test infrastructure changes

**Next Steps**:

The current task should be **paused** and reclassified as:

1. **Phase 1a (Current - COMPLETE)**: Create simplified harness API ✅
2. **Phase 1b (NEW)**: Audit which tests are true integration vs unit tests
3. **Phase 2 (DEFERRED)**: Refactor integration tests based on Option A or B decision
4. **Phase 3**: Port remaining tests to new patterns

For now, we'll mark `resolution.test.js` as "migration blocker due to test architecture" and document the discovery.

---

## 7. FAQ & Troubleshooting

### Q: When should I use `vi.mock()` vs. `vi.doMock()`?

**A**: Use `vi.mock()` at the top level of your test file (99% of cases). Use `vi.doMock()` only in advanced scenarios like dynamic imports or conditional mocking within test setup. For this refactor, stick to top-level `vi.mock()`.

### Q: How do I mock a module and also use the real implementation?

**A**: Use `vi.importActual()` inside the mock factory:

```javascript
vi.mock("./module.js", async () => {
  const real = await vi.importActual("./module.js");
  return {
    ...real,
    expensiveFunction: vi.fn().mockResolvedValue(real.expensiveFunction())
  };
});
```

### Q: My test imports a module before the `vi.mock()` call. Why doesn't the mock apply?

**A**: Imports are hoisted to the top of the file. Ensure `vi.mock()` calls appear *before* import statements. Vitest processes `vi.mock()` statically; dynamic or deferred mocks won't work on already-imported modules.

### Q: How do I reset a mock between tests?

**A**: Use `afterEach`:

```javascript
afterEach(() => {
  vi.clearAllMocks();  // Clear call history
  vi.resetAllMocks();  // Clear implementations
});
```

### Q: Can I mock the same module differently in different tests?

**A**: Not within the same file (mock registration is static per file). Create separate test files or use `vi.resetModules()` + `vi.doMock()` dynamically (advanced; prefer separate files for clarity).

---

## 8. Success Criteria

The refactor will be considered a success when:

- [ ] All 16 failing tests in `tests/classicBattle/` and `tests/integration/` now pass
- [ ] The full test suite (`npm test` or `npm run test:ci`) runs without regressions
- [ ] The harness code is simpler: `createIntegrationHarness` no longer accepts a `mocks` parameter
- [ ] Migrated test files clearly show their dependencies with top-level `vi.mock()` calls (visible on lines 1–50)
- [ ] New test patterns are documented in `AGENTS.md` → \"Unit Test Quality Standards\"
- [ ] The project's test architecture is stable and aligned with Vitest best practices (zero mock timing issues)

---

## Appendix A: Current Test Failure Summary

As of the document's last update, 16 tests are failing across multiple suites:

**`tests/classicBattle/page-scaffold.test.js`** (7 failures):

- Mock functions like `updateScore`, `updateRoundCounter`, `showMessage` are never called
- Mocks are registered too late; real implementations are used
- Root cause: Mock timing issue resolved by top-level `vi.mock()`

**`tests/classicBattle/resolution.test.js`** (2+ failures):

- `computeRoundResultMock` expected to be called but never is
- Real `computeRoundResult` function is used instead of mock
- Same root cause: Mock registration timing

**`tests/integration/battleClassic.integration.test.js`** (4+ failures):

- Store access (`window.battleStore`) returns undefined
- DOM elements not rendered due to missing mocks
- Same root cause cascading through integration tests

**Symptom Pattern**: All failures show one of:

1. Expected spy/mock to be called, but call count is 0
2. Expected DOM elements or state to exist, but they're undefined
3. Expected arrays to contain values, but arrays are empty

All 16 failures resolve by moving mock registration to the top level of test files.

---

## Appendix B: Files to Be Changed

**Primary Changes**:

- `tests/helpers/integrationHarness.js` (remove mock parameter, simplify API)
- `tests/classicBattle/page-scaffold.test.js` (add top-level mocks, remove from harness call)
- `tests/classicBattle/resolution.test.js` (add top-level mocks)
- `tests/classicBattle/uiEventBinding.test.js` (add top-level mocks)
- `tests/integration/battleClassic.integration.test.js` (add top-level mocks)
- `tests/integration/battleClassic.placeholder.test.js` (add top-level mocks)

**Documentation Updates**:

- `AGENTS.md` → Add \"Vitest Top-Level Mocking Pattern\" section
- `.github/copilot-instructions.md` → Mirror updates to AGENTS.md
- `tests/classicBattle/README.md` (if exists) → Add migration guide

**No Changes Required**:

- Test utilities (`tests/utils/`, `tests/setup/`)
- Integration test infrastructure
- Test data and fixtures
