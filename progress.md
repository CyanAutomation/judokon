# Cooldown & Next Round QA Review

## Scope Reviewed

- Tests: `tests/helpers/classicBattle/scheduleNextRound.test.js` and related fallback coverage
- Modules: `roundManager.js`, `cooldowns.js`, `timerService.js`, `eventDispatcher.js`, `battleEvents.js`, `orchestrator.js`, `orchestratorHandlers.js`
- Execution context: review based on repository state at `/src/helpers/classicBattle/*`

## Accuracy Assessment

- `src/helpers/classicBattle/eventDispatcher.js` already contains the timestamp-based dedupe map for `"ready"` events (20 ms window, auto-cleanup, and `resetDispatchHistory`). The guard is active in source and short-circuits duplicate dispatches by returning `true`.
- The dedupe behavior is exercised by `tests/helpers/classicBattle/eventDispatcher.dedupe.test.js`; the test confirms that rapid duplicate calls skip the second dispatch and that the key resets after the window elapses.
- Running `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js` is the correct command for the selective suite. This run currently fails with two timeouts ("auto-dispatches ready after 1s cooldown" and the roundOver → cooldown → roundStart scenario), aligning with the investigation notes.
- Module references for the duplicate `"ready"` triggers across `roundManager`, `cooldowns`, and `timerService` remain accurate. The files now also include extensive `[TEST DEBUG]` logging that is globally active rather than gated behind test helpers.

## Issue Evaluation

- Multiple execution paths still converge on `"ready"` dispatches (`handleNextRoundExpiration`, `createCooldownCompletion.finish`, `timerService.advanceWhenReady`). The active dedupe guard prevents tight duplicates, but the orchestrator remains stuck in tests: the fallback timers fire (we now set `window.__NEXT_ROUND_EXPIRED` in `handleNextRoundExpiration`), yet the machine never transitions to `waitingForPlayerAction` before the Vitest timeout.
- The symptom is not duplicate dispatches but the `ready` dispatch failing to advance state within the mocked timer environment. `dispatchBattleEvent` returns `true` on skipped duplicates; however, the awaited dispatch either never resolves or its side effects are suppressed, leaving `controls.ready` unresolved.
- Extensive `[TEST DEBUG]` logging across `eventDispatcher`, `roundManager`, `createRoundTimer`, and the helper tests is globally enabled. This violates console-discipline rules and makes reproductions noisy, complicating diagnosis.

## Opportunities for Improvement

- Gate or remove the global debug logging (replace with `withMutedConsole` in tests or scoped loggers) so reruns surface only actionable output and lint rules can pass once the fix lands.
- Instrument `handleNextRoundExpiration` and related helpers via the existing debug hooks to capture whether `controls.resolveReady` is invoked and whether `dispatchBattleEvent("ready")` resolves; feed this into the tests instead of raw console logging.
- Confirm the timer pathways in tests: ensure `setupFallbackTimer` is using the same scheduler that `timerSpy.advanceTimersByTime` controls, and assert that at least one of the fallback callbacks fires within the test before awaiting `waitForState`.

## Validation Notes

- `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js` → still fails with the 10 s / 5 s timeouts, but now does so *after* confirming that `currentNextRound` is populated and `window.__NEXT_ROUND_EXPIRED` flips to `true`. The hang therefore occurs after cooldown expiry, during the transition from `cooldown` to `waitingForPlayerAction`.
- Debug exposures show `currentNextRoundReadyInFlight === true` while `handleNextRoundMachineState` often reports `null`, implying the orchestrator machine getter is unavailable when the cooldown expires. This provides a concrete lead for the next investigation.
- `npx vitest run tests/helpers/classicBattle/eventDispatcher.dedupe.test.js` → PASS.

*Pausing here for your review before proceeding further.*

## Phase 1 – Dispatch Dedupe Hardening

- Implemented the Map-backed dedupe window in `src/helpers/classicBattle/eventDispatcher.js` (20 ms threshold, machine-scoped keys, auto reset) and added `resetDispatchHistory` utilities to clear the guard between cooldown cycles.
- Added `tests/helpers/classicBattle/eventDispatcher.dedupe.test.js` to cover the short-circuit behavior and confirm that the guard re-allows dispatches after the window elapses.
- Unit tests: `npx vitest run tests/helpers/classicBattle/eventDispatcher.dedupe.test.js` (pass) and `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js` (fails with timeout; see Validation Notes).
- Playwright tests remain blocked until the cooldown orchestration behaves deterministically.
- Outcome: partial. Dedupe is active and verified, but the unresolved cooldown timeout prevents the selective suite from completing.

## Phase 2 – Ready Dispatch Cleanup

- Confirmed existing dedupe guards run inside `dispatchBattleEvent` and added `resetDispatchHistory("ready")` call during `startCooldown` to clear state between cooldown cycles.
- Hardened the unit coverage in `eventDispatcher.dedupe.test.js` to assert that immediate duplicate calls short-circuit while subsequent cycles still dispatch.
- Unit tests: `npx vitest run tests/helpers/classicBattle/eventDispatcher.dedupe.test.js tests/helpers/classicBattle/scheduleNextRound.test.js` (partial; `scheduleNextRound` still times out waiting for cooldown events).
- Playwright check: previously `npx playwright test battle-next-skip.non-orchestrated.spec.js` failed (container denied binding to port 5000); no new attempt yet while the unit flake remains unresolved.
- Outcome: partial. Deduplication state now resets per cooldown, but the classic battle orchestration tests still hang; investigation required to unblock timer-driven flows.

