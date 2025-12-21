# Test Examples: Pattern Reference Guide

This directory contains canonical example test files demonstrating the modern testing patterns for the JU-DO-KON! project.

## Overview

The JU-DO-KON! project uses **Vitest 3.2.4** with a specific pattern for test organization:

1. **Unit Tests**: Mock ALL dependencies, test isolated functionality
2. **Integration Tests**: Mock only externals (network, storage), test real workflows

Both patterns use:
- Top-level `vi.mock()` declarations (Vitest static analysis requirement)
- `vi.hoisted()` for shared mock references
- `createSimpleHarness()` for environment setup (DOM, timers, fixtures)

## Files

### `unit.test.js`

**Purpose**: Canonical unit test template showing how to mock all dependencies.

**When to use this pattern**:
- Testing a specific helper function or utility
- You need complete control over all dependencies
- Testing error handling paths that are hard to trigger with real modules
- You want fast, deterministic tests with no side effects

**Key characteristics**:
- All dependencies are mocked with `vi.mock()` at top level
- Mocks are shared via `vi.hoisted()` and configured per test
- Each test imports modules AFTER `harness.setup()`
- Tests are fast and isolated

**Copy this file when**:
- Creating tests for new helper functions in `src/helpers/`
- Testing utility functions in `src/utils/`
- Writing tests for pure functions with external dependencies

### Integration pattern

The former `integration.test.js` template was removed to keep CI focused on concrete
feature coverage instead of placeholder examples. When adding integration tests, follow
the guidance in this document and back the scenarios with real requirements so they run
in CI by default.

## Migration Guide: From Old Pattern to New

### Old Pattern (DEPRECATED)

```javascript
// ❌ DON'T DO THIS - vi.doMock() in beforeEach
beforeEach(() => {
  vi.doMock("../../src/helpers/myHelper", () => ({
    helperFn: vi.fn().mockReturnValue(defaultValue)
  }));
  harness = createSettingsHarness({ mocks: { /* ... */ } });
  await harness.setup();
});
```

### New Pattern (CURRENT)

```javascript
// ✅ DO THIS - vi.mock() at top level
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock("../../src/helpers/myHelper", () => ({ helperFn: mockFn }));

beforeEach(async () => {
  mockFn.mockReset().mockReturnValue(defaultValue);
  harness = createSimpleHarness();
  await harness.setup();
});
```

**Why the change?**
- Vitest requires `vi.mock()` at top level (static analysis phase)
- `vi.doMock()` in hooks no longer works reliably in Vitest 3.x
- New `createSimpleHarness()` is simpler and more composable
- `vi.hoisted()` provides clean mock sharing mechanism

## Common Patterns

### Pattern 1: Per-Test Mock Configuration

```javascript
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("../../src/services/api.js", () => ({ fetchData: mockFetch }));

it("handles success", async () => {
  mockFetch.mockResolvedValue({ status: 200, data: { id: 1 } });
  // test code
});

it("handles error", async () => {
  mockFetch.mockRejectedValue(new Error("Network error"));
  // test code
});
```

### Pattern 2: Fixture Setup

```javascript
beforeEach(async () => {
  const mockStorage = createMockLocalStorage();
  harness = createSimpleHarness({
    fixtures: { localStorage: mockStorage },
    useFakeTimers: true
  });
  await harness.setup();
});
```

### Pattern 3: Module-Specific Imports

```javascript
// Import at test level (after setup) for unit tests with mocks
it("test", async () => {
  const { myFunction } = await import("../../src/helpers/myHelper.js");
  // uses mocked dependencies
});

// Import once for integration tests (real modules)
const { myFunction } = await import("../../src/helpers/myHelper.js");
// in beforeEach or within harness
```

## Quick Reference: Which Pattern to Choose?

| Scenario | Pattern | Example |
|----------|---------|---------|
| Pure helper function with no deps | **Unit** | `calculateScore()` |
| Function with external API calls | **Unit** | `fetchJudoka()` with mocked fetch |
| Page initialization flow | **Integration** | `initBattle()` calling multiple helpers |
| User interaction workflow | **Integration** | "User selects stat → rounds advances" |
| Error recovery behavior | **Unit or Int** | Depends on scope |
| State management | **Integration** | Test with real state module |
| Component rendering | **Integration** | Prefer real DOM and interactions |

## Common Issues & Solutions

### Issue: "Cannot find module" during test

**Cause**: Module imported before `harness.setup()` in unit test with mocks

**Solution**: Move `import` statement to AFTER `harness.setup()` or inside the test

```javascript
// ❌ Wrong
const { myFunction } = await import("../../src/helpers/myHelper.js");
beforeEach(async () => {
  harness = createSimpleHarness();
  await harness.setup();
});

// ✅ Right
beforeEach(async () => {
  harness = createSimpleHarness();
  await harness.setup();
});

it("test", async () => {
  const { myFunction } = await import("../../src/helpers/myHelper.js");
});
```

### Issue: Mock not applying to imported module

**Cause**: `vi.mock()` not at top level, or module imported before mock registration

**Solution**: Ensure `vi.mock()` at top level AND import happens after `harness.setup()`

### Issue: Different tests need different mock implementations

**Cause**: Trying to use same mock reference across tests with different configs

**Solution**: Use `vi.hoisted()` to share reference, then configure in each test with `.mockImplementation()` or `.mockResolvedValue()`

```javascript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));

it("test 1", () => {
  mockFn.mockReturnValue(valueA);
  // test
});

it("test 2", () => {
  mockFn.mockReturnValue(valueB);
  // test
});
```

### Issue: Fixtures (localStorage, DOM) not available in test

**Cause**: Harness not passed to createSimpleHarness, or not called setup()

**Solution**: Create harness with fixtures, then call setup()

```javascript
beforeEach(async () => {
  harness = createSimpleHarness({
    fixtures: { localStorage: createMockLocalStorage() }
  });
  await harness.setup(); // This initializes fixtures
});
```

## References

- **Harness API**: `/workspaces/judokon/tests/helpers/integrationHarness.js`
- **Harness Tests**: `/workspaces/judokon/tests/helpers/integrationHarness.test.js` (see 15 new tests added in Task 3)
- **Settings Page Migration**: `/workspaces/judokon/tests/helpers/settingsPage.test.js` (see 16 tests using this pattern)
- **Agent Guide**: `/workspaces/judokon/AGENTS.md` (section "Unit Test Quality Standards")

## Checklist: Before Migrating a Test File

- [ ] Read the old test file to understand what's being tested
- [ ] Decide: Unit test (mock all) or Integration test (mock externals only)?
- [ ] Copy appropriate template file (unit.test.js or integration.test.js)
- [ ] Replace module paths to match your test
- [ ] Add all mock declarations at top level with `vi.mock()`
- [ ] Move any hook-based `vi.doMock()` calls to top level
- [ ] Use `vi.hoisted()` for shared mock references
- [ ] Move imports AFTER `harness.setup()`
- [ ] Configure mocks per-test as needed
- [ ] Run `npx vitest run <your-test>` to verify
- [ ] All tests passing? Commit and update `progressHarness.md`

## Next Steps

1. **Review existing migrations**: See `settingsPage.test.js` for a complete real-world example
2. **Run the harness tests**: `npm run test:helpers` to verify the pattern works
3. **Migrate a test file**: Use these templates as reference
4. **Ask questions**: Patterns are documented in comments; if unclear, check AGENTS.md

---

**Created**: 2025-01-21 | **Pattern Version**: 1.0 (Vitest 3.2.4)

