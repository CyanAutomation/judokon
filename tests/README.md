# Tests Directory

This directory contains the complete test suite for JU-DO-KON!, including unit tests, integration tests, and testing utilities.

## Directory Structure

```
tests/
├── setup/                 # Test setup and configuration
│   ├── fakeTimers.js      # Canonical fake timers helper
│   ├── fakeTimers.test.js # Tests for fake timers helper
│   └── jsdom-polyfills.js # JSDOM environment setup
├── helpers/               # Test helper utilities
│   ├── rafMock.js         # Animation frame mocking helper
│   ├── componentTestUtils.js # Component testing utilities
│   └── ...
├── utils/                 # General test utilities
│   ├── console.js         # Console muting helpers
│   ├── testUtils.js       # General test utilities
│   └── ...
├── classicBattle/         # Classic battle mode tests
├── components/            # Component tests
├── integration/           # Integration tests
└── ...
```

## Fake Timers Playbook

JU-DO-KON! uses a canonical approach to fake timers for deterministic testing. See the [PRD Fake Timer Playbook](../design/productRequirementsDocuments/prdTestingStandards.md#fake-timer-playbook) for complete documentation.

### Quick Reference

**Setup fake timers in tests:**

```js
import { useCanonicalTimers } from "./setup/fakeTimers.js";

describe("My Test", () => {
  let timers;
  let done;

  beforeEach(() => {
    timers = useCanonicalTimers();
    done = false;
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("should work with timers", async () => {
    setTimeout(() => {
      done = true;
    }, 100);
    await timers.advanceTimersByTimeAsync(100);
    expect(done).toBe(true);
  });
});
```

**Available timer helpers:**
- `useCanonicalTimers()` - Setup with cleanup
- `withFakeTimers(fn)` - Auto-setup/cleanup wrapper
- `runAllTimersAsync()` - Execute all pending timers
- `advanceTimersByTimeAsync(ms)` - Advance time and execute timers

## RAF Mocking

For animation frame testing, use the standardized RAF mock:

```js
import { install, uninstall, flushAll } from "./helpers/rafMock.js";

let done;

beforeEach(() => {
  install();
  done = false;
});

afterEach(() => uninstall());

it("should handle RAF", () => {
  requestAnimationFrame(() => {
    done = true;
  });
  flushAll();
  expect(done).toBe(true);
});
```

## Test Categories

### Unit Tests (`tests/**/*.test.js`)
- Test individual functions and modules
- Use Vitest with JSDOM environment
- Focus on logic, not DOM interactions

### Integration Tests (`tests/integration/`)
- Test component interactions
- May involve multiple modules
- Still use mocking for external dependencies

### Playwright Tests (`playwright/`)
- End-to-end browser testing
- Test complete user workflows
- Located in `playwright/` directory

## Playwright Test API Surface

JU-DO-KON! uses a clear distinction between public and private test APIs for Playwright tests.

### Public Test API (`window.__TEST_API`)

The public test API provides stable, documented methods for controlling test behavior:

```js
// Timer control
window.__TEST_API.timers.expireSelectionTimer()
window.__TEST_API.timers.setCountdown(seconds)

// State management
window.__TEST_API.state.dispatchBattleEvent('matchOver')

// Battle inspection
const store = window.__TEST_API.inspect.getBattleStore()
```

**When to use:** For deterministic test flows that mirror production behavior. These APIs are stable and won't break without notice.

### Private Test Fixtures (`window.testFixtures`)

Private fixtures are injected into the page context for test-specific helpers:

```js
// Animation testing
window.testFixtures.testHooks.disableHoverAnimations()
window.testFixtures.testHooks.enableHoverAnimations()

// Quick win setup
await window.testFixtures.classicQuickWin.apply()
const target = window.testFixtures.classicQuickWin.readTarget()
```

**When to use:** For test-only functionality that shouldn't be exposed in production. These are subject to change and should be documented as private.

### Test Setup Variables

Test setup variables are injected via `page.addInitScript()`:

```js
// Timer overrides
window.__OVERRIDE_TIMERS = { roundTimer: 1 }

// Feature flags
window.__FF_OVERRIDES = { showRoundSelectModal: true }

// Test mode
window.__TEST_MODE = { enabled: true, seed: 42 }

// Cooldown settings
window.__NEXT_ROUND_COOLDOWN_MS = 500
```

**When to use:** For configuring test environment behavior. These should be moved to fixtures if they become complex.

## Running Tests

```bash
# All unit tests
npx vitest run

# Specific test file
npx vitest run tests/helpers/rafMock.test.js

# All Playwright tests
npx playwright test

# Specific Playwright test
npx playwright test battle-classic/
```

## Playwright Debugging

### Targeted Test Execution

```bash
# Run specific test by name
npx playwright test --grep "completes match with first-to-1 win condition"

# Run tests in specific file
npx playwright test playwright/battle-classic/end-modal.spec.js

# Run with video recording
npx playwright test --video=retain-on-failure
```

### Debugging Modal and UI Issues

```bash
# Capture screenshots on failure
npx playwright test --screenshot=only-on-failure

# Slow down execution for debugging
npx playwright test --slowMo=1000

# Headed mode for visual debugging
npx playwright test --headed
```

### Test Fixtures and Helpers

Located in `playwright/fixtures/`:

- `commonSetup.js` - Base test configuration
- `waits.js` - Wait helpers for UI states
- `testHooks.js` - Animation and interaction helpers
- `classicQuickWin.js` - Deterministic win setup

### Common Test Patterns

```js
// Wait for modal to appear
await waitForModalOpen(page)

// Mute console during test
await withMutedConsole(async () => {
  // Test code that might log
})

// Quick win setup
await applyQuickWinTarget(page)
```

## Test Utilities

### Console Management

```js
import { withMutedConsole } from "./utils/console.js";

await withMutedConsole(async () => {
  // Code that logs errors/warnings
});
```

### Component Testing

```js
import { createTestComponent } from "./helpers/componentTestUtils.js";

const { container, pressKey } = createTestComponent(MyComponent);
await pressKey("Enter");
```

## Best Practices

1. **Use canonical fake timers** - Always use `useCanonicalTimers()` instead of `vi.useFakeTimers()` directly
2. **Async timer methods** - Use `runAllTimersAsync()` and `advanceTimersByTimeAsync()` for reliable execution
3. **Proper cleanup** - Always cleanup timers and mocks in `afterEach`
4. **Descriptive test names** - Tests should clearly describe what behavior they're verifying
5. **Minimal mocking** - Only mock what you need to test the specific behavior

## Debugging Tests

- Enable RAF mock debug output: `RAF_MOCK_DEBUG=1 npx vitest run`
- Show test logs: `SHOW_TEST_LOGS=1 npx vitest run`
- Run with verbose output: `npx vitest run --reporter=verbose`

## Related Documentation

- [PRD: Testing Standards – Fake Timer Playbook](../design/productRequirementsDocuments/prdTestingStandards.md#fake-timer-playbook) - Canonical timer utilities
- [PRD: Testing Standards – Playwright Readiness Helpers](../design/productRequirementsDocuments/prdTestingStandards.md#playwright-readiness-helpers) - Stable readiness signals
- [PRD: Testing Standards – Quality Verification Commands](../design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference) - Quality verification
- [AGENTS.md](../AGENTS.md) - Agent-specific testing standards
