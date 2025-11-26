# Refactoring the Test Harness: Adopting Top-Level Mocks

## 1. Executive Summary

**The Problem**: Vitest tests are failing because mocks are not being applied correctly. Components that rely on mocked modules are not rendering, causing assertions to fail.

**The Root Cause**: The current test harness attempts to register mocks dynamically within an `async` setup function (`beforeEach`). This is too late in Vitest's execution lifecycle. Vitest requires mocks to be registered at the top level of a test file (during module collection) to correctly replace imported modules.

**The Solution**: We will refactor the test harness and associated tests to follow Vitest's idiomatic design. This involves:
1.  Using `vi.mock()` at the top level of test files for all mock registration.
2.  Simplifying the test harness to be a "Simple Harness" that only manages fixtures and lifecycle events (like timers), not mock orchestration.
3.  Migrating failing tests to this new, more stable pattern.

This refactoring will resolve the test failures and align our testing strategy with Vitest's intended use, improving reliability and maintainability.

---

## 2. Root Cause Analysis

The core issue is a misunderstanding of Vitest's module mocking behavior.

-   **Correct Usage**: `vi.mock()` or `vi.doMock()` must be called at the **top level** of a test file. Vitest processes these calls during its initial module scan, *before* any code (including imports) is executed.
-   **Incorrect Usage (Current State)**: Our `createIntegrationHarness` is called within tests, and its `setup()` method (often in `beforeEach`) attempts to call `vi.doMock()`. By this time, the modules have already been imported with their real implementations, so the mocks are never applied.

The previously suspected "document access issue" is merely a symptom of this. Because the JSDOM environment mock isn't registered in time, `getDocumentRef()` fails. Fixing the mock timing will resolve this and all other downstream errors.

---

## 3. Guiding Principles for the Refactor

-   **Embrace Top-Level Mocking**: All mocks will be defined at the top of the test file using `vi.mock()`. This is Vitest's official recommendation.
-   **Separate Concerns**: The harness will no longer be responsible for mocking. Its only jobs are to inject fixtures (like DOM elements) and manage timers.
-   **Improve Test Clarity**: Mocks will be explicitly visible at the top of each test file, making it easier to understand a test's dependencies at a glance.
-   **Leverage `vi.hoisted()`**: To share mock instances between the top-level `vi.mock` block and the test implementation (e.g., to clear mocks or check calls), we will use `vi.hoisted()`.

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

## 4. Implementation Plan

This plan is designed for a safe, incremental migration.

### Phase 1: Create the New `createSimpleHarness` API (Non-Breaking)

**Goal**: Introduce the new, simplified harness without breaking existing tests.

1.  **Create `createSimpleHarness()` in `tests/helpers/integrationHarness.js`**:
    *   It will accept only `{ fixtures, useFakeTimers, useRafMock, customSetup, customTeardown }`.
    *   It will **not** have a `mocks` parameter.
    *   The existing logic for timers, RAF, and fixtures will be preserved.

2.  **Mark `createIntegrationHarness()` as Deprecated**:
    *   Add a `/** @deprecated */` JSDoc comment to the old harness function.
    *   For now, it will remain functional to support tests that haven't been migrated.

3.  **Refactor Harness Creators**:
    *   Update `createClassicBattleHarness()`, `createSettingsHarness()`, etc., to use `createSimpleHarness()` internally, while still accepting the `mocks` parameter for backward compatibility. This contains the complexity.

### Phase 2: Migrate Failing Tests to the New Pattern

**Goal**: Fix the currently failing tests by migrating them to the new top-level mock pattern.

**Priority Migration List**:
1.  `tests/classicBattle/resolution.test.js`
2.  `tests/classicBattle/page-scaffold.test.js`
3.  `tests/classicBattle/uiEventBinding.test.js`
4.  `tests/integration/battleClassic.integration.test.js`
5.  `tests/integration/battleClassic.placeholder.test.js`

**Migration Steps for Each File**:

1.  **Identify Required Mocks**: Look at the `mocks` object being passed to the old harness.
2.  **Hoist Mocks to the Top Level**:
    *   For each mock, create a `vi.mock()` call at the top of the test file.
    *   If you need to access the mock function itself within your tests (e.g., to check `toHaveBeenCalled`), define it with `const myMock = vi.hoisted(() => vi.fn());` and use `myMock` in both the `vi.mock` factory and your test body.
3.  **Update Harness Usage**:
    *   Replace `createClassicBattleHarness({ mocks, fixtures })` with `createClassicBattleHarness({ fixtures })` (or the new `createSimpleHarness`).
4.  **Verify Tests Pass**: Run the tests for the migrated file to ensure they now pass.

### Phase 3: Verification and Cleanup

**Goal**: Confirm the migration was successful and there are no regressions.

1.  **Run Targeted Test Suites**:
    ```bash
    npm run test:battles:classic
    ```

2.  **Run Full Test Suite**:
    ```bash
    npm test
    ```

3.  **Remove Old Mock Logic**: Once all critical tests are migrated and stable, remove the mock-handling logic from `createIntegrationHarness` and the other harness creators.

4.  **Update Documentation**: Add comments and examples to our testing guides explaining the new top-level mock pattern.

---

## 5. Success Criteria

The refactor will be considered a success when:

-   [ ] All 16+ previously failing tests now pass.
-   [ ] The full test suite (`npm test`) runs without regressions.
-   [ ] The harness code is simpler and no longer deals with mock registration.
-   [ ] Migrated test files clearly show their dependencies with top-level `vi.mock` calls.
-   [ ] The project's test architecture is stable and aligned with Vitest best practices.

