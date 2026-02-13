# Vitest Harness Migration Playbook

**Owner:** Test Infrastructure Working Group  
**Review cadence:** Bi-weekly while migration remains active; then archive with final status

## Scope

Step-by-step procedure for migrating tests from deprecated harness mocking to the Vitest 3.x compatible architecture.

## Migration Workflow

1. **Classify each file**
   - Unit: isolated logic, limited module collaboration
   - Integration: multi-module orchestration and workflow behavior
2. **Remove deprecated harness mock wiring**
   - Delete `mocks` argument usage from harness initialization
   - Remove in-hook `vi.doMock()` patterns
3. **Register mocks correctly**
   - Move mock declarations to top-level `vi.mock()`
   - Create shared references with `vi.hoisted()` when per-test behavior varies
4. **Initialize harness**
   - Use `createSimpleHarness()` for environment and fixture setup
   - Call `await harness.setup()` before imports
5. **Validate**
   - Run file-level `vitest` target
   - Run nearest suite for regression safety

## Migration Checklist (per file)

- [ ] No `vi.doMock()` in `beforeEach`/`beforeAll`
- [ ] No `mocks` parameter passed to harness creation
- [ ] Top-level `vi.mock()` declarations present where needed
- [ ] Module imports occur after harness setup
- [ ] Tests remain deterministic (fake timers and muted console discipline)
- [ ] Targeted test command passes

## Stop Conditions

Pause and escalate if migration requires:

- Public API changes
- Altering production runtime behavior to satisfy tests
- Broad config changes affecting unrelated suites

## Completion Criteria

- All targeted failing files migrated
- Deprecated pattern occurrences reduced to zero in active test paths
- CI verification green for impacted test suites
