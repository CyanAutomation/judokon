# Testing Guide

This document provides comprehensive testing strategies, utilities, and best practices for JU-DO-KON!

## Test Suites

### Unit Tests

Run with Vitest:

```bash
npx vitest run
```

### Integration Tests

Run with Playwright:

```bash
npx playwright test
```

### Style Tests

Run on demand:

```bash
npm run test:style
```

## Fake Timers Playbook

JU-DO-KON! uses Vitest fake timers for deterministic testing of time-dependent code. Follow this canonical pattern to avoid flaky tests and ensure consistent behavior.

### Preferred Setup Pattern

**Use the canonical helper instead of calling `vi.useFakeTimers()` directly:**

```js
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

### Async Timer Helpers

**Always use async timer methods for reliable execution:**

```js
// ✅ Preferred: Async execution ensures proper sequencing
await timers.runAllTimersAsync();
await timers.advanceTimersByTimeAsync(1000);

// ❌ Avoid: Synchronous methods can cause race conditions
timers.runAllTimersAsync(); // Missing await!
vi.runAllTimers(); // Not async-safe
```

### Wrapper Pattern for Simple Tests

**For tests that need timers throughout execution:**

```js
import { withFakeTimers } from "../setup/fakeTimers.js";

it(
  "should work with timers",
  withFakeTimers(async () => {
    setTimeout(() => doSomething(), 100);
    await runAllTimersAsync();
    expect(somethingDone).toBe(true);
  })
);
```

### Mixing with RAF Mocks

**When testing code that uses both timers and RAF:**

```js
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { install, uninstall } from "../helpers/rafMock.js";

describe("Timer + RAF Test", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    install();
  });

  afterEach(() => {
    uninstall();
    timers.cleanup();
  });

  it("should coordinate timers and animation frames", async () => {
    // Test code that uses both setTimeout and requestAnimationFrame
    setTimeout(() => requestAnimationFrame(() => (done = true)), 100);
    await timers.advanceTimersByTimeAsync(100);
    flushAll(); // From rafMock
    expect(done).toBe(true);
  });
});
```

### Anti-Patterns to Avoid

**❌ Don't call `vi.useFakeTimers()` directly:**

```js
// Avoid this - use useCanonicalTimers() instead
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
```

**❌ Don't use synchronous timer methods in async contexts:**

```js
// Avoid this - can cause timing issues
setTimeout(() => callback(), 100);
vi.runAllTimers(); // Not async-safe
```

**❌ Don't mix real and fake timers:**

```js
// Avoid this - leads to flaky tests
vi.useFakeTimers();
// ... some test code that accidentally uses real timers
```

### Migration Guide

**Replace existing patterns:**

```js
// Old pattern - replace with useCanonicalTimers()
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// New pattern
beforeEach(() => (timers = useCanonicalTimers()));
afterEach(() => timers.cleanup());
```

## Playwright Testing

### Stable Readiness Patterns

**Preferred readiness waits:**

- `await page.evaluate(() => window.battleReadyPromise)`: Detect Classic Battle page full initialization
- `await waitForBattleReady(page)`: Helper shortcut for battle readiness
- `await waitForSettingsReady(page)`: Helper shortcut for settings readiness
- `await waitForBattleState(page, "waitingForPlayerAction", 10000)`: Wait for specific machine state

**Avoid brittle patterns:**

- Waiting for header timer element (`#next-round-timer`) visibility at page load
- Targeting initial pre-match countdown (rendered via snackbar, not header timer)

**Recommended state targeting:**

- Wait for selection prompt snackbar (e.g., "Select your move")
- Target `#stat-buttons[data-buttons-ready="true"]` for round start readiness

### Test Helpers

Available in `playwright/fixtures/waits.js`:

- `waitForBattleReady(page)` and `waitForSettingsReady(page)`
- `waitForBattleState(page, state, timeout)`: Rejects if state isn't reached within timeout

### Screenshot Testing

**Storage location:** `playwright/*-snapshots/`

**Skip screenshots locally:**

```bash
SKIP_SCREENSHOTS=true npx playwright test
```

**Update snapshots after UI changes:**

```bash
npx playwright test --update-snapshots
```

## Specialized Testing

### CSS Tooling

Color contrast tests parse custom properties with PostCSS directly, relying on standard CSS tooling instead of bespoke parsers.

### DOM Regression Testing

The test suite includes a DOM regression test (`tests/pages/battleJudoka.dom.test.js`) that:

- Loads `battleJudoka.html`
- Fails if required IDs are missing: `next-button`, `stat-help`, `quit-match-button`, `stat-buttons`

### Timer Testing

Classic Battle timer logic testing covers:

- State snapshots and readiness helpers (`timerUtils.js`)
- Stat-selection fallbacks when timers drift or stall (`autoSelectHandlers.js`)
- Pause/resume flow for modals and tab switches

### Battle Engine Testing

The engine exposes events for testing:

- `roundStarted` → `{ round }`
- `roundEnded` → `{ delta, outcome, matchEnded, playerScore, opponentScore }`
- `timerTick` → `{ remaining, phase: 'round' | 'cooldown' }`
- `matchEnded` → same payload as `roundEnded`
- `error` → `{ message }`

## Skip Button Testing

The game includes a **Skip** button that bypasses current round and cooldown timers. Use it to fast-forward through matches when debugging or running rapid gameplay tests.

## Country Panel Testing

On the Browse Judoka page:

- Country filter panel starts with `hidden` attribute
- When revealed, must include `aria-label="Country filter panel"` for accessibility and Playwright tests
- Country slider loads asynchronously after panel opens

## CLI Testing

CLI-specific tests live in `playwright/battle-cli.spec.js` and verify:

- State badge functionality
- Verbose log behavior
- Keyboard selection flow

## Quality Standards

For comprehensive testing quality standards, including anti-patterns and preferred patterns for both unit and Playwright tests, see:

- [PRD: Testing Standards – Quality Verification Commands](../design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference)
- [AGENTS.md](../AGENTS.md#unit-test-quality-standards) - Unit test standards
- [AGENTS.md](../AGENTS.md#playwright-test-quality-standards) - Playwright test standards

## Related Documentation

- [Test Mode automation hooks](../design/productRequirementsDocuments/prdTestMode.md#mode-interactions-and-automation-hooks) - Headless mode, readiness promises, and feature flag governance
- [Battle CLI Guide](./battle-cli.md) - CLI-specific testing
- [Battle Scoreboard PRD](../design/productRequirementsDocuments/prdBattleScoreboard.md#dom-integration--usage) - Scoreboard DOM helpers and reset discipline
- [Battle Engine PRD](../design/productRequirementsDocuments/prdBattleEngine.md#event-subscription-api) - Event emitter contract for engine-driven tests
- [Settings Menu PRD](../design/productRequirementsDocuments/prdSettingsMenu.md#settings-api) - Cached settings helpers and feature flag lifecycle
- [Snackbar PRD](../design/productRequirementsDocuments/prdSnackbar.md#dom-container-contract) - Notification container contract and helper usage
- [Validation Commands](./validation-commands.md) - Complete command reference
- [Components](./components.md) - Component testing strategies
- [PRD: Development Standards – Validation Command Matrix](../design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks) - Complete validation workflow reference
