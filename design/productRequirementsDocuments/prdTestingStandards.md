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

<!-- id: unit-test-quality-standards -->

### 1. Unit Test Quality Standards (P1)

**Core Philosophy:**

- **Behavior-focused**: Tests verify observable behavior, not implementation details
- **High-signal**: Test failures clearly indicate genuine problems
- **Low-cost**: Tests are fast, reliable, and easy to maintain

**Quality Evaluation Rubric (0-10 scale):**

#### Intent Clarity (Unit Tests) (Weight: 2)

- Descriptive test titles using 'should', 'when', 'given/then' patterns
- Clear links to requirements or specifications
- Tests clearly state expected behavior

#### Behavioral Relevance (Unit Tests) (Weight: 2)

- Tests relate to required features or documented bug fixes
- Linked to PRDs, issue trackers, or bug reports
- Cover critical user-facing functionality

#### Assertion Quality (Unit Tests) (Weight: 2)

- High-quality semantic assertions (`.toEqual`, `.toBeCalledWith`)
- Minimal reliance on snapshot-only tests
- Precise, meaningful validation of behavior

#### Isolation and Robustness (Unit Tests) (Weight: 2)

- Proper test isolation from external factors
- Use of fake timers (`vi.useFakeTimers`) for time-dependent tests
- Minimal heavy mocking (fewer than 4 spies per test)

#### Cost vs Coverage (Unit Tests) (Weight: 2)

- Efficient test execution time

### 2. Playwright Test Guidelines (P1)

Core philosophy

- User-centric: model realistic user journeys
- Robust & reliable: consistent results, free from flakiness
- Efficient: fast and reliable execution

Quality evaluation (0-10 scale)

#### Intent Clarity (Playwright) (Weight: 2)

- Use clear user flow descriptions (given/when/then) and link tests to requirements where possible.

#### Behavioral Relevance (Playwright) (Weight: 2)

- Cover critical user paths; assert visible outcomes (snackbars, aria-live regions, scoreboard updates).

#### Assertion Quality (Playwright) (Weight: 2)

- Prefer web-first locators (`getByRole`, `getByTestId`, `getByText`) and explicit semantic expectations.

#### Robustness (Playwright) (Weight: 2)

- Use stable locators, proper wait conditions, and avoid hardcoded delays.

#### Performance (Playwright) (Weight: 2)

- Keep flows short, parallelize safely, and minimize resource consumption.

Best practices

- Use `data-testid` attributes for automation-specific selectors.
- Prefer condition-based waiting (`waitForSelector`, `waitForLoadState`) over `waitForTimeout`.
- Structure tests to reflect real user workflows.

Automated evaluation workflow (Playwright)

- Run `npm run e2e:flake-scan` to execute Playwright specs three times and measure flakiness.
- Use `npm run e2e:value` to produce `reports/pw-test-value/pw-test-value.json` and a Markdown summary when a report exists.
- CI will block tests scoring ≤4; reference `.github/workflows/pw-test-value.yml` for enforcement details.

Implementation guidance

##### Intent clarity

Document scenarios with metadata headers (`Spec-ID`, `Linked-Req`) and give descriptive test names.

```javascript
/**
 * Spec-ID: CART-003
 * Linked-Req: PRD-7.1 (Add to Cart)
 */
test("should allow user to add an item to the cart from the product page", async ({ page }) => {
  // ...
});
```

##### Behavioral relevance

- Prioritize high-value flows (checkout, authentication, match resolution) and assert visible UI outcomes.

##### Assertion quality

Prefer web-first locators and explicit expectations:

```javascript
const submitButton = page.getByRole("button", { name: /Sign In/i });
await submitButton.click();
await expect(page.getByText("Welcome, Alice!")).toBeVisible();
```

##### Robustness

- Rely on Playwright's auto-waiting and avoid `page.waitForTimeout()` in production specs.

##### Performance

