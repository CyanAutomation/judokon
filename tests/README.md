# Tests Directory

This directory contains the complete test suite for JU-DO-KON!, including unit tests, integration tests, and testing utilities.

## Testing Architecture Guides

Start here for architecture and authoring guidance:

1. **Canonical architecture guide**: [`docs/TESTING_ARCHITECTURE.md`](../docs/TESTING_ARCHITECTURE.md)
2. **Quickstart / local conventions**: [`tests/TESTING_ARCHITECTURE.md`](./TESTING_ARCHITECTURE.md)

## Directory Structure

```
tests/
├── setup/                 # Test setup and configuration
│   ├── fakeTimers.js      # Canonical fake timers helper
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

## Data Loading and Mocking Strategy

JU-DO-KON! tests need consistent access to game data (judoka, gokyo techniques, etc.). JSDOM doesn't have direct filesystem access, so we provide a centralized mocking strategy.

### Problem and Solution

**Problem:** In JSDOM environments, fetch() cannot resolve file:// URLs or relative paths to data files like `src/data/judoka.json`. This prevents state machine initialization from completing, blocking the transition to `roundSelect`.

**Solution:** We provide a three-layer approach:

1. **Test Fixtures** - Pre-built judoka and gokyo data in `tests/helpers/testDataLoader.js`
2. **Unit Test Mocking** - Individual tests use `vi.mock()` with testDataLoader
3. **Integration Test Harness** - Encapsulated setup in `tests/helpers/createBattleHarness.js`

### Using Test Fixtures

For unit tests that need data mocking, use the test data loader with vi.mock():

```js
import { 
  createMockFetchJson,
  judokaMinimalSet,
  judokaExtendedSet,
  gokyoFixtures
} from "../helpers/testDataLoader.js";

// Create the mock (minimal set: 2 judoka by default)
const mockFetch = createMockFetchJson();

// Or customize with extended set (3 judoka)
const mockFetch = createMockFetchJson({
  judoka: judokaExtendedSet,
  gokyo: gokyoFixtures
});

// Apply at module level
vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: mockFetch,
  importJsonModule: async () => ({}),
  validateWithSchema: async () => undefined
}));
```

### Integration Test Harness

For integration tests involving state machine initialization, use `createBattleHarness`:

```js
import { createBattleHarness } from "../helpers/createBattleHarness.js";

describe("Battle State Machine", () => {
  let harness;

  beforeEach(async () => {
    harness = createBattleHarness({
      initialState: "waitingForMatchStart",
      stateTransitionTimeout: 5000
    });
    await harness.setup();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("transitions to roundSelect after card draw", async () => {
    // Wait for round start and card drawing
    await harness.waitForState("roundSelect");

    expect(harness.getState()).toBe("roundSelect");
  });

  it("dispatches events correctly", async () => {
    await harness.waitForState("roundSelect");
    harness.dispatchEvent("matchOver", { winner: "player" });
    await harness.waitForState("matchOver");
  });
});
```

### Available Test Data

**Minimal Judoka Set** (default):

- Player (id: 111) - US fighter, balanced stats
- Opponent (id: 114) - Japan fighter, speed-focused

**Extended Judoka Set**:

- Includes Player, Opponent, and Third Fighter (id: 117, France, lightweight specialist)

**Gokyo Fixtures**:

- id: 0 - O Goshi (hip throw)
- id: 1 - Seoi Nage (shoulder throw)
- id: 2 - De Ashi Barai (foot sweep)

### Debugging Data Loading

Enable debug logging in tests:

```js
const harness = createBattleHarness({
  enableLogs: true  // Logs state transitions and fetch calls
});
```

Or use the debug wrapper:

```js
import { createDebugTrackingFetchJson } from "../helpers/testDataLoader.js";

const mockFetch = createMockFetchJson();
const { wrapped, reportCalls } = createDebugTrackingFetchJson(mockFetch);

// Later, see all fetch calls
reportCalls();  // Logs: ["judoka", "gokyo", ...]
```

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

### Battle CLI reset reliability

Battle CLI pages must clear module-level state between navigations to avoid leaking listeners or counters across Playwright tests.
The public Test API helper `init.resetBattleCliModuleState` maintains a reset invocation counter so fixtures can verify the reset ran after each navigation.
This reliability contract is enforced by the unit test `tests/helpers/testApi.test.js` and should remain outside Playwright specs so browser suites focus on user-visible CLI behavior.

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
