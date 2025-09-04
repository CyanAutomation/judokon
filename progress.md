Update — Next Readiness Test Failures (Playwright)

- Symptom: playwright/battle-next-readiness.spec.js times out waiting for `#next-button[data-next-ready='true']` after a round resolves. Debug logs confirm cooldown starts, but the ready attribute never appears.
- Current behavior: Two parallel cooldown paths exist and can race/skew ownership of readiness:
  - Orchestrator/UI path (preferred): `orchestratorHandlers.initInterRoundCooldown()` emits `countdownStart`, UI service renders snackbar and emits `countdownFinished`, then orchestrator sets `data-next-ready` and dispatches `ready`. File: `src/helpers/classicBattle/orchestratorHandlers.js`.
  - RoundManager path (fallback): `roundManager.startCooldown()` attaches its own timer and tries to mark readiness + dispatch `ready` when it expires. File: `src/helpers/classicBattle/roundManager.js`.
- Root cause for test flakes/failures: split ownership of Next readiness between orchestrator and roundManager leads to inconsistent readiness marking in the live DOM. In CI, the orchestrator early-return/branching and roundManager fallback don’t consistently surface `data-next-ready` on `#next-button` in time, so the test never observes it. The CLI is unaffected because it doesn’t wire a Next button or UI countdown.
  Recommended Next Steps (deterministic plan)

1. Single Source of Truth for Next readiness
   - Make the orchestrator/UI path the only owner that sets `#next-button.dataset.nextReady = "true"` and emits `nextRoundTimerReady`.
   - The roundManager should only prepare controls (timer handle, resolveReady promise) and never mark readiness or dispatch `ready` when the orchestrator is active.
2. Wire detection and delegation
   - In `roundManager.startCooldown()`: detect that the orchestrator path is present (e.g., `document.body.dataset.battleState` available AND `initInterRoundCooldown`/UI service are bound) and skip starting its own timer; only expose `currentNextRound` controls and leave countdown to the orchestrator.
   - Keep a pure fallback inside roundManager for non-orchestrated environments (unit tests or JSDOM): when no orchestrator/UI handlers are bound, start its internal timer and mark readiness at expiration.
3. Orchestrator cooldown path: always active
   - Remove early returns that bail when `getNextRoundControls()` exists. Always emit `countdownStart` and listen for `countdownFinished`. On finished: set `data-next-ready`, emit `nextRoundTimerReady`, then dispatch `ready`. File: `src/helpers/classicBattle/orchestratorHandlers.js`.
   - UI service (`src/helpers/classicBattle/uiService.js`) continues to render snackbar countdown and emit `countdownFinished`.
4. Next button click guarantees
   - In `src/helpers/classicBattle/timerService.js:onNextButtonClick`: keep the guard to only emit `countdownFinished` when state is actually `cooldown`. If a stale `data-next-ready` is found outside cooldown, clear it and disable the button.
5. Tests and waits
   - Spec: wait through the initial match-start cooldown (matchStart → cooldown) before asserting `waitingForPlayerAction`.
   - After selection, assert not-ready during selection/decision, then assert ready after cooldown via DOM attribute. Optionally, also listen for `nextRoundTimerReady` using a page-side listener (more robust than state-only).
   - Helper: keep `waitForBattleState` and the event/snackbar-based helpers for redundancy; prefer event then attribute check.
6. Acceptance (deterministic)
   - After `roundResolved`, within ~1.5s total (1s countdown + 200ms padding): - Orchestrator emits `countdownStart` once and later `countdownFinished`. - UI renders “Next round in …” and updates the snackbar. - Orchestrator sets `#next-button[data-next-ready="true"]` and emits `nextRoundTimerReady`. - No readiness is surfaced during `waitingForPlayerAction` or `roundDecision`.
     Implementation checklist

- Refactor `src/helpers/classicBattle/roundManager.js`:
  - Add `isOrchestrated()` helper; when true, do not call `createRoundTimer().start`; just set up `currentNextRound` controls.
  - Remove direct `dispatchBattleEvent('ready')` and direct readiness marking from the orchestrated path.
- Ensure `src/helpers/classicBattle/orchestratorHandlers.js` `initInterRoundCooldown()`:
  - Always hooks `countdownStart` → UI service and `countdownFinished` → readiness + `ready`.
  - Marks Next ready once, on finished.
- Keep `src/helpers/classicBattle/uiService.js` countdown stable and idempotent; ensure `countdownFinished` is always emitted.
- Update `playwright/battle-next-readiness.spec.js` to:
  - Wait initial `cooldown` → `waitingForPlayerAction` after modal choice.
  - After clicking a stat, rely on `nextRoundTimerReady` event (or fallback attribute) for readiness, with 2–6s timeout depending on configured cooldown.
    Notes
- This centralization restores a deterministic single path governing readiness, removing races between roundManager and orchestrator.
- The CLI remains unaffected.

Why the spec still fails

The Next button never receives data-next-ready="true" on battleJudoka during inter-round cooldown. Based on logs and code paths:
roundManager.startCooldown is running (you can see “[test] startCooldown call#1: state=cooldown”).
However, neither the orchestrator-based path (initInterRoundCooldown) nor the roundManager fallback ends up surfacing readiness on the live button despite our re-marking. It’s likely due to the interplay where:
initInterRoundCooldown previously exited early when roundManager controls existed, so it never set dataset nextReady (we removed this, but we still didn’t observe its log “[test] orchestrator: marked Next ready”, implying the countdownFinished path isn’t firing).
The UI service’s countdownStart/Finished path doesn’t seem to be triggering (possibly swallowed by the earlier return dance or by environment specifics).
roundManager’s handleNextRoundExpiration path should mark Next ready and emit nextRoundTimerReady, but the live DOM button never shows data-next-ready (the debug dump shows it stays disabled).
Proposed next steps (surgical, to make the test pass deterministically)

Unify ownership of Next readiness to a single, deterministic path and guarantee the UI service countdown runs even when roundManager controls exist:
Keep orchestratorHandlers.initInterRoundCooldown active (we removed the early return already).
Ensure the UI service countdownStart event runs every time cooldownEnter fires (it’s currently emitted from orchestrator), and on countdownFinished the orchestrator marks Next ready (and emits nextRoundTimerReady).
In roundManager.startCooldown, avoid preempting the orchestrator path. Specifically:
Do not start its own timer when in a browser (or gate with a feature flag).
Still create controls for Next button and expose resolveReady, but delegate “ready” marking to the orchestrator/UI service.