- Reuse fixtures, keep tests short, and prefer readiness helpers (see Playwright Readiness Helpers) when waiting for complex conditions.
- Proper muting instances: 32

Patterns

- ❌ Raw spying (to migrate):

```javascript
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
// ... test code
errorSpy.mockRestore();
```

- ✅ Preferred (mute around the code that logs):

```javascript
import { withMutedConsole } from "../utils/console.js";

await withMutedConsole(async () => {
  // Test code that would normally error/warn
});
```

- ✅ Allowed pattern for tests that assert logs:

```javascript
import { withAllowedConsole } from "../utils/console.js";

await withAllowedConsole(async () => {
  // Test code where specific warnings/errors are expected
});
```

Migration guidance

- Replace instances of `vi.spyOn(console, ...)` with `withMutedConsole` when the test should not assert on logs.
- Use `withAllowedConsole` when the test verifies specific console output as part of behavior.
- Avoid blind bulk sed replacements; prefer targeted changes for complex test files. Validate each migrated file by running the file's tests locally.

Priority files (top migration targets):

- `tests/helpers/dataUtils.test.js`
- `tests/helpers/errorUtils.test.js`
- `tests/helpers/classicBattle/debugIntegration.test.js`
- `tests/helpers/timerService.cooldownGuard.test.js`
- `tests/helpers/carouselController.test.js`
- `tests/helpers/tooltip.test.js`
- `tests/helpers/showSettingsError.test.js`
- `tests/helpers/cardUtils.test.js`
- `tests/helpers/classicBattle/uiHelpers.missingElements.test.js`
- `tests/helpers/tooltipViewerPage.test.js`

Verification commands

- Check for remaining unsilenced console calls in tests (already referenced in PRD: Development Standards):

```bash
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"
```

- Run individual file tests after migration:

```bash
npm run test -- tests/helpers/dataUtils.test.js --reporter=verbose
```

Notes & edge cases

- Some tests intentionally assert console output; convert those to `withAllowedConsole` rather than muting them.
- Ensure mocks and spies are restored/cleaned in `afterEach` to avoid cross-test pollution.
- When automating migration, exclude `tests/utils/console.js` from greps and CI checks to avoid false positives.

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

#### Automated Evaluation Workflow (Unit Tests)

#### Automated Evaluation Workflow (Playwright)

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

### Fake Timer Playbook (P1) {#fake-timer-playbook}

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

### Scheduler Test Controller Playbook (P1) {#scheduler-test-controller-playbook}

**Purpose:** Provide deterministic `requestAnimationFrame` control for scheduler-driven features without global monkey-patching.

#### API Snapshot

- `createTestController()` is a test-only export from `src/utils/scheduler.js` that is available when `__TEST__` is true.
- Injects a controllable timing source into the scheduler instead of mutating global `requestAnimationFrame`.
- Each controller instance is isolated to the test that created it.
- Core methods:
  - `advanceFrame()` triggers a single RAF tick and executes callbacks queued via scheduler frame APIs.
  - `advanceTime(ms)` fast-forwards the scheduler clock by the provided milliseconds, executing every frame that would have fired in that window and triggering per-second callbacks.
  - `getFrameCount()` returns how many frames have executed.
  - `dispose()` restores real timing sources when the test completes.

#### Usage Example

```javascript
import { createTestController, onFrame, onSecondTick } from "../utils/scheduler.js";

describe("animation scheduler", () => {
  let controller;
  let frames;
  let seconds;

  beforeEach(() => {
    controller = createTestController();
    frames = 0;
    seconds = 0;

    onFrame(() => {
      frames += 1;
    });

    onSecondTick(() => {
      seconds += 1;
    });
  });

  afterEach(() => {
    controller.dispose();
  });

  it("separates single-frame ticks from larger time skips", () => {
    controller.advanceFrame();
    expect(frames).toBe(1);
    expect(seconds).toBe(0);

    controller.advanceTime(1000);
    expect(frames).toBeGreaterThan(1);
    expect(seconds).toBe(1);
  });
});
```

