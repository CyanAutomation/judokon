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
