# Vitest Harness Architecture Reference

**Owner:** QA Platform Team  
**Review cadence:** Quarterly (or whenever Vitest major/minor versions change)

## Purpose

This document is the stable architecture reference for JU-DO-KON!'s Vitest harness model.

## Context

Legacy harness flows attempted to register mocks in `beforeEach` using `vi.doMock()`. In Vitest 3.x this is too late, because module graph analysis happens before hook execution.

## Architecture Principles

1. **Harness owns environment only**
   - `createSimpleHarness()` sets up JSDOM, fake timers, RAF mocks, and fixtures.
   - It does **not** register module mocks.
2. **Tests own dependency mocking**
   - Use top-level `vi.mock()` for dependencies.
   - Use `vi.hoisted()` for shared mock references.
3. **Test type decides mocking strategy**
   - **Unit tests:** mock internal and external dependencies.
   - **Integration tests:** keep internal modules real; mock external systems only.

## API Contract: `createSimpleHarness()`

- Accepts: `fixtures`, `useFakeTimers`, `useRafMock`, `setup`, `teardown`
- Excludes: `mocks`
- Usage requirement: import target modules after `harness.setup()`

## Canonical Patterns

### Unit Pattern

- Top-level `vi.mock()` declarations
- Harness for environment only
- Import module under test after setup

### Integration Pattern

- Mock externals only (`fetch`, storage, analytics)
- Use real internal modules to preserve interaction behavior
- Drive assertions via observable behavior and state

## Related Files

- `tests/helpers/integrationHarness.js`
- `tests/examples/unit.test.js`
- `tests/examples/integration.test.js`
- `AGENTS.md` (Testing architecture section)
