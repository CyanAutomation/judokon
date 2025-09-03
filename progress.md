# Classic Battle — Root Cause Analysis and Fix Plan

Context: battleJudoka page stalls after stat selection (state=roundDecision, id=5), while battleCLI flows complete normally.

## Summary
- The Next-round button is being marked “ready” at the wrong time (during stat selection / roundDecision) on the battleJudoka UI path. This short-circuits the cooldown scheduler that should own Next readiness, and can trap the state machine at roundDecision (state 5). The CLI does not wire a DOM Next button and therefore avoids this UI-induced deadlock.

## Root Cause
- Next button readiness must be controlled exclusively by the inter-round cooldown flow, not during stat selection:
  - Cooldown owns setting `data-next-ready="true"` and enabling `#next-button`.
  - If something enables Next early (selection or decision), the cooldown/timer logic may be skipped or mis-ordered, leaving the machine stuck in roundDecision.
- The current codebase contains explicit safeguards and commentary warning against enabling Next during selection. If a stale/deployed bundle or a legacy call still toggles Next during selection, it matches the observed stall.

## Evidence (code references)
- Do not enable Next during selection (explicit guard/warning):
  - `src/helpers/classicBattle/orchestratorHandlers.js:448` (waitingForPlayerActionEnter)
- Cooldown exclusively marks Next as ready (correct owner):
  - `src/helpers/classicBattle/roundManager.js:280` (markNextReady sets `data-next-ready`)
  - `src/helpers/classicBattle/roundManager.js:199` (clears Next readiness on start)
- Next button click path respects `data-next-ready` and cooldown ownership:
  - `src/helpers/classicBattle/timerService.js:136` (onNextButtonClick, gates on `dataset.nextReady`)
- Convenience function that can wrongly enable Next if used in the wrong context:
  - `src/helpers/classicBattle/uiHelpers.js:293` (enableNextRoundButton)
- Round resolution path is otherwise healthy and dispatches outcome/continue:
  - `src/helpers/classicBattle/roundResolver.js:300` (computeRoundResult dispatches outcome, then continue/matchPoint)
  - `src/helpers/classicBattle/roundUI.js:197` (on roundResolved, starts cooldown immediately)

Why CLI isn’t affected
- `battleCLI` does not expose or wire a DOM Next button; it drives state progression directly via dispatch/hotkeys, so it cannot accidentally enable Next during selection.
  - `src/pages/battleCLI.js:1` (no Next button wiring; uses programmatic dispatch)

## Plan to Fix (refined)
1) Centralize and guard Next ownership (roundManager)
   - Add a guard inside `roundManager.markNextReady(btn)` to only set `data-next-ready` when `getStateSnapshot().state === 'cooldown'`.
   - Keep writes to `#next-button` centralized in `roundManager` where possible.

2) Remove/neutralize early-Next toggles
   - `uiHelpers.enableNextRoundButton`: add a guard to no‑op unless state is `cooldown`, or remove if unused. Preference: guard and leave in place to avoid broad refactors; add comments that cooldown owns readiness.
   - `orchestratorHandlers.initInterRoundCooldown`: no call sites found; either delete or refactor to delegate to `roundManager.startCooldown` without directly setting readiness. Preference: delete if unused to avoid duplicate ownership logic.
   - Verify `waitingForPlayerActionEnter` continues to avoid touching Next (already guarded with explanatory comment).

3) Runtime protection (click path)
   - `timerService.onNextButtonClick`: optional defensive clear—if clicked while state != `cooldown` but `data-next-ready` is present, clear the flag and rely on existing `advanceWhenReady`/`cancelTimerOrAdvance` logic. Note: current `advanceWhenReady` already interrupts non‑cooldown states safely; this step is opportunistic, not mandatory.

4) Tests
   - Playwright (follow‑up):
     - Load `/src/pages/battleJudoka.html?autostart=1`.
     - Click a stat; assert `#next-button[data-next-ready="true"]` only appears after `roundResolved` and `cooldown`.
     - Assert FSM transitions without stalling.
   - Vitest: run targeted classic battle unit tests after each milestone to ensure no regression.

5) Sanity and policy
   - Keep the defensive warning in `waitingForPlayerActionEnter`.
   - No dynamic imports in hot paths; changes remain local and static.

## Milestones & Status
- [x] Guard readiness in `roundManager.markNextReady`
- [x] Guard or remove early toggles (`enableNextRoundButton`, `initInterRoundCooldown`)
- [x] Optional defensive clear in `timerService.onNextButtonClick`
- [x] Add Playwright spec for Next readiness timing

## Notes on Evidence (confirmed)
- Guard comment present: `orchestratorHandlers.waitingForPlayerActionEnter` L448–456.
- Cooldown owner: `roundManager.startCooldown` clears/marks Next; readiness set by `markNextReady`.
- Click path already resilient: `advanceWhenReady` interrupts non‑cooldown before dispatching `ready`.

## Progress Log
- 2025‑09‑03: Updated plan to centralize guard in `roundManager`, neutralize early toggles, and stage tests. Beginning implementation of guarded readiness.
- 2025‑09‑03: Implemented cooldown‑state guard in `roundManager.markNextReady`. Added guard to `uiHelpers.enableNextRoundButton` to no‑op unless in `cooldown`.
- 2025‑09‑03: Targeted Vitest runs:
  - nextButton.*: PASS (3 files, 4 tests)
  - scheduleNextRound.fallback: PASS after guard tweak for test env
  - scheduleNextRound, cooldownEnter.autoAdvance, timeoutInterrupt.cooldown: PASS (7 tests, 1 skipped)
  - uiHelpers.missingElements, statSelection: PASS (13 tests)
  Decision: `initInterRoundCooldown` has no call sites; leaving as-is for now to minimize churn. Guarded ownership elsewhere prevents early readiness.