Use `advanceFrame()` when you want to execute exactly one RAF tick (e.g., stepping through choreographed animations). Use `advanceTime(ms)` when the behavior depends on elapsed time—this fast-forwards through as many frames as fit into the requested window and fires any per-second callbacks that would have triggered along the way.

#### Migration Plan

1. **Phase 1 – Enable hooks:** Add the test-only export and timing source injection with unit coverage that verifies (a) both frame and second-tick callbacks are driven by the injected timing source and (b) real timing sources are restored when the controller is disposed.
2. **Phase 2 – Adopt hooks:** Replace global `requestAnimationFrame` patches in tests with `createTestController()` usage and remove monkey-patching.
3. **Phase 3 – Document:** Update testing guides, add examples, and officially deprecate the legacy patterns.

#### Risk & Mitigation

- **Low production risk:** Hook exists only in test builds and does not modify the public scheduler API.
- **Feature flag ready:** Can be guarded for incremental rollout if regressions surface.
- **Coverage-first:** Acceptance criterion — all existing RAF-dependent tests must pass using both the legacy helpers and the new controller before migration is considered complete.
- **Documentation-first:** Centralized guidance (this playbook) reduces misconfiguration during migration.

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

### Playwright Readiness Helpers (P1) {#playwright-readiness-helpers}

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

### Test API Surface (P1) {#test-api-surface}

**Purpose:** Document the public, stable test API exposed for deterministic Playwright and browser tests.
This section mirrors the guidance in `tests/README.md` (“Public Test API” and “Private Test Fixtures”) so
PRDs align with the actual test guidance.

#### Exposure & Gating Requirements

- The public test API is mounted on `window.__TEST_API` by `exposeTestAPI()` when **test mode is active**.
- `exposeTestAPI()` is invoked during page boot in:
  - `src/pages/battleClassic.init.js`
  - `src/pages/battleCLI.init.js`
  - `src/pages/battleCLI/init.js` (CLI HTML runtime bundle)
- Test mode is determined by `src/helpers/testApi.js`:
  - Node test flags (`NODE_ENV=test`, `VITEST`)
  - Browser flags (`window.__TEST__`, `window.__PLAYWRIGHT_TEST__`)
  - Localhost URL heuristics or automation navigator hints
  - Feature flag fallback (`enableTestMode`)
- When mounted, `window.__TEST_API` is accompanied by convenience aliases:
  - `window.__BATTLE_STATE_API`, `window.__TIMER_API`, `window.__INIT_API`,
    `window.__INSPECT_API`, `window.__VIEWPORT_API`, `window.__ENGINE_API`
- Page-specific helpers extend the shared surface:
  - Browse carousel helpers register under `window.__TEST_API.browse`.
  - Random Judoka helpers register under `window.__TEST_API.randomJudoka`.

> **Cross-reference:** See `tests/README.md` sections:
> - “Public Test API” for stable usage expectations.
> - “Private Test Fixtures” for `window.testFixtures` helpers that are intentionally unstable.

#### Public Namespaces & Typical Usage

