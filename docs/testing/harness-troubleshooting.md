# Vitest Harness Troubleshooting Guide

**Owner:** QA Platform Team  
**Review cadence:** Monthly (or immediately after recurring failure patterns are discovered)

## Common Failure Modes

### 1) Mock not applied

**Symptoms**

- Assertions show real implementation behavior
- Expected mock call counts remain zero

**Root cause**

- `vi.mock()` declared too late (inside hooks/functions)

**Fix**

- Move all `vi.mock()` calls to test-file top level
- Use `vi.hoisted()` for reusable mock references

### 2) Fixture injection appears ignored

**Symptoms**

- Real `localStorage`/`fetch` observed in tests

**Root cause**

- Module imported before `harness.setup()`

**Fix**

- Delay imports until after `await harness.setup()`
- Prefer `await harness.importModule()` for consistency

### 3) Timer-dependent flakiness

**Symptoms**

- Tests fail intermittently on timeout-based assertions

**Root cause**

- Mixed real/fake timer usage or incomplete timer draining

**Fix**

- Use fake timers consistently
- Advance timers deterministically (`runAllTimersAsync`, targeted advancement)

### 4) Integration behavior regresses after migration

**Symptoms**

- Workflow tests fail despite isolated unit tests passing

**Root cause**

- Over-mocking internal modules in integration scenarios

**Fix**

- Keep internal modules real
- Mock only true externals

## Fast Diagnostics

```bash
# Deprecated mock registration usage
rg -n "vi\.doMock\(" tests -g "!client_embeddings.json"

# Deprecated harness mocks parameter usage
rg -n "mocks\s*:" tests -g "!client_embeddings.json"

# Verify top-level vi.mock presence in target test
rg -n "^vi\.mock\(" tests/<target>.test.js -g "!client_embeddings.json"
```
