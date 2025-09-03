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

## Plan to Fix

1. Assert Next ownership: add a centralized guard so only cooldown flow can set `data-next-ready`.
   - Add a small helper (e.g., `setNextReady(enabled)`) inside `roundManager.js` that checks current state (via `getStateSnapshot`) and only allows `enabled=true` when state is `cooldown`.
   - Replace direct `btn.dataset.nextReady` writes in `roundManager.js` with this helper.

2. Audit and remove early-Next toggles:
   - Search for `enableNextRoundButton` and any direct `dataset.nextReady` writes outside `roundManager.js` and delete/migrate them to the cooldown flow.
   - Verify `waitingForPlayerActionEnter` continues to avoid touching Next (already guarded).

3. Strengthen runtime protection:
   - In `timerService.onNextButtonClick`, if clicked while state != `cooldown` and `data-next-ready` is present, clear the flag and either stop an active timer or dispatch a safe `interrupt → cooldown` before `ready`. This converts a potential stall into a recoverable path.

4. Tests (Playwright):
   - Add a spec that:
     - Autostarts classic battle (`/src/pages/battleJudoka.html?autostart=1`).
     - Waits for stat buttons enabled, clicks one.
     - Asserts `#next-button[data-next-ready="true"]` does NOT appear until after `roundResolved` and state transitions to `cooldown`.
     - Asserts state progresses: waitingForPlayerAction → roundDecision → roundOver (→ cooldown) within a short window.

5. Sanity checks:
   - Keep the existing defensive comment and warning in `waitingForPlayerActionEnter`.
   - Optionally log a debug panel note when an early-Next attempt is blocked (behind test flag).

## Acceptance Criteria

- On battleJudoka:
  - Clicking a stat always reaches `roundOver` and then `cooldown` without stalling in `roundDecision`.
  - `#next-button` only becomes enabled/ready during `cooldown` (never during selection/decision).
- CLI flow remains unchanged.
- New Playwright test passes consistently.

## Risks & Notes

- Avoid adding dynamic imports in hot paths (selection/decision/timer loops) per repo policy; the above changes are local and static.