## Current Phase – Convert Debug Logging to Deterministic Assertions

### Activities Undertaken

- Removed the ad-hoc `[TEST DEBUG]` logging from `tests/helpers/classicBattle/scheduleNextRound.test.js` and replaced those call sites with explicit assertions against the cooldown debug state (`currentNextRound` via `__classicBattleDebugRead`, and the `window.__NEXT_ROUND_EXPIRED` flag).
- Reset `window.__NEXT_ROUND_EXPIRED` in the shared `beforeEach` hook to avoid cross-test leakage before asserting on the new instrumentation.
- Added new debug exposures in `src/helpers/classicBattle/roundManager.js` (`handleNextRoundMachineState`, `handleNextRoundSnapshotState`, `handleNextRoundMachineStateAfterWait`, and `currentNextRoundReadyInFlight`) so tests can read the orchestrator state at cooldown expiry without relying on console output.
- Updated the failing unit tests to assert those new debug values immediately after advancing the timers, capturing whether the state machine is readable and whether the cooldown controls remain flagged as in-flight.
- Ran the focused Vitest commands requested for this phase (`npx vitest run tests/helpers/classicBattle/eventDispatcher.dedupe.test.js` and `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js`).

### Outcome

- `eventDispatcher.dedupe.test.js`: Passes, confirming no regression in the dedupe guard while the test instrumentation changes are in place.
- `scheduleNextRound.test.js`: Still times out, but we now assert that `currentNextRound` exists, `currentNextRoundReadyInFlight` is `true`, and `window.__NEXT_ROUND_EXPIRED` flips before the hang. The initial attempt to assert `handleNextRoundMachineState === "cooldown"` failed because the debug getter returned `undefined`; coercing this to `null` revealed that the orchestrator machine reference is missing at the moment the cooldown resolves. This narrows the remaining issue to "machine snapshot unavailable during cooldown completion" rather than timer expiry.
- Console noise from the test file is gone, reducing the amount of `[TEST DEBUG]` output during focused runs.

*Pausing here for your review before proceeding to the next step.*

## Current Iteration – Timer Debugging and Fallback Adjustments

### Activities Undertaken

- Reproduced the failing unit test `tests/helpers/classicBattle/scheduleNextRound.test.js` locally using `npx vitest run tests/helpers/classicBattle/scheduleNextRound.test.js`, confirming timeouts in tests like "auto-dispatches ready after 1s cooldown".
- Added extensive debug logging to key modules:
  - `src/helpers/classicBattle/roundManager.js`: Logs in `startCooldown`, `wireCooldownTimer`, `handleNextRoundExpiration`, and timer start/scheduling paths to trace timer creation, start, and expiration.
  - `src/helpers/timers/createRoundTimer.js`: Replaced the Date.now()-based setInterval fallback with a setTimeout chain for better compatibility with Vitest fake timers, and added debug logs for timer ticks and expiration.
  - `src/helpers/classicBattle/stateHandlers/cooldownEnter.js`: Added debug log on entry to confirm handler invocation.
  - Exposed `currentNextRound` controls via debugHooks for test inspection.
- Modified test infrastructure:
  - `tests/helpers/classicBattle/scheduleNextRound.test.js`: Ensured `vi.useFakeTimers()` is called early, restored real `battleEvents` implementation to preserve EventTarget behavior.
  - `tests/helpers/classicBattle/commonMocks.js` and `tests/helpers/classicBattle/utils.js`: Updated scheduler mocks to use `globalThis.setTimeout/setInterval` so Vitest fake timers control them.
- Applied targeted runtime fixes:
  - In `roundManager.js`, changed timer start from scheduled via `scheduler.setTimeout` to immediate `controls.timer.start(cooldownSeconds)` to ensure JS fallback timers are active under fake timers.
  - Replaced `createRoundTimer` fallback with a recursive `setTimeout` tick loop to avoid Date.now() drift issues.
- Repeatedly ran the failing test after each change to collect outputs, observing that tests still timeout but debug logs confirm module loading and setup.

### Accuracy Assessment Update

- Current repository state includes the dedupe map, reset helpers, and skip logic in `eventDispatcher.js`. The earlier statement that the guard was missing is incorrect; the remaining failures stem from downstream readiness, not from the dedupe implementation itself.
- Test paths and module references remain correct.
- The outstanding issue is unchanged: `scheduleNextRound` tests time out because `ready` dispatches do not progress the machine under Vitest fake timers even though the fallback timers are firing.

### Proposed Next Steps

- Use the new debug exposures to trace why `handleNextRoundMachineState` resolves to `null`—inspect how `getClassicBattleMachine` is exported under the Vitest module graph and whether `readDebugState("getClassicBattleMachine")` is returning stale data.
- Spy on `dispatchBattleEvent("ready")` to capture its resolved value and confirm whether the state machine rejects, resolves `false`, or simply never fulfills.
- Audit the mocked scheduler wiring: ensure `timerSpy` is injected into `startCooldown`/`setupFallbackTimer` so that advancing fake timers exercises both the primary timer and fallback `setTimeout` chain. Add coverage that fails fast when neither callback fires after advancing time.
- After isolating the failing path, remove or gate the `[TEST DEBUG]` logs and restore console discipline (`withMutedConsole`) before final validation runs.
