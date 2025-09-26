# PRD: Testing Standards

## TL;DR

This PRD establishes comprehensive testing standards for the JU-DO-KON! project, covering unit tests, Playwright end-to-end tests, and test quality evaluation systems. It consolidates testing guidelines, naming conventions, and automated quality assessment criteria to ensure reliable, maintainable, and high-value test suites. These standards support both human developers and AI agents in creating effective tests that provide genuine value and catch real regressions.

---

## Problem Statement

Inconsistent testing practices across the JU-DO-KON! project lead to unreliable test suites, false positives, and tests that fail to catch real regressions. Without unified standards for test structure, naming, and quality assessment, developers create tests of varying quality, and the test suite becomes difficult to maintain. Poor test practices result in reduced confidence in the codebase, slower development cycles, and increased maintenance overhead.

---

## Goals

- **Reliability**: Establish testing patterns that produce consistent, trustworthy results
- **Value**: Ensure tests focus on behavior and catch genuine regressions
- **Maintainability**: Create sustainable testing practices that scale with the codebase
- **Efficiency**: Optimize test execution time while maintaining coverage quality
- **Standardization**: Provide clear guidelines for test structure and naming conventions
- **Quality Assessment**: Enable automated evaluation of test value and effectiveness

---

## User Stories

- As a developer, I want clear testing standards so that I can write reliable, maintainable tests
- As a CI/CD system, I want consistent test patterns so that I can reliably validate code changes
- As a code reviewer, I want established test quality criteria so that I can evaluate test effectiveness
- As an AI agent, I want structured testing guidelines so that I can generate appropriate test cases
- As a new team member, I want comprehensive testing documentation so that I can contribute quality tests immediately

---

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                 |
| -------- | --------------------------- | ----------------------------------------------------------- |
| P1       | Unit Test Quality Standards | Behavior-focused testing principles and evaluation criteria |
| P1       | Playwright Test Guidelines  | End-to-end testing best practices and locator strategies    |
| P1       | Test Naming Conventions     | Consistent file and test case naming patterns               |
| P1       | Quality Evaluation System   | Automated scoring system for test value assessment          |
| P2       | Test Structure Templates    | Standardized patterns for common testing scenarios          |
| P2       | Performance Optimization    | Guidelines for efficient test execution                     |
| P3       | Advanced Testing Patterns   | Specialized testing approaches for complex scenarios        |

---

## Functional Requirements

### 1. Unit Test Quality Standards (P1)

**Core Philosophy:**

- **Behavior-focused**: Tests verify observable behavior, not implementation details
- **High-signal**: Test failures clearly indicate genuine problems
- **Low-cost**: Tests are fast, reliable, and easy to maintain

**Quality Evaluation Rubric (0-10 scale):**

**Intent Clarity (Weight: 2)**

- Descriptive test titles using 'should', 'when', 'given/then' patterns
- Clear links to requirements or specifications
- Tests clearly state expected behavior

**Behavioral Relevance (Weight: 2)**

- Tests relate to required features or documented bug fixes
- Linked to PRDs, issue trackers, or bug reports
- Cover critical user-facing functionality

**Assertion Quality (Weight: 2)**

- High-quality semantic assertions (`.toEqual`, `.toBeCalledWith`)
- Minimal reliance on snapshot-only tests
- Precise, meaningful validation of behavior

**Isolation and Robustness (Weight: 2)**

- Proper test isolation from external factors
- Use of fake timers (`vi.useFakeTimers`) for time-dependent tests
- Minimal heavy mocking (fewer than 4 spies per test)

**Cost vs Coverage (Weight: 2)**

- Efficient test execution time
- High value per line of test code
- Appropriate coverage without redundancy

**Scoring Classification:**

- **Keep (≥8)**: High-quality tests providing genuine value
- **Refactor (5-7)**: Tests needing improvement but worth salvaging
- **Remove/Merge (≤4)**: Low-value tests requiring removal or consolidation

#### Detailed Rubric Guidance and Examples

- **Intent Clarity**: Begin files with lightweight metadata that ties the test to a requirement, spec ID, or bug ticket. Descriptive `describe`/`it` names such as `"authenticate should return a user object on successful authentication"` help reviewers understand scope instantly.

  ```javascript
  /**
   * Spec-ID: AUTH-001
   * Linked-Req: PRD-4.2 (User Login)
   * Covers: src/helpers/auth.js
   */
  import { authenticate } from "../src/helpers/auth";

  describe("authenticate", () => {
    it("should return a user object on successful authentication", () => {
      // ...
    });
  });
  ```

