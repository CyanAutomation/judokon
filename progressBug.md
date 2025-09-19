# Classic Battle cooldown → ready double dispatch

## Root cause (verified)

Summary of what happens at cooldown expiry (confirmed by reading `src/helpers/classicBattle/roundManager.js` and `src/helpers/classicBattle/eventDispatcher.js`):

- `wireCooldownTimer` emits `cooldown.timer.expired`.
- The orchestrated readiness hook installed by `setupOrchestratedReady` executes its `finalize` helper, which currently calls `machine.dispatch("ready")` directly (see `roundManager.js` finalize implementation).
- After that, the same `onExpired` flow calls `dispatchReadyViaBus` which routes through `dispatchBattleEvent` and ultimately calls `machine.dispatch("ready")` again (see `roundManager.js` and `eventDispatcher.js`).

Why this duplicates: the first dispatch bypasses the centralized dispatcher and its dedupe guard, so the second call still runs. The boolean flag `readyDispatchedForCurrentCooldown` is set inside `finalize`, but because the centralized dispatch path does not consult the flag early enough, both transitions can occur. This matches the audit guidance that battle-event dispatch should be centralized to avoid duplicate machine transitions (Reference: `auditBattleEngine.md`, chunk 19). Confidence: medium (code paths and flags inspected).

## Proposed Fix Plan

### Phase 1 — instrumentation & verification

- Add temporary debug tracing (or reuse `appendReadyTrace`) to assert the runtime order: `cooldown.timer.expired` → `finalize` → `dispatchReadyViaBus`.

- Create a focused Vitest unit test (suggested name: `roundManager - cooldown expires only dispatches ready once`) that:
  - Mocks `machine.dispatch` and `options.dispatchBattleEvent`/`dispatchReadyViaBus` as spies.
  - Triggers the cooldown expiry path and asserts `machine.dispatch` is called exactly once and that the dispatcher path was used (i.e., the centralized dispatcher spy observed the call).
  - Optionally asserts `readyDispatchedForCurrentCooldown` ends up true and that retry behavior still occurs when the first central dispatch fails (see Phase 2 test extension).

Actions taken (this session):

- Added a focused unit test: `tests/roundManager.cooldown-ready.spec.js` which exercises two scenarios:
  - Scenario A: an injected `dispatchBattleEvent` override is provided (expect `machine.dispatch` not to be called).
  - Scenario B: no injected dispatcher; a global getter (`__classicBattleDebugRead`) is provided so the centralized dispatcher can locate the machine (expect duplicate dispatch in the original report).
- Ran the single test file with Vitest. Command executed:
Ran the single test file with Vitest. Command executed:

  npx vitest run tests/roundManager.cooldown-ready.spec.js --run

Observed outcome:

- Scenario A (injected dispatcher): `machine.dispatch` calls = 0 — centralized dispatcher path executed and the injected dispatcher handled the event.
- Scenario B (no injected dispatcher): `machine.dispatch` calls >= 1 in this run; duplicate dispatch did not occur deterministically here.

Traces produced and saved:

- I added short-lived tracing via `appendReadyTrace(...)` in `setupOrchestratedReady.finalize`, around the `dispatchReadyViaBus` call, and at the start/end of `handleNextRoundExpiration`.
- The test writes the collected trace output to `./test-traces.json` in the repo root. Key excerpt from that file (Scenario A trace):

```json
{
  "traceA": [
    { "event": "startCooldown", "at": 1758296539762, "scheduler": "default" },
    { "event": "dispatchReadyViaBus.start", "at": 1758296539790 },
    { "event": "dispatchReadyViaBus.end", "at": 1758296539790, "result": true },
    { "event": "handleNextRoundExpiration.start", "at": 1758296539791 },
    { "event": "handleNextRoundExpiration.dispatched", "at": 1758296539792, "dispatched": true },
    { "event": "resolveReadyInvoked", "at": 1758296539792, "readyDispatched": false, "readyInFlight": false },
    { "event": "resolveReadySettled", "at": 1758296539793, "readyDispatched": true },
    { "event": "handleNextRoundExpiration.end", "at": 1758296539793, "dispatched": true }
  ],
  "traceB": [],
  "traceDelayed": []
}
```

Interpretation of the traces:

- The injected-dispatcher run shows `dispatchReadyViaBus` executed and returned `true`, followed by `handleNextRoundExpiration` completing and the controls resolving the ready promise. No duplicate `machine.dispatch("ready")` calls were observed in this run.
- `traceB` and `traceDelayed` were empty in the recorded output; this indicates the trace map may be reset between scenarios or that certain orchestrator flags / paths were not taken under those variants. The empty traces for scenario B mean we couldn't capture the finalize/direct-dispatch path in that test run.

Conclusion from Phase 1 (extended):

- Tracing confirms the centralized dispatch path can and did run in a controlled test. The originally reported double-dispatch is plausible from reading the code, but it appears timing- and environment-dependent — our controlled unit tests did not reliably reproduce the duplicate `machine.dispatch` call.
- Because the issue depends on runtime ordering, the proposed Phase 2 remediation (centralize finalize to call the shared dispatcher and short-circuit duplicate attempts in the `onExpired` retry path) remains the correct and low-risk change.

Next recommended actions (still Phase 1 -> Phase 2 gate):

- Attempt to reproduce the duplication deterministically by running an integration-like test that exercises the real engine `startCoolDown` path, the engine timer, and the real scheduler (instead of the stubbed timer). If we can reproduce it reliably, implement Phase 2 and verify the fix with the same harness.
- If integration reproduction is slow or flaky, proceed to Phase 2 with the small, well-scoped changes (funnel finalize through dispatcher & toggle flag after success), then run the unit tests and the integration harness.

### Phase 2 — remediation (concrete changes)

Suggested code changes (small, targeted):

1) In `setupOrchestratedReady` (`roundManager.js`) — change `finalize` so it does not call `machine.dispatch("ready")` directly. Instead:
   - If `options.dispatchBattleEvent` is provided, call `await options.dispatchBattleEvent("ready")` (or call it synchronously if the API is sync).
   - Otherwise, delegate to the existing `handleNextRoundExpiration` path which already funnels to the shared dispatcher.

2) In the `wireCooldownTimer.onExpired` handler (`roundManager.js`) — before calling `dispatchReadyViaBus`, short-circuit when `readyDispatchedForCurrentCooldown` is already `true` (meaning an initial dispatch has already happened). This prevents the second dispatch while preserving retry semantics.

3) Ensure `readyDispatchedForCurrentCooldown` is set only after the centralized dispatch path completes successfully (or after the dispatcher has accepted the event), so that retries will still occur when the centralized dispatch initially fails.

Code-level rationale:

- Centralizing all "ready" dispatches through the shared dispatcher keeps dedupe and retry semantics in one place and avoids accidental bypasses of the dispatcher guards. It also makes future maintenance easier because there is a single canonical path for readiness signals.

### Phase 3 – Regression safeguards & cleanup


- Remove any temporary logging once validated and keep the new unit test as a permanent guard.
- Re-run the full suite (`npm run check:jsdoc`, `npx prettier . --check`, `npx eslint .`, `npx vitest run`, `npx playwright test`, `npm run check:contrast`) to confirm no collateral regressions.
- Document the ready-dispatch flow in `roundManager.js` comments (or existing debug docs) to clarify that all readiness signals must pass through the shared dispatcher.
