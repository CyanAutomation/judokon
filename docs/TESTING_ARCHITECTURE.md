# Testing Architecture Templates

This repository includes a few **template suites** that illustrate modern harness patterns without being part of the functional CI surface. The suites are skipped in CI to keep runtime focused on real product coverage.

## Template Suites

- `tests/examples/unit.test.js` – top-level mocking pattern for unit tests.
- `tests/examples/integration.test.js` – selective mocking pattern for integration tests.
- `tests/classicBattle/examples/simpleHarnessPattern.test.js` – lightweight harness example for classic battle helpers.

Each file is marked with `describe.skip` and a note pointing back to this document. Copy the patterns when authoring new tests.

## Unit Test Pattern: Top-Level Mocking

1. Declare shared mocks with `vi.hoisted()` **before** defining constants that rely on them.
2. Register all mocks at the top level with `vi.mock()` so Vitest picks them up during static analysis.
3. Create a harness per test via `createSimpleHarness()` and call `setup()` in `beforeEach`.
4. Import the module under test _after_ harness setup so mocks and fixtures are applied.
5. Configure per-test behavior with `mockResolvedValue`, `mockImplementation`, or similar before assertions.

## Integration Test Pattern: Selective Mocking

1. Mock only external dependencies (network, storage, browser APIs) at the top level.
2. Provide fixtures such as `fetch` or `localStorage` through `createSimpleHarness({ fixtures })`.
3. Keep internal modules real to exercise production wiring while controlling external effects.
4. Use one harness per suite for DOM/timer isolation and call `cleanup()` in `afterEach`.
5. Drive workflows end-to-end (e.g., battle flow readiness) rather than isolated helper calls.

## Classic Battle Harness Example

- Demonstrates importing modules with harness-managed fixtures.
- Confirms top-level mocks are applied before imports.
- Serves as a reference for wiring classic battle helpers into a controlled DOM.

## Functional Coverage

Real product behavior remains covered by focused suites:

- **Battle CLI**: See `tests/pages/battleCLI.*` and `tests/styles/battleCLI.*`.
- **classicBattle**: Covered by `tests/classicBattle/*` and `tests/helpers/classicBattle/*` integrations.
- **queryRag**: Functional flows validated in `tests/queryRag/*`.

Use these suites for behavioral confidence and the templates above for authoring guidance without slowing CI.
