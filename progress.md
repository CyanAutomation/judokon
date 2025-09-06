JU-DO-KON! Investigation Log — battle-next-skip.spec.js failure

Task Contract
- Inputs: playwright/battle-next-skip.spec.js, src/helpers/classicBattle/**, src/pages/battleJudoka.html
- Outputs: progress.md (this file)
- Success: Identify root cause path for non-orchestrated cooldown or missing Next readiness; no code changes yet
- Error mode: Stop before modifying code/tests; document findings and next hypotheses

Repro Steps and Observations
1) Ran the specific Playwright spec
   - Command: npx playwright test playwright/battle-next-skip.spec.js -x
   - Result: Test timed out waiting for Next readiness. Console logs seen:
     - [test] addSelected: stat=power label=Power
     - [test] startCooldown: testMode=false cooldown=1
     - [test] roundResolved event received
     - [test] startCooldown: testMode=false cooldown=1
   - Failure point: page.waitForFunction(() => next-button has data-next-ready="true" and !disabled)

2) Searched for startCooldown definitions/usages
   - Defined: src/helpers/classicBattle/roundManager.js: export function startCooldown(...)
   - Re-export: src/helpers/classicBattle.js: export { startCooldown } ...
   - Code references in src (non-tests): none aside from the definition and a comment in orchestratorHandlers.
   - Non-orchestrated Playwright spec exists (playwright/battle-next-skip.non-orchestrated.spec.js) that calls it directly, but NOT used by the failing test.

3) Who calls computeNextRoundCooldown (logs seen twice)?
   - Orchestrator-owned cooldown: orchestratorHandlers.initInterRoundCooldown() calls computeNextRoundCooldown() via dynamic import.
   - UI surfacing: roundUI (src/helpers/classicBattle/roundUI.js) also calls computeNextRoundCooldown() in its roundResolved handler to render “Next round in: Xs” in snackbar.
   - Conclusion: The duplicate “[test] startCooldown: testMode=false cooldown=1” warnings are expected and do NOT imply that roundManager.startCooldown was called; they come from two independent calls to computeNextRoundCooldown (orchestrator + roundUI text).

4) Validated no orchestrated code calls roundManager.startCooldown
   - Searched the repo; only tests import/call it directly.
   - orchestratorHandlers.cooldownEnter delegates to initInterRoundCooldown(machine) (not to roundManager.startCooldown).

5) Why is Next readiness never set in the failing run?
   - Expected owner: initInterRoundCooldown should immediately set `#next-button.disabled = false` and `data-next-ready = "true"`, then start the engine-backed timer; it also reasserts readiness on a 0ms timeout.
   - Observed: Next never becomes ready in 30s window.
   - The roundResolved UI handler runs (we saw its “[test] roundResolved event received” log), which implies the outcome path executed.
   - State table path: waitingForPlayerAction → roundDecision → roundOver → continue → cooldown → initInterRoundCooldown should run.

6) Autostart path sanity
   - autostart=1 is handled in src/helpers/classicBattle/roundSelectModal.js by:
     a) await onStart() (creates controller → orchestrator inside bootstrap)
     b) emitBattleEvent("startClicked"); await dispatchBattleEvent("startClicked");
   - This correctly defers the dispatch until after the controller/init has finished.

7) Possible culprits and what I ruled out so far
   - handleStatSelection: user suspected; I reviewed its references and the roundUI/roundResolver flow. It does not call startCooldown.
   - Non-orchestrated cooldown: no code path in orchestrated runtime calls roundManager.startCooldown; duplicate cooldown logs are from computeNextRoundCooldown only.
   - Button being re-disabled: resetBattleUI() listens to game:reset-ui and calls resetNextButton() (disables and clears data-next-ready), but this fires during initial machine setup (waitingForMatchStartEnter → doResetGame). After round 1 resolves, initInterRoundCooldown should still mark the button ready again.
   - onNextButtonClick clearing readiness: only runs on click; our failure occurs before clicking Next.

8) Gaps/Hypotheses to verify next
   - Hypothesis A: initInterRoundCooldown is not executing on the autostart path after round 1 resolution (e.g., a missed transition to ‘cooldown’); need to observe machine transitions in-page.
   - Hypothesis B: initInterRoundCooldown throws before reaching the “mark button ready” block (e.g., dynamic import failure), aborting early; computeNextRoundCooldown log could then be coming solely from roundUI, not orchestrator.
   - Hypothesis C: A late UI reset (resetBattleUI/resetNextButton) races after initInterRoundCooldown and clears readiness; need to watch for game:reset-ui emissions post-round.

Planned Next Debug Steps (no code changes yet)
- Add temporary Playwright-side probes to log body dataset and next-button attributes around the roundOver→cooldown transition, or add targeted in-page logging via evaluate to confirm if the machine enters cooldown and whether initInterRoundCooldown runs.
- If imports are failing: reproduce in the browser console with import('../timers/computeNextRoundCooldown.js') from src/helpers/classicBattle/orchestratorHandlers.js context to check path validity under the Playwright server.
- Instrument event bus for nextRoundTimerReady; wait for it in the test to see if it ever fires.

Conclusion so far
- The failure is not caused by a direct call to the non-orchestrated roundManager.startCooldown. The duplicate “[test] startCooldown: …” warnings come from computeNextRoundCooldown being invoked by two orchestrated components (cooldown initializer and UI surfacing).
- Root issue appears to be “Next readiness never applied” after round 1 when autostart=1. Most likely causes are a missed cooldown transition, an early abort inside initInterRoundCooldown (dynamic import error), or a late reset clearing readiness.

Request for guidance
- Do you want me to proceed by adding minimal, targeted diagnostics (logs guarded to test-only) to orchestratorHandlers.initInterRoundCooldown and/or to the Playwright test to capture machine state and nextRoundTimerReady? If preferred, I can also attempt a fix assuming dynamic import ordering is the culprit (e.g., replacing dynamic imports in initInterRoundCooldown with static imports consistent with import policy for hot paths).

---

### Remediation Plan - Attempt 1 (Failed)

The initial hypothesis was that dynamic imports in `initInterRoundCooldown` were causing a race condition. This was addressed by converting them to static imports.

1.  **[Failed]** Refactor `orchestratorHandlers.js` to use static imports for `computeNextRoundCooldown.js` and `nextRoundTimer.js`.
    *   **Result:** The Playwright test `playwright/battle-next-skip.spec.js` continued to fail with the same timeout error. This indicates the dynamic imports were not the root cause of the issue.

---

### Remediation Plan - Attempt 2 (Failed)

This attempt focused on adding diagnostics to the Playwright test and then attempting a fix based on the initial analysis of the logs.

1.  **[Completed]** Modify `playwright/battle-next-skip.spec.js` to add logging that captures:
    *   The `data-battle-state` and `data-prev-battle-state` attributes of the `<body>` element at key points.
    *   The `disabled` and `data-next-ready` attributes of the `#next-button` element.
    *   **Result:** Logs showed that the `#next-button` *did* become ready (`data-next-ready: 'true'`, `nextDisabled: false`) after the `waitForFunction` call, but the subsequent `click()` operation failed because the element was not visible/clickable. This indicated a race condition where the button's state changed immediately after becoming ready.

2.  **[Failed]** Attempt to fix by removing "failsafe" `setTimeout` blocks in `src/helpers/classicBattle/roundUI.js`.
    *   **Rationale:** These `setTimeout` blocks were suspected of causing a race condition by dispatching state machine events, potentially interfering with the orchestrator's control over the "Next" button's state.
    *   **Result:** The `replace` operation failed due to multiple occurrences of the `old_string`. The file `src/helpers/classicBattle/roundUI.js` is currently in a partially reverted state. The Playwright test still fails.

---

### New Remediation Plan

Given the persistent failure and the new insights from logging, the focus shifts to understanding why the "Next" button is not in a clickable state even after it reports as ready. The "failsafe" `setTimeout` blocks in `roundUI.js` are still highly suspicious.

1.  **[In Progress]** Revert `src/helpers/classicBattle/roundUI.js` to its original state.
2.  **[Pending]** Re-apply the fix to `src/helpers/classicBattle/roundUI.js` by removing the "failsafe" `setTimeout` blocks, ensuring both occurrences are handled correctly.
3.  **[Pending]** Run `playwright/battle-next-skip.spec.js` to confirm the fix.
4.  **[Pending]** Run relevant unit tests for `orchestratorHandlers` and `roundManager` to ensure no regressions have been introduced.
5.  **[Pending]** Final documentation and cleanup.
