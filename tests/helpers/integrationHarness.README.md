# Integration Test Harness

The Integration Test Harness provides a reusable template for writing integration-style tests that boot real modules with deterministic externalities instead of heavy inline mocking.

## Philosophy

Traditional unit tests often mock everything, leading to brittle tests that break when internal implementations change. Integration tests boot real modules but control externalities (timers, network calls, browser APIs) to ensure deterministic behavior.

## Key Benefits

- **Resilient to refactoring**: Tests real module interactions, not mocked internals
- **Fewer false negatives**: Less likely to pass when code is broken
- **Better coverage**: Exercises actual code paths used in production
- **Easier maintenance**: Less mocking code to maintain

## Basic Usage

```js
import { createIntegrationHarness } from "../helpers/integrationHarness.js";

const harness = createIntegrationHarness({
  fixtures: {
    localStorage: mockLocalStorage,
    matchMedia: () => ({ matches: false })
  },
  mocks: {
    // Only mock true externalities
    "../../src/helpers/fetchJson.js": () => mockFetch
  }
});

describe("My Feature", () => {
  beforeEach(async () => {
    await harness.setup();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("works end-to-end", async () => {
    const { myFunction } = await harness.importModule("../../src/myFeature.js");
    // Test real behavior with controlled inputs
  });
});
```

## Pre-configured Harnesses

### Classic Battle Tests

```js
import { createClassicBattleHarness } from "../helpers/integrationHarness.js";

const harness = createClassicBattleHarness({
  // Additional custom config
  mocks: {
    // Add specific mocks for this test
  }
});
```

**Default fixtures:**

- `matchMedia`: Returns `{ matches: false }`

**Default mocks:**

- `showSnackbar.js`: Mocked snackbar functions

### Settings Page Tests

```js
import { createSettingsHarness } from "../helpers/integrationHarness.js";

const harness = createSettingsHarness({
  // Additional custom config
});
```

**Default fixtures:**

- `localStorage`: Mock localStorage with spies

**Default mocks:**

- `tooltip.js`: Mocked tooltip initialization

## Configuration Options

### `useFakeTimers` (boolean, default: true)

Whether to use Vitest's fake timers for deterministic timing control.

### `useRafMock` (boolean, default: true)

Whether to use the RAF mock for deterministic animation frame control.

### `fixtures` (object)

Test fixtures to inject into the global environment:

- `localStorage`: Mock localStorage implementation
- `fetch`: Mock fetch function
- `matchMedia`: Mock matchMedia function
- Custom keys: Injected as global variables

### `mocks` (object)

Selective mocks for true externalities only. Keys are module paths, values are mock factory functions.

### `setup` (function)

Custom setup function called after harness setup.

### `teardown` (function)

Custom teardown function called before harness cleanup.

## Migration Guide

### From Brittle Unit Tests

**Before (brittle):**

```js
vi.mock("../../src/internal/moduleA.js", () => ({ fn: vi.fn() }));
vi.mock("../../src/internal/moduleB.js", () => ({ fn: vi.fn() }));
// ... 30+ mocks

it("tests mocked behavior", () => {
  // Tests don't exercise real code
});
```

**After (integration):**

```js
const harness = createIntegrationHarness({
  mocks: {
    // Only external dependencies
    "../../src/external/api.js": () => mockApi
  }
});

it("tests real behavior", async () => {
  await harness.setup();
  // Boot real modules, test actual interactions
  harness.cleanup();
});
```

### Best Practices

1. **Mock only externalities**: Network calls, browser APIs, external libraries
2. **Use fixtures for determinism**: Control random data, timestamps, etc.
3. **Test observable behavior**: DOM changes, events, side effects
4. **Keep harnesses focused**: One harness per feature area
5. **Document mock rationale**: Why each external is mocked

## Examples

See `tests/helpers/integrationHarness.test.js` for comprehensive examples and `tests/helpers/classicBattle/scheduleNextRound.fallback.integration.test.js` for a real migration example.
</content>
<parameter name="filePath">/workspaces/judokon/tests/helpers/integrationHarness.README.md
