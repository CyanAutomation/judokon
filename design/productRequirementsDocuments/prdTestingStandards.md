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

<a id="unit-test-quality-standards"></a>

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

#### Implementation Guidance by Criterion

##### Intent Clarity

- Begin files with optional metadata headers (`Spec-ID`, linked PRD, component under test) to establish traceability.
- Use descriptive `describe`/`it` strings that follow the "should when" or "given/when/then" pattern so the reader understands intent immediately.

```javascript
/**
 * Spec-ID: AUTH-001
 * Linked-Req: PRD-4.2 (User Login)
 * Covers: src/helpers/auth.js
 */
describe("authenticate", () => {
  it("should return a user object on successful authentication", () => {
    // ...
  });
});
```

##### Behavioral Relevance

- Anchor tests to real requirements, bug reports, or production incidents whenever possible.
- Focus on observable behavior; avoid tests that only guard implementation details or reassert library internals.

##### Assertion Quality

- Prefer semantic assertions (`toEqual`, `toHaveBeenCalledWith`, explicit DOM queries) over snapshots to make failures actionable.
- Avoid snapshot-only checks unless paired with targeted assertions that explain why the failure matters.

```javascript
it("should return the correct user payload", () => {
  const user = { id: 1, name: "Alice" };
  expect(authenticate("valid", "creds")).toEqual(user);
});
```

##### Isolation and Robustness

