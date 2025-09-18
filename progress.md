# Cooldown & Next Round QA Review

## Scope Reviewed

- Tests: `tests/helpers/classicBattle/scheduleNextRound.test.js` and related fallback coverage
- Modules: `roundManager.js`, `cooldowns.js`, `timerService.js`, `eventDispatcher.js`, `battleEvents.js`, `orchestrator.js`, `orchestratorHandlers.js`
- Execution context: review based on repository state at `/src/helpers/classicBattle/*`

## Accuracy Assessment

- The report states that `eventDispatcher.js` now contains a dedupe map with a 20 ms window. Current source (`src/helpers/classicBattle/eventDispatcher.js`) does **not** include this logic; instead it only adds extensive `[TEST DEBUG]` logging. The described fix is therefore missing.
- The claimed behavior change of returning `true` on duplicate dispatches cannot occur because the implementation was never applied. Upstream fallback dispatches would still execute, so the analysis overestimates the mitigation in place.
- Validation notes cite `npx vitest scheduleNextRound.test.js`, but the repository organizes tests under `tests/helpers/classicBattle/`. Running `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js` executes the intended file; the "No test files found" error likely came from an incorrect path rather than project configuration.
- Module references (e.g., multiple `ready` dispatch paths across `roundManager`, `cooldowns`, and `timerService`) are accurate and matched by code inspection.

## Issue Evaluation

- Reproduction review confirms multiple execution paths can dispatch `"ready"` in close succession: `handleNextRoundExpiration` awaits `dispatchBattleEvent("ready")` and then, on failure, calls the state machine directly; `createCooldownCompletion.finish()` and `timerService.advanceWhenReady()` both dispatch `"ready"` as part of fallback paths. Without coordination, these pathways can collide during test runs with mocked schedulers, recreating the original flaky condition.
- Because the dedupe guard described in the report is absent, the repository remains vulnerable to the duplicate-dispatch race. The additional `[TEST DEBUG]` console noise may also mask the underlying issue rather than resolve it.

## Opportunities for Improvement

- Re-implement the intended dedupe in `dispatchBattleEvent` (or centralize `ready` dispatching) and add targeted tests that assert only one dispatch occurs when simultaneous completion paths fire.
- Replace the current ad-hoc debug logging in `eventDispatcher.js` with muted, test-scoped helpers (`withMutedConsole`) to stay within logging policy and keep diagnostics focused.
- Update validation guidance to reference the concrete Vitest command(s) that align with the repository layout, and include expected outcomes to differentiate configuration errors from functional failures.

## Validation Notes

- Manual test execution not run in this review; paths above should be exercised once the dispatch guard is restored to confirm the original flake.

_Pausing here for your review before proceeding further._

## Phase 1 – Dispatch Dedupe Hardening

- Updated `src/helpers/classicBattle/eventDispatcher.js` to share in-flight dispatch promises per machine/event so concurrent callers reuse the same result.
- Added `tests/helpers/classicBattle/eventDispatcher.dedupe.test.js` to validate the guard and refreshed `scheduleNextRound` expectations to focus on state-machine dispatch counts.
- Unit tests: `npx vitest run tests/helpers/classicBattle/eventDispatcher.dedupe.test.js tests/helpers/classicBattle/scheduleNextRound.test.js` (fails – current build times out in `scheduleNextRound` while new guard active).
- Playwright tests pending; blocking on stabilizing the unit flow.
- Outcome: partial. Dedupe refactor implemented but causes orchestrator cooldown tests to hang; need to adjust cleanup so new rounds can re-dispatch `ready`.

## Phase 2 – Ready Dispatch Cleanup
- Confirmed existing dedupe guards run inside `dispatchBattleEvent` and added `resetDispatchHistory("ready")` call during `startCooldown` to clear state between cooldown cycles.
- Hardened the unit coverage in `eventDispatcher.dedupe.test.js` to assert that immediate duplicate calls short-circuit while subsequent cycles still dispatch.
- Unit tests: `npx vitest run tests/helpers/classicBattle/eventDispatcher.dedupe.test.js tests/helpers/classicBattle/scheduleNextRound.test.js` (partial; `scheduleNextRound` fixture timed out waiting for cooldown events).
- Playwright check: `npx playwright test battle-next-skip.non-orchestrated.spec.js` (failed: container denied binding to port 5000).
- Outcome: partial. Deduplication state now resets per cooldown, but the classic battle orchestration tests still hang in this environment; investigation required to unblock timer-driven flows.