- **Assertion Quality**: Prefer semantic assertions that fail loudly and specifically. Snapshots may supplement but should not be the only guardrail.

  ```javascript
  it("should return the correct user payload", () => {
    const user = { id: 1, name: "Alice" };
    expect(authenticate("valid", "creds")).toEqual(user);
  });
  ```

- **Isolation & Robustness**: Deterministic timer control is mandatory for time-dependent logic. Use the canonical fake-timer helpers (see [Fake Timers Playbook](#7-fake-timers-playbook-p1)) instead of real `setTimeout` calls.

  ```javascript
  it("should time out after 5000ms", async () => {
    const timers = useCanonicalTimers();
    myFunctionThatTimesOut();
    await timers.advanceTimersByTimeAsync(5000);
    expect(onTimeout).toHaveBeenCalled();
    timers.cleanup();
  });
  ```

- **Cost vs Coverage**: Avoid redundant setup or sprawling fixture data. Each test should reach assertions quickly and verify meaningful behavior tied to a PRD requirement.

### 2. Playwright Test Guidelines (P1)

**Core Philosophy:**

- **User-centric**: Model realistic user journeys
- **Robust & Reliable**: Consistent results, free from flakiness
- **Efficient**: Fast and reliable execution

**Quality Evaluation Rubric (0-10 scale):**

**Intent Clarity (Weight: 2)**

- Clear user flow descriptions using 'given/when/then', 'user navigates'
- Links to requirements and specifications
- Descriptive test scenarios

**Behavioral Relevance (Weight: 2)**

- Maps to critical user paths or documented bug fixes
- Linked to PRDs, issues, or feature annotations
- Covers essential user-facing functionality

**Assertion Quality (Weight: 2)**

- User-facing locators (`getByRole`, `getByTestId`)
- Semantic assertions over screenshot-only tests
- Minimal reliance on CSS/XPath selectors

**Robustness (Weight: 2)**

- Stable locator strategies
- Proper wait conditions
- Minimal hardcoded delays

**Performance (Weight: 2)**

- Efficient test execution
- Appropriate parallelization
- Minimal resource consumption

**Best Practices:**

- Use `data-testid` attributes for test-specific element identification
- Implement proper wait conditions (`waitForSelector`, `waitForLoadState`)
- Avoid hardcoded timeouts in favor of condition-based waiting
- Structure tests to reflect actual user workflows

#### Detailed Rubric Guidance and Examples

- **Intent Clarity**: Titles should describe the user journey and expected outcome. Include spec metadata where helpful.

  ```javascript
  /**
   * Spec-ID: CART-003
   * Linked-Req: PRD-7.1 (Add to Cart)
   */
  test("should allow user to add an item to the cart from the product page", async ({ page }) => {
    // ...
  });
  ```

- **Assertion Quality**: Favor accessible locators (`getByRole`, `getByTestId`) and semantic expectations.

  ```javascript
  const submitButton = page.getByRole("button", { name: /Sign In/i });
  await submitButton.click();
  await expect(page.getByText("Welcome, Alice!")).toBeVisible();
  ```

- **Robustness & Flake Resistance**: Lean on Playwright's auto-waiting features and web-first assertions. Hard-coded sleeps (`page.waitForTimeout`) are prohibited because they introduce flakiness.

  ```javascript
  await expect(page.getByRole("heading", { name: "Shopping Cart" })).toBeVisible({ timeout: 5000 });
  ```

- **Cost vs Coverage**: Tests that intermittently fail carry negative value. Exercise `npm run e2e:flake-scan` whenever a scenario introduces new waits or asynchronous flows.

### 3. Test Naming Conventions (P1)

**File Naming Standards:**

- Unit tests: `featureOrComponent.test.js`
- Integration tests: `featureOrComponent.integration.test.js`
- Playwright tests: `featureOrComponent.spec.js`
- File names directly reflect the area under test

**Examples:**

- `matchControls.test.js` - Unit tests for match control functionality
- `navigation.spec.js` - E2E tests for navigation behavior
- `cardCarousel.integration.test.js` - Integration tests for card carousel

**Test Structure Standards:**

- **Describe Blocks**: Start with module/feature name, followed by specific behavior
- **Test Messages**: Short, explicit descriptions of expected outcomes
- **Consistent Hierarchy**: Logical grouping from general to specific

**Template Structure:**

```javascript
describe("ComponentName", () => {
  describe("when condition occurs", () => {
    it("should produce expected behavior", () => {
      // Test implementation
    });
  });
});
```

### 4. Quality Evaluation System (P1)

**Automated Assessment:**

- Programmatic scoring based on established rubrics
- Regular evaluation of test suite health
- Identification of tests requiring attention

**Evaluation Metrics:**

- Test execution performance
- Assertion quality and coverage
- Locator strategy effectiveness (Playwright)
- Test isolation and reliability

**Reporting:**

- Classification of tests by quality score
- Recommendations for improvement or removal
- Trend analysis of test suite health

### 5. Test Structure Templates (P2)

**Unit Test Template:**

```javascript
describe("FeatureName", () => {
  beforeEach(() => {
    // Setup common to all tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.restoreAllMocks();
  });

  describe("when specific condition", () => {
    it("should produce expected behavior", () => {
      // Arrange
      const mockData = createTestData();

      // Act
      const result = functionUnderTest(mockData);

      // Assert
      expect(result).toEqual(expectedValue);
    });
  });
});
```

**Playwright Test Template:**

```javascript
test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/feature-page");
    await page.waitForLoadState("networkidle");
  });

  test("should complete user workflow", async ({ page }) => {
    // Given user is on feature page
    await expect(page.locator('[data-testid="feature-element"]')).toBeVisible();

    // When user performs action
    await page.click('[data-testid="action-button"]');

    // Then expected result occurs
    await expect(page.locator('[data-testid="result"]')).toContainText("Expected Result");
  });
});
```

### 6. Performance Optimization (P2)

**Unit Test Performance:**

- Use fake timers for time-dependent functionality
- Mock external dependencies appropriately
- Minimize test setup and teardown overhead
- Parallel test execution where safe

**Playwright Performance:**

- Optimize page load strategies
- Use appropriate wait conditions
- Implement efficient test isolation
- Leverage browser context reuse when possible

**Monitoring:**

- Track test execution times
- Identify performance bottlenecks
- Regular review of slow tests

### 7. Fake Timers Playbook (P1)

**Canonical Helpers:**

- `useCanonicalTimers()` – installs deterministic fake timers with automatic cleanup helpers.
- `withFakeTimers(fn)` – wraps an async test body with canonical setup/teardown.
- `advanceTimersByTimeAsync(ms)` / `runAllTimersAsync()` – async-safe helpers for advancing timers.

**Preferred Test Structure:**

```javascript
import { useCanonicalTimers } from "../setup/fakeTimers.js";

describe("My Timer Test", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("should handle timeouts", async () => {
    let called = false;
    setTimeout(() => (called = true), 1000);

    await timers.advanceTimersByTimeAsync(1000);
    expect(called).toBe(true);
  });
});
```

**Best Practices:**

- Always `await` async timer helpers to avoid race conditions.
- Avoid mixing real and fake timers within a single test suite.
- Use wrapper utilities when timers should span the entire test body.
- Pair with RAF mocks when animations share control flow; install mocks after timers initialize and clean them up together.

**Anti-Patterns to Avoid:**

- Direct calls to `vi.useFakeTimers()` without the canonical helpers.
- Synchronous timer flushes inside async tests (e.g., `vi.runAllTimers()` without `await`).
- Real sleeps (`setTimeout` or `waitForTimeout`) in deterministic timer suites.

### 8. Playwright Readiness Helpers (P1)

**Stable Readiness Signals:**

- `await waitForBattleReady(page)` – ensures Classic Battle UI bindings complete.
- `await waitForSettingsReady(page)` – waits for settings UI initialization.
- `await waitForBattleState(page, "waitingForPlayerAction", 10000)` – targets specific machine states.
- `await page.evaluate(() => window.battleReadyPromise)` – raw fallback for full initialization.

**Avoid:**

- Waiting on `#next-round-timer` visibility at page load (races with snackbar rendering).
- Relying on pre-match countdown timers; instead, target prompts like "Select your move" or `#stat-buttons[data-buttons-ready="true"]`.

**Supporting Utilities:**

- `playwright/fixtures/waits.js` exports readiness helpers and state waiters.
- Screenshot storage lives under `playwright/*-snapshots/`; use `SKIP_SCREENSHOTS=true` when screenshots are not required locally.

### 9. Classic Battle Promise Utilities (P1)

**Initialization Workflow:**

- Import `initClassicBattleTest({ afterMock: true })` from `tests/helpers/initClassicBattleTest.js` immediately after `vi.doMock` when Classic Battle modules are mocked inside a test. The helper:
  - Calls `__resetClassicBattleBindings()` to clear previous listeners.
  - Forces `__ensureClassicBattleBindings({ force: true })` to rebuild the event bus and honor new mocks.
  - Returns the `src/helpers/classicBattle.js` module for direct interaction.

**Deterministic Promises:**

- `getRoundPromptPromise()` – resolves when the selection prompt (snackbar) displays.
- `getCountdownStartedPromise()` – resolves when the next-round countdown begins.
- `getRoundResolvedPromise()` – resolves when outcomes and scores finalize (assert via `#round-message`).
- `getRoundTimeoutPromise()` – resolves when timeout logic activates.
- `getStatSelectionStalledPromise()` – surfaces stall prompts for delayed selections.

**UI Assertions:**

- Outcome text lives in `#round-message`.
- Countdown and hints appear via snackbar utilities (`showSnackbar` / `updateSnackbar`).

**State and Debug Hooks:**

- `battleStateChange` events drive DOM mirroring and waiter resolution; prefer emitting this event over mutating DOM datasets directly.
- `exposeDebugState` / `readDebugState` helpers allow tests to inspect Classic Battle internals without global pollution.

---

## Acceptance Criteria

- [ ] All new unit tests follow established quality rubric
- [ ] Playwright tests use semantic locators and proper wait conditions
- [ ] Test files follow consistent naming conventions
- [ ] Automated quality evaluation system identifies test issues
- [ ] Test execution performance meets established benchmarks
- [ ] All tests include clear, descriptive names and structure
- [ ] Test suites maintain high signal-to-noise ratio
- [ ] CI/CD pipeline integrates test quality checks
- [ ] Documentation provides clear examples for all test types
- [ ] Test isolation prevents false positives and flaky behavior

---

## Non-Functional Requirements

**Performance:**

- Unit test suite completes in under 30 seconds
- Playwright tests complete in under 5 minutes
- Test quality evaluation completes in under 10 seconds

**Reliability:**

- Tests produce consistent results across environments
- Minimal flakiness in CI/CD pipeline
- Clear failure messages for debugging

**Maintainability:**

- Test standards are easily discoverable and understandable
- Regular updates reflect evolving best practices
- Clear migration path for improving existing tests

**Developer Experience:**

- Standards enforceable through automated tooling
- Clear examples and templates for common scenarios
- Integration with development workflows

---

## Edge Cases / Failure States

**Flaky Tests:**

- Automated identification of inconsistent test results
- Quarantine system for unreliable tests
- Root cause analysis procedures

**Performance Degradation:**

- Monitoring for increasing test execution times
- Alerts for tests exceeding performance thresholds
- Optimization recommendations

**Quality Regression:**

- Detection of declining test quality scores
- Alerts for tests falling below quality thresholds
- Remediation workflows

---

## Dependencies and Open Questions

**Dependencies:**

- Vitest testing framework for unit tests
- Playwright testing framework for E2E tests
- CI/CD pipeline integration for automated evaluation
- Code coverage tools for quality assessment

**Open Questions:**

- What level of test coverage is appropriate for different component types?
- How frequently should test quality evaluation run?
- What is the appropriate balance between test isolation and realistic scenarios?

---

## Tasks

- [x] Consolidate existing testing standards into unified PRD
- [ ] Implement automated test quality evaluation system
- [ ] Create test templates for common scenarios
- [ ] Integrate quality checks into CI/CD pipeline
- [ ] Develop test performance monitoring
- [ ] Create developer guide for testing best practices
- [ ] Establish test review checklist for code reviews

---

## Source Files Consolidated

This PRD consolidates content from the following design/codeStandards files:

- `evaluatingUnitTests.md` - Unit test quality assessment rubric and philosophy
- `evaluatingPlaywrightTests.md` - End-to-end test evaluation criteria and best practices
- `testNamingStandards.md` - File naming and test structure conventions
- `docs/TestValuePolicy.md` - Detailed rubrics and examples for high-value tests
- `docs/testing-guide.md` - Fake timer playbook, readiness helpers, and operational testing workflows
- `docs/technical/classicBattleTesting.md` - Classic Battle promise utilities and rebinding policy
