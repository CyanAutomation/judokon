> **Scope: Canonical architecture guide**

# Testing Architecture

This is the source-of-truth testing architecture guide for JU-DO-KON!.
Use this document for durable patterns, decision criteria, and migration direction.

## Architecture Overview

The repository uses three complementary layers:

1. **Unit tests** for isolated logic and deterministic branch coverage.
2. **Component tests** for bounded UI behavior through public component APIs.
3. **Integration tests** for end-to-end module workflows with real internal wiring and mocked externals.

Playwright browser tests remain the highest-level user workflow validation and are documented alongside these patterns where relevant.

## Choosing the Right Test Type

| Scenario                                    | Preferred level | Why                                                          |
| ------------------------------------------- | --------------- | ------------------------------------------------------------ |
| Pure logic / data transforms                | Unit            | No DOM dependency; fastest and most deterministic            |
| Small UI behavior in one component          | Component       | Exercises user-visible behavior without full page complexity |
| Initialization flow / multi-module behavior | Integration     | Verifies production wiring and module collaboration          |
| Full user journey in browser                | Playwright      | Validates real runtime and rendering stack                   |

## Unit Architecture Pattern (Vitest 3.x)

Use this when isolating one unit and mocking all dependencies.

1. Create shared mock references with `vi.hoisted()`.
2. Register `vi.mock()` at top-level only.
3. Setup a fresh harness in `beforeEach` using `createSimpleHarness()`.
4. Import modules **after** `harness.setup()`.
5. Configure per-test mock behavior (`mockResolvedValue`, `mockRejectedValue`, etc.).

```js
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("../../src/services/api.js", () => ({ fetchData: mockFetch }));

beforeEach(async () => {
  mockFetch.mockReset();
  harness = createSimpleHarness();
  await harness.setup();
});
```

## Integration Architecture Pattern

Use this when validating workflows across multiple real internal modules.

1. Mock only external dependencies (network, storage, browser APIs).
2. Keep internal modules real.
3. Inject fixtures through `createSimpleHarness({ fixtures })`.
4. Clean up harness state after each test.
5. Assert observable workflow outcomes, not implementation internals.

```js
harness = createSimpleHarness({
  fixtures: {
    localStorage: createMockLocalStorage(),
    fetch: createMockFetch()
  },
  useFakeTimers: true
});
await harness.setup();
```

## DOM Strategy: Behavior First

Prefer behavior-driven interaction over direct DOM mutation.

- ✅ Use component/public APIs and user-like interactions.
- ✅ Use real page structure for initialization and accessibility-sensitive flows.
- ❌ Avoid brittle manual DOM construction for complex integration scenarios.
- ❌ Avoid synthetic implementation-detail assertions that bypass runtime behavior.

## Anti-Patterns to Avoid

- `vi.doMock()` in hooks for core dependency mocking.
- Importing module-under-test before harness setup.
- Unsilenced `console.warn/error` in tests.
- Real timers for deterministic unit/integration checks.
- Hardcoded wait timing in Playwright when condition waits are available.

## Migration Strategy

1. **Identify high-value candidates**: flaky tests, initialization flows, accessibility assertions.
2. **Classify scope**: unit vs component vs integration.
3. **Migrate to top-level mock + harness patterns**.
4. **Preserve behavior coverage** with happy-path + edge-case assertions.
5. **Remove deprecated patterns** once replacement is validated.

## Validation Expectations

Run targeted checks based on changed scope.

```bash
npx vitest run <relevant-test-files>
npx eslint .
npx prettier . --check
npm run check:jsdoc
```

Optional hygiene checks:

```bash
grep -RInE "console\.(warn|error)\(" tests --exclude=client_embeddings.json | grep -v "tests/utils/console.js"
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null
```

## Template and Example References

- `tests/examples/unit.test.js` — unit mocking template.
- `tests/helpers/integrationHarness.js` — harness implementation.
- `tests/helpers/integrationHarness.test.js` — harness behavior tests.
- `tests/helpers/settingsPage.test.js` — migrated modern harness usage.

## Quickstart Companion

For a compact authoring checklist, see `tests/TESTING_ARCHITECTURE.md`.