- Use the canonical fake timer helpers (see [Fake Timer Playbook](#fake-timer-playbook)) to keep asynchronous flows deterministic.
- Keep mocking surface area lean (≤4 spies per test) and reset mocks/timers in `afterEach` to avoid cross-test pollution.

```javascript
it("should time out after 5000ms", async () => {
  const timers = useCanonicalTimers();
  let called = false;
  setTimeout(() => (called = true), 5000);
  await timers.advanceTimersByTimeAsync(5000);
  expect(called).toBe(true);
  timers.cleanup();
});
```

##### Cost vs Coverage

- Target the highest-signal scenarios first (critical paths, regression reproductions) and avoid redundant tests.
- Keep runtimes short by favoring deterministic async helpers over real timers and minimizing expensive setup.

<a id="playwright-test-guidelines"></a>

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

#### Implementation Guidance by Criterion

##### Intent Clarity

- Document the scenario with metadata headers (Spec-ID, linked requirement) and use descriptive test names describing the user goal and outcome.

```javascript
/**
 * Spec-ID: CART-003
 * Linked-Req: PRD-7.1 (Add to Cart)
 */
test("should allow user to add an item to the cart from the product page", async ({ page }) => {
  // ...
});
```

##### Behavioral Relevance

- Cover critical or high-risk flows first—checkout, authentication, match resolution—and link to the owning PRD section.
- Ensure tests assert visible outcomes (snackbars, aria-live regions, scoreboard updates) rather than internal implementation cues.

##### Assertion Quality

- Prefer web-first locators (`getByRole`, `getByTestId`, `getByText`) and explicit expectations.

```javascript
const submitButton = page.getByRole("button", { name: /Sign In/i });
await submitButton.click();
await expect(page.getByText("Welcome, Alice!")).toBeVisible();
```

##### Robustness

- Lean on Playwright's auto-waiting by using `await expect(...).toBeVisible()` instead of manual sleeps.
- Never call `page.waitForTimeout()` in production tests; treat flakes as critical bugs and run `npm run e2e:flake-scan` to enforce discipline.

##### Performance

- Keep flows short, re-use fixtures, and parallelize where safe. If a wait is required, tie it to a readiness helper (see [Playwright Readiness Helpers](#playwright-readiness-helpers)) instead of arbitrary delays.

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

<a id="fake-timer-playbook"></a>

### Fake Timer Playbook (P1)

**Purpose:** Ensure deterministic, fast tests for time-dependent logic by enforcing a canonical fake timer workflow.

#### Canonical Helper Usage

- Import `useCanonicalTimers` from `setup/fakeTimers.js` and capture the helper in `beforeEach`.
- Call `timers.cleanup()` in `afterEach` to restore the environment and run pending timers.

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

#### Async-First Timer Controls

- Always `await` async timer helpers (`runAllTimersAsync`, `advanceTimersByTimeAsync`).
- Avoid synchronous variants (`vi.runAllTimers()`, missing `await`) that can desynchronize Promises.

```javascript
await timers.runAllTimersAsync();
await timers.advanceTimersByTimeAsync(1000);
```

#### Wrapper Pattern

- Use `withFakeTimers` for concise tests that need timers throughout execution.

```javascript
import { withFakeTimers } from "../setup/fakeTimers.js";

it(
  "should work with timers",
  withFakeTimers(async ({ timers }) => {
    let done = false;
    setTimeout(() => {
      done = true;
    }, 100);
    await timers.runAllTimersAsync();
    expect(done).toBe(true);
  })
);
```

#### Mixed Timer + RAF Scenarios

- Pair canonical timers with RAF mocks when animation frames participate in the workflow.

```javascript
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { install, uninstall, flushAll } from "../helpers/rafMock.js";

describe("Timer + RAF Test", () => {
  let timers;
  let done;

  beforeEach(() => {
    timers = useCanonicalTimers();
    install();
    done = false;
  });

  afterEach(() => {
    uninstall();
    timers.cleanup();
  });

  it("should coordinate timers and animation frames", async () => {
    setTimeout(() => requestAnimationFrame(() => (done = true)), 100);
    await timers.advanceTimersByTimeAsync(100);
    flushAll();
    expect(done).toBe(true);
  });
});
```

#### Anti-Patterns to Avoid

- Do **not** call `vi.useFakeTimers()` directly—always go through the canonical helper.
- Never mix real and fake timers inside the same test.
- Avoid synchronous timer APIs in async tests.

#### Migration Guidance

- Replace legacy `beforeEach(() => vi.useFakeTimers())` patterns with `useCanonicalTimers()` and ensure cleanup occurs.

<a id="playwright-readiness-helpers"></a>

### Playwright Readiness Helpers (P1)

**Goal:** Promote robust, declarative readiness checks for Classic Battle and supporting surfaces.

- Prefer promise-based readiness helpers over DOM element heuristics.
- Recommended waits:
  - `await page.evaluate(() => window.battleReadyPromise)` – full Classic Battle initialization
  - `await waitForBattleReady(page)` – canonical helper for battle readiness
  - `await waitForSettingsReady(page)` – settings menu readiness helper
  - `await waitForBattleState(page, "waitingForPlayerAction", 10000)` – explicit state targeting
- Avoid brittle waits such as checking `#next-round-timer` visibility or the initial countdown snackbar.
- Target ready selectors like `#stat-buttons[data-buttons-ready="true"]` and snackbar prompts (e.g., "Select your move").
- Helpers live in `playwright/fixtures/waits.js` and reject if readiness is not achieved within the timeout window.

#### Screenshot Discipline

- Store screenshots in `playwright/*-snapshots/`.
- Skip screenshots locally with `SKIP_SCREENSHOTS=true npx playwright test`.
- Update snapshots intentionally with `npx playwright test --update-snapshots`.

### Specialized Testing Surfaces (P2)

- **CSS Tooling:** Color contrast tests parse CSS custom properties via PostCSS; use shared tooling rather than bespoke parsers.
- **DOM Regression:** `tests/pages/battleJudoka.dom.test.js` enforces DOM contracts (`next-button`, `stat-help`, `quit-match-button`, `stat-buttons`).
- **Timer Scenarios:** Timer suites cover `timerUtils.js`, `autoSelectHandlers.js`, and pause/resume flows to guard against drift.
- **Battle Engine Events:** The engine emits `roundStarted`, `roundEnded`, `timerTick`, `matchEnded`, and `error` payloads for deterministic assertions.
- **Skip Button:** Use the Skip control to bypass cooldowns during manual debugging or scripted runs.
- **Country Panel:** Ensure the Browse Judoka country panel toggles `hidden`, exposes `aria-label="Country filter panel"`, and loads sliders lazily.
- **CLI Testing:** `playwright/battle-cli.spec.js` validates CLI badges, verbose logging, and keyboard selection flows.

<a id="classic-battle-promise-utilities"></a>

### Classic Battle Promise Utilities (P1)

**Purpose:** Provide deterministic hooks for Classic Battle orchestration in unit and integration tests.

- `tests/helpers/initClassicBattleTest.js` exports `initClassicBattleTest({ afterMock } = {})`.
  - Use `afterMock: true` immediately after `vi.doMock(...)` to reset bindings via `__resetClassicBattleBindings()` and `__ensureClassicBattleBindings({ force: true })`.
  - Returns the Classic Battle module with battle API and test hooks.
- Event binding policy:
  - Runtime modules bind listeners at import time; rebinding ensures mocks applied during the test are honored.
  - `__ensureClassicBattleBindings({ force })` resets the event bus; `resetBattlePromises()` guarantees fresh awaitables.
- Preferred synchronization promises from `src/helpers/classicBattle/promises.js`:
  - `getRoundPromptPromise()` – selection prompt displayed (snackbar)
  - `getCountdownStartedPromise()` – countdown initiated (snackbar)
  - `getRoundResolvedPromise()` – outcome finalized (`#round-message`)
  - `getRoundTimeoutPromise()` – selection timeout path active
  - `getStatSelectionStalledPromise()` – stall prompt surfaced
- UI assertion surfaces:
  - Outcome messaging → `#round-message`
  - Countdown and hints → snackbar via `showSnackbar`/`updateSnackbar`
- Test-mode determinism:
  - `startRound()` emits `roundPrompt` immediately for tests.
  - `selectionHandler` and timeout helpers surface stall prompts deterministically.
  - `__triggerStallPromptNow(store)` allows immediate stall prompt invocation.
- State transition listeners:
  - `onBattleEvent('battleStateChange', ...)` drives DOM mirroring, debug logs, and promise resolution via `domStateListener`, `createDebugLogListener`, and `createWaiterResolver`.
- Debug hooks:
  - `exposeDebugState` and `readDebugState` can be spied on to inspect internal values without mutating globals.

### Quality Verification Commands (Operational Reference)

Operational tooling complements the qualitative rubrics above. These commands help contributors audit test suites for common anti-patterns and reinforce JU-DO-KON!'s testing discipline. Pair them with the validation matrix in [PRD: Development Standards](./prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks).

```bash
# Unit test quality verification
echo "Checking unit test patterns..."
grep -r "dispatchEvent\|createEvent" tests/ && echo "❌ Found synthetic events" || echo "✅ No synthetic events"
grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "❌ Found unsilenced console" || echo "✅ Console discipline maintained"
grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "❌ Found real timers" || echo "✅ Timer discipline maintained"

# Playwright test quality verification
echo "Checking Playwright test patterns..."
grep -r "waitForTimeout\|setTimeout" playwright/ && echo "❌ Found hardcoded waits" || echo "✅ No hardcoded timeouts"
grep -r "page\.evaluate.*DOM\|innerHTML\|appendChild" playwright/ && echo "❌ Found DOM manipulation" || echo "✅ No DOM manipulation"
echo "Semantic selectors count:" && grep -r "data-testid\|role=\|getByLabel" playwright/ | wc -l
```

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