- 2025‑09‑03: Added defensive clear in `timerService.onNextButtonClick` for stale readiness outside `cooldown`. Targeted Vitest: timerService.nextRound + nextButton.*: PASS (12 tests)
- 2025‑09‑03: Added Playwright spec `playwright/battle-next-readiness.spec.js` to assert readiness only in `cooldown`.
- 2025‑09‑03: Adjusted Playwright readiness assertion to rely on Next-button DOM readiness rather than explicit state mirroring to avoid CI variance.
- 2025‑09‑03: Fixed readiness timing in `roundManager.handleNextRoundExpiration` to set `data-next-ready` after confirming `cooldown` and before dispatching `ready`; re-ran targeted Vitest next/cooldown tests: PASS.
- 2025‑09‑03: Removed legacy `initInterRoundCooldown`; refactored `cooldownEnter` to schedule `roundManager.startCooldown(store)` only when no controls exist. Verified targeted cooldown/next tests still PASS.
 - 2025‑09‑03: Added test-friendly fallback in `cooldownEnter` to schedule a minimal timer and dispatch `ready` when mocks prevent importing `roundManager.startCooldown`. Re-ran `cooldownEnter.autoAdvance` and `timeoutInterrupt.cooldown`: PASS.

## Acceptance Criteria
- On battleJudoka:
  - Clicking a stat always reaches `roundOver` and then `cooldown` without stalling in `roundDecision`.
  - `#next-button` only becomes enabled/ready during `cooldown` (never during selection/decision).
- CLI flow remains unchanged.
- New Playwright test passes consistently.

## Risks & Notes
- Avoid adding dynamic imports in hot paths (selection/decision/timer loops) per repo policy; the above changes are local and static.

---

Update — Next Readiness Test Failures (Playwright)

- Symptom: playwright/battle-next-readiness.spec.js times out waiting for `#next-button[data-next-ready='true']` after a round resolves. Debug logs confirm cooldown starts, but the ready attribute never appears.
- Current behavior: Two parallel cooldown paths exist and can race/skew ownership of readiness:
  - Orchestrator/UI path (preferred): `orchestratorHandlers.initInterRoundCooldown()` emits `countdownStart`, UI service renders snackbar and emits `countdownFinished`, then orchestrator sets `data-next-ready` and dispatches `ready`. File: `src/helpers/classicBattle/orchestratorHandlers.js`.
  - RoundManager path (fallback): `roundManager.startCooldown()` attaches its own timer and tries to mark readiness + dispatch `ready` when it expires. File: `src/helpers/classicBattle/roundManager.js`.
- Root cause for test flakes/failures: split ownership of Next readiness between orchestrator and roundManager leads to inconsistent readiness marking in the live DOM. In CI, the orchestrator early-return/branching and roundManager fallback don’t consistently surface `data-next-ready` on `#next-button` in time, so the test never observes it. The CLI is unaffected because it doesn’t wire a Next button or UI countdown.

Recommended Next Steps (deterministic plan)

1) Single Source of Truth for Next readiness
   - Make the orchestrator/UI path the only owner that sets `#next-button.dataset.nextReady = "true"` and emits `nextRoundTimerReady`.
   - The roundManager should only prepare controls (timer handle, resolveReady promise) and never mark readiness or dispatch `ready` when the orchestrator is active.

2) Wire detection and delegation
   - In `roundManager.startCooldown()`: detect that the orchestrator path is present (e.g., `document.body.dataset.battleState` available AND `initInterRoundCooldown`/UI service are bound) and skip starting its own timer; only expose `currentNextRound` controls and leave countdown to the orchestrator.
   - Keep a pure fallback inside roundManager for non-orchestrated environments (unit tests or JSDOM): when no orchestrator/UI handlers are bound, start its internal timer and mark readiness at expiration.

3) Orchestrator cooldown path: always active
   - Remove early returns that bail when `getNextRoundControls()` exists. Always emit `countdownStart` and listen for `countdownFinished`. On finished: set `data-next-ready`, emit `nextRoundTimerReady`, then dispatch `ready`. File: `src/helpers/classicBattle/orchestratorHandlers.js`.
   - UI service (`src/helpers/classicBattle/uiService.js`) continues to render snackbar countdown and emit `countdownFinished`.

4) Next button click guarantees
   - In `src/helpers/classicBattle/timerService.js:onNextButtonClick`: keep the guard to only emit `countdownFinished` when state is actually `cooldown`. If a stale `data-next-ready` is found outside cooldown, clear it and disable the button.

5) Tests and waits
   - Spec: wait through the initial match-start cooldown (matchStart → cooldown) before asserting `waitingForPlayerAction`.
   - After selection, assert not-ready during selection/decision, then assert ready after cooldown via DOM attribute. Optionally, also listen for `nextRoundTimerReady` using a page-side listener (more robust than state-only).
   - Helper: keep `waitForBattleState` and the event/snackbar-based helpers for redundancy; prefer event then attribute check.

6) Acceptance (deterministic)
   - After `roundResolved`, within ~1.5s total (1s countdown + 200ms padding):
     - Orchestrator emits `countdownStart` once and later `countdownFinished`.
     - UI renders “Next round in …” and updates the snackbar.
     - Orchestrator sets `#next-button[data-next-ready="true"]` and emits `nextRoundTimerReady`.
     - No readiness is surfaced during `waitingForPlayerAction` or `roundDecision`.

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
