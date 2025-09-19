# Classic Battle cooldown → ready double dispatch

## Root Cause
- During cooldown expiry `wireCooldownTimer` first emits `cooldown.timer.expired`, which wakes the orchestrated readiness hook registered in `setupOrchestratedReady`. Its `finalize` helper immediately calls `machine.dispatch("ready")` directly (`src/helpers/classicBattle/roundManager.js:431-454`).
- The same `onExpired` handler then calls `dispatchReadyViaBus` → `dispatchBattleEvent` → `machine.dispatch("ready")` a second time (`src/helpers/classicBattle/roundManager.js:968-994`, `src/helpers/classicBattle/eventDispatcher.js:188-225`). The dedupe guard inside the dispatcher is bypassed because the first call never reached it.
- `readyDispatchedForCurrentCooldown` is flipped inside `finalize`, but the initial `dispatchReadyViaBus` invocation does not consult that flag, so both dispatches go through. This matches the audit guidance that battle-event dispatch should be centralized to avoid duplicate machine transitions (Source: auditBattleEngine.md [chunk 19], Confidence: medium).

## Proposed Fix Plan

### Phase 1 – Additional instrumentation & verification
- Add temporary debug tracing (or reuse `appendReadyTrace`) to confirm the event order (`cooldown.timer.expired` → `finalize` → `dispatchReadyViaBus`) in Vitest and, if possible, in a browser session.
- Write/extend a focused unit test that asserts only one `ready` dispatch occurs when the cooldown expires, guarding against regressions once the fix lands.

### Phase 2 – Remediation implementation
- Update `finalize` inside `setupOrchestratedReady` to funnel readiness through the shared dispatcher instead of calling `machine.dispatch` directly (e.g., call `options.dispatchBattleEvent?.("ready")` and otherwise rely on `handleNextRoundExpiration`).
- In `wireCooldownTimer.onExpired`, short-circuit when `readyDispatchedForCurrentCooldown` is already `true` before invoking `dispatchReadyViaBus`, so retry logic stays intact without duplicating the initial dispatch.
- Ensure `readyDispatchedForCurrentCooldown` is toggled only after the centralized dispatch path succeeds, so retries remain reliable.

### Phase 3 – Regression safeguards & cleanup
- Remove any temporary logging once validated and keep the new unit test as a permanent guard.
- Re-run the full suite (`npm run check:jsdoc`, `npx prettier . --check`, `npx eslint .`, `npx vitest run`, `npx playwright test`, `npm run check:contrast`) to confirm no collateral regressions.
- Document the ready-dispatch flow in `roundManager.js` comments (or existing debug docs) to clarify that all readiness signals must pass through the shared dispatcher.
