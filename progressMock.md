## Investigation notes — scheduleNextRound.fallback.test.js failures

Date: 2025-09-22

This document summarizes the analysis, steps taken so far, and proposed next steps for the failing tests in `tests/helpers/classicBattle/scheduleNextRound.fallback.test.js`.

---

## Summary of the problem

- Several tests in `tests/helpers/classicBattle/scheduleNextRound.fallback.test.js` were failing: the test runner reported 8 tests with 2 passing and 6 failing. Failures show that the expected `dispatchBattleEvent` spy was not called (0 calls) and one test timed out (5000ms).
- Root cause (investigated so far): production code captured the `dispatchBattleEvent` function at module initialization time, preventing test-time mocks (registered with `vi.doMock`) from replacing the function when tests run.

## Actions taken so far

1. Reproduced the failing tests locally by running the single file with Vitest and collected the failure output (command used: `npx vitest run tests/helpers/classicBattle/scheduleNextRound.fallback.test.js --reporter verbose`).

- Observed 8 tests run: 2 passed, 6 failed. Failures include assertion errors expecting `dispatchSpy` to be called and one timeout.

2. Inspected the failing test file `tests/helpers/classicBattle/scheduleNextRound.fallback.test.js` to understand how mocks are registered and how the harness imports modules under test.

- The tests register a mock for `"../../../src/helpers/classicBattle/eventDispatcher.js"` returning a spy and a `resetDispatchHistory` stub via the harness.
- Harness uses `vi.resetModules()` and registers mocks via `vi.doMock` before dynamically importing modules under test.

3. Reviewed relevant production modules, especially `src/helpers/classicBattle/nextRound/expirationHandlers.js`.

- Found module-init capture of `eventDispatcher.dispatchBattleEvent` (top-level or early cached reference) which prevented test-time mocks from being effective.

4. Implemented a runtime lookup in `expirationHandlers.js`:

- Added `getGlobalDispatch()` which reads `eventDispatcher.dispatchBattleEvent` at call time.
- Replaced call sites that used the cached reference with calls to `getGlobalDispatch()` so that mocks registered by tests are visible at runtime.
- Added guarded debug logging to surface whether the resolved function is a mock during Vitest runs.
- Fixed an incidental recursion bug introduced during iterative edits.

5. Re-ran the failing test file after code changes.

- Result: tests still failing (8 tests: 2 passed, 6 failed). Failures indicate that the mocked spy is not being invoked despite the runtime lookup change.

## Diagnosis and likely causes remaining

- Module identity mismatch: tests register a mock using a relative module specifier (e.g. `"../../../src/helpers/classicBattle/eventDispatcher.js"`). If the production code resolves/imports `eventDispatcher` using a different specifier (different relative path, file URL, or index resolution), Vitest's module mocking may not replace the module actually used by production code. This is a common cause of spies not receiving calls even when `vi.doMock` is used.
- Other modules may still capture `dispatchBattleEvent` at import time and hold stale references (not yet converted to runtime lookup).
- The code path exercised by tests may bypass the calls to the resolved dispatcher (e.g., early return or alternative strategy) so the spy is legitimately not invoked.

## Files reviewed (high level)

- tests/helpers/classicBattle/scheduleNextRound.fallback.test.js — failing tests and mock registration.
- tests/helpers/integrationHarness.js — test harness that registers mocks prior to imports.
- src/helpers/classicBattle/nextRound/expirationHandlers.js — modified to use runtime dispatcher lookup.
- src/helpers/classicBattle/eventDispatcher.js — canonical dispatcher (not modified during this investigation).

## Progress status (current)

- Reproduced failing tests and collected outputs. (Done)
- Converted `expirationHandlers.js` to use runtime dispatcher lookup and added debug logs. (Done)
- Determined that failures persist; suspected module-specifier mismatch or other static captures remain. (In progress)
- **Specifier alignment analysis completed**: Found mismatch between test mock specifier ("../../../src/helpers/classicBattle/eventDispatcher.js") and production import specifiers (mostly "./eventDispatcher.js" or "../eventDispatcher.js"). Proposed fix: update test mock to use absolute path "/src/helpers/classicBattle/eventDispatcher.js" to ensure mocking applies to all imports.

## Planned next steps

1. Verify mock vs import specifier alignment (highest priority):

- **Completed**: Listed all test mocks and production imports. Found that test mocks use relative paths from test directory, while production uses relative from src. Mismatch likely prevents mocking from applying to production imports.
- **Proposed fix**: Change mock specifier in failing test to absolute path "/src/helpers/classicBattle/eventDispatcher.js" to match the pattern used in `testHooks.js` and ensure it overrides all imports to that module.

2. Implement specifier fix and re-run tests:

- Update `tests/helpers/classicBattle/scheduleNextRound.fallback.test.js` to use absolute mock specifier.
- Re-run the failing test file to check if spies are now called.

3. Search for remaining static captures:

- Find files that read and store `dispatchBattleEvent` at import time; convert them to runtime lookup (similar to `getGlobalDispatch()`), or update tests accordingly.

4. Re-run the failing test file with the debug logs enabled and capture console output from the runtime getter to confirm which function is being resolved at each call site (mock vs original function).

5. Implement minimal fixes based on findings and re-run the affected tests until green.

## Notes and assumptions

- Assumption: The harness registers mocks before imports (confirmed by reading `tests/helpers/integrationHarness.js`), so when the module specifiers match, `vi.doMock` will replace the target module.
- If canonical module identity cannot be trivially discovered, an alternative is to refactor production code to dynamically resolve the event dispatcher by file path or to expose a small setter used only in tests to inject the mock dispatcher (but prefer aligning specifiers first).

## Immediate request

I have updated this file with the current analysis and next steps. I'll wait for your review and instruction before proceeding with the next diagnostic step (I recommend I now run a specifier-alignment probe to find mismatches).