| Namespace | Representative APIs | Purpose |
| --- | --- | --- |
| `init` | `waitForBattleReady`, `configureClassicBattle`, `resetBattleCliModuleState`, `getInitPromises`, `waitForBrowseReady` | Orchestrate deterministic setup and readiness. |
| `state` | `getBattleState`, `dispatchBattleEvent`, `waitForBattleState`, `waitForRoundsPlayed`, `waitForStatButtonsReady`, `waitForMatchCompletion` | Read/drive state transitions with event-based synchronization. |
| `timers` | `setCountdown`, `getCountdown`, `waitForCountdown`, `expireSelectionTimer`, `skipCooldown`, `setOpponentResolveDelay`, `getOpponentResolveDelay`, `clearAllTimers` | Control timers and opponent delay for deterministic timing. |
| `inspect` | `getBattleStore`, `getBattleSnapshot`, `getFeatureFlags`, `getStatButtonSnapshot`, `getRoundStatComparison`, `getStatButtonListenerSnapshot`, `pickAdvantagedStatKey`, `resetCache` | Snapshot inspection for assertions without DOM mutation. |
| `cli` | `resolveRound`, `completeRound`, `readVerboseLog` | Deterministic CLI battle resolution and diagnostics. |
| `engine` | `require`, `setPointsToWin`, `getPointsToWin`, `waitForPointsToWin`, `getScores`, `getRoundsPlayed`, `waitForRoundsPlayed` | Battle engine control for target scores and diagnostics. |
| `viewport` | `setZoom`, `resetZoom` | Simulate zoom behavior in browser tests. |
| `autoSelect` | `triggerAutoSelect`, `setAutoContinue`, `getAutoContinue` | Control auto-select and round continuation behavior. |
| `statButtons` | `getSnapshot`, `waitForReady` (from `statButtonTestSignals`) | Read stat button readiness and IDs when needed for assertions. |
| `browse` | `disableHoverAnimations`, `enableHoverAnimations`, `addCard`, `clearCarouselCards`, `whenCarouselReady`, `getSnapshot` | Browse page hooks used by Playwright fixtures. |
| `randomJudoka` | `setDrawButtonLabel`, `resolveDrawPipeline`, `getPreferences` | Random Judoka page-specific testing hooks. |

#### Private Test Fixtures (Playwright-only)

`window.testFixtures` is intentionally unstable and reserved for fixture-driven behaviors
(`playwright/fixtures/`). Keep these helpers documented in `tests/README.md` and avoid
promoting them as public PRD-stable APIs.

### Specialized Testing Surfaces (P2)

- **CSS Tooling:** Color contrast tests parse CSS custom properties via PostCSS; use shared tooling rather than bespoke parsers.
- **DOM Regression:** `tests/pages/battleJudoka.dom.test.js` enforces DOM contracts (`next-button`, `stat-help`, `quit-match-button`, `stat-buttons`).
- **Timer Scenarios:** Timer suites cover `timerUtils.js`, `autoSelectHandlers.js`, and pause/resume flows to guard against drift.
- **Battle Engine Events:** The engine emits `roundStarted`, `roundEnded`, `timerTick`, `matchEnded`, and `error` payloads for deterministic assertions.
- **Skip Button:** Use the Skip control to bypass cooldowns during manual debugging or scripted runs.
- **Country Panel:** Ensure the Browse Judoka country panel toggles `hidden`, exposes `aria-label="Country filter panel"`, and loads sliders lazily.
- **CLI Testing:** `playwright/battle-cli.spec.js` validates CLI badges, verbose logging, and keyboard selection flows.

### Classic Battle Promise Utilities (P1) {#classic-battle-promise-utilities}

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

This PRD consolidates content previously housed in `design/codeStandards/` (now retired) and the supporting automation scripts:

- `evaluatingUnitTests.md` — Unit test quality rubric, workflow (`npm run test:value`, `npm run mutate`), and report outputs in `reports/test-value/`
- `evaluatingPlaywrightTests.md` — Playwright evaluation rubric, flake scan workflow (`npm run e2e:flake-scan`, `npm run e2e:value`), and reports in `reports/pw-test-value/`
- `testNamingStandards.md` — File naming, describe/it conventions, and intent-driven messaging
- `scripts/test-value-evaluator.js`, `scripts/utils/assertionScanner.js`, `scripts/utils/headerParser.js` — Unit test scoring implementation
- `scripts/pw-value-evaluator.js`, `scripts/utils/pwAssertionScanner.js` — Playwright scoring implementation
- `.github/workflows/test-value.yml`, `.github/workflows/pw-test-value.yml` — CI enforcement hooks for low-value tests
