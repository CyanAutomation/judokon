
# QA Report: `src/pages/battleClassic.html`

This report details issues found during testing of the Classic Battle page, cross-referencing the implementation with the project’s Product Requirements Documents (PRDs). Each issue includes reproduction steps, expected vs. actual behavior, and a verification analysis.

**Key:**

*   **Status:**
    *   <span style="color:green;">✔</span> **Verified:** Issue is confirmed and accurately described.
    *   <span style="color:blue;">ℹ️</span> **Plausible:** Issue is likely present but may be intermittent (e.g., a race condition) and is difficult to confirm definitively by static analysis alone.
    *   <span style="color:orange;">❌</span> **Discrepancy:** The report’s claim contradicts findings from the codebase or documentation.
*   **Fix Plan:** An assessment of the proposed "Improvement Opportunities."

---

## 1. Mismatch in Win-Target Options

*   **Status:** <span style="color:green;">✔</span> **Verified**
*   **Issue:** The win-target options presented to the player (**5, 10, 15 points**) are inconsistent with the values specified in `prdBattleClassic.md` (**3, 5, 10 points**).
*   **Steps to Reproduce:**
    1.  Start the game and observe the "Select Match Length" modal.
    2.  Buttons are labeled **Quick**, **Medium**, and **Long**.
    3.  Hovering over **Quick** shows a tooltip: "First to 5 points wins."
*   **Expected vs. Actual:** The PRD specifies that players should choose between 3, 5, or 10 points. The UI offers 5, 10, or 15 points, creating a mismatch between documentation and implementation.
*   **Verification:**
    *   `prdBattleClassic.md` explicitly lists `POINTS_TO_WIN_OPTIONS` as `[3, 5, 10]`.
    *   However, `src/data/battleRounds.js` and the fallback in `src/helpers/classicBattle/roundSelectModal.js` both define the options as 5, 10, and 15 points.
    *   This is a clear inconsistency between the core requirements and the current code.
*   **Fix Plan:** **Feasible.** The proposed fix to align the UI and tooltips with the PRD is correct. The values in `src/data/battleRounds.js` and the fallback array in `roundSelectModal.js` must be updated.

## 2. Scoreboard Not Resetting on Replay

*   **Status:** <span style="color:blue;">ℹ️</span> **Plausible**
*   **Issue:** After a match, clicking **Replay** sometimes fails to reset the scoreboard, causing the new match to start with the previous match's scores.
*   **Steps to Reproduce:**
    1.  Finish or quit a match.
    2.  Click **Replay**.
    3.  Observe the score bar at the top, which may intermittently display the old score.
*   **Expected vs. Actual:** The score should reset to 0–0 for every new match.
*   **Verification:**
    *   The `handleReplay` function in `src/helpers/classicBattle/roundManager.js` appears to correctly reset the score by calling `updateScoreboard(0, 0)` and emitting a `display.score.update` event.
    *   The issue is described as intermittent ("sometimes"), which suggests a potential race condition where the UI updates with stale data before the reset logic completes.
    *   While the code for resetting state seems correct, its interaction with the UI render cycle may be flawed.
*   **Fix Plan:** **Feasible.** The recommendation to ensure all internal counters are reset is sound. Investigating the UI update timing and event sequence around the `Replay` action is critical. Adding logs, as suggested, would help diagnose where the state update is failing or being ignored.

## 3. Game Hangs After Several Rounds

*   **Status:** <span style="color:blue;">ℹ️</span> **Plausible**
*   **Issue:** The game occasionally hangs after a round resolves. The timer reaches 0, stat buttons are disabled, and the "Next" button is inactive, preventing progress.
*   **Steps to Reproduce:** Play through several rounds (observed around Round 6) and wait for the timer to expire.
*   **Expected vs. Actual:** After a round resolves, a 3-second cooldown should start, followed automatically by the next round. Instead, the UI becomes stuck.
*   **Verification:**
    *   The `handleRoundResolvedEvent` in `src/helpers/classicBattle/roundUI.js` is responsible for initiating the next round's cooldown via `startRoundCooldown`.
    *   The report suggests that the `roundStarted` event sometimes fails to fire after the cooldown. This points to a potential failure in the state machine or event dispatching sequence.
    *   Like the scoreboard issue, this is likely a race condition or an unhandled edge case in the game loop that is difficult to verify with static analysis alone.
*   **Fix Plan:** **Feasible.** The suggestion to add logging hooks and use the `battleStateProgress` feature flag is the correct approach to diagnose this type of intermittent bug.

## 4. Incorrect Final Score When Quitting

*   **Status:** <span style="color:green;">✔</span> **Verified**
*   **Issue:** Quitting a match immediately after it starts results in an incorrect score display (e.g., "You lose! (3–3)") in the "Match Over" modal, even if no rounds were played.
*   **Steps to Reproduce:**
    1.  Start a match.
    2.  Immediately click **Quit** and confirm.
*   **Expected vs. Actual:** The end modal should show a 0–0 score if no rounds were played.
*   **Verification:**
    *   The `quitMatch` function in `src/helpers/battleEngine.js` correctly returns the *current* scores when a match is quit.
    *   However, the `showEndModal` function in `src/helpers/classicBattle/endModal.js` appears to be receiving stale score data. This indicates that the score is not being properly fetched or reset before the modal is displayed.
*   **Fix Plan:** **Feasible.** The proposed fix is correct. The score must be accurately computed based on rounds played before the quit modal is rendered.

## 5. Missing Outcome Messages and Inconsistent Round Counter

*   **Status:** <span style="color:blue;">ℹ️</span> **Plausible**
*   **Issue:** Round outcome messages (e.g., "You picked…") are sometimes delayed, and the round counter occasionally jumps ahead (e.g., from Round 1 to Round 3).
*   **Expected vs. Actual:** Outcome messages should display immediately, and the round counter should increment sequentially.
*   **Verification:** This issue is likely a symptom of the same underlying problem as the game hang (Issue #3), where the state machine or event queue is experiencing race conditions or processing delays.
*   **Fix Plan:** **Feasible.** The fix is tied to resolving the inter-round hang bug. Ensuring the `roundResolved` and `roundStarted` events fire reliably and in the correct order will likely fix this as well.

## 6. Medium/Long Match Lengths Lack Description

*   **Status:** <span style="color:green;">✔</span> **Verified**
*   **Issue:** While the "Quick" match option shows a descriptive snackbar ("First to 5 points wins"), the "Medium" and "Long" options do not.
*   **Steps to Reproduce:** Select "Medium" or "Long" using number keys.
*   **Expected vs. Actual:** All match length selections should provide clear feedback to the player about the win target.
*   **Verification:**
    *   `src/data/tooltips.json` contains tooltips for all three match lengths.
    *   However, the UI code that triggers the snackbar message appears to be implemented only for the "Quick" option.
*   **Fix Plan:** **Feasible.** The fix is straightforward: extend the snackbar logic to cover all match length selections to ensure consistent player feedback.

## 7. Card & Stat Contrast

*   **Status:** <span style="color:orange;">❌</span> **Discrepancy**
*   **Issue:** The report claims that some UI elements (stat buttons, card text) may not meet WCAG 4.5:1 contrast ratios.
*   **Verification:**
    *   The project includes an automated contrast checker (`npm run check:contrast`).
    *   Running this command returns: **"No issues found!"**
    *   While manual review is always valuable, the automated tooling indicates that the current color scheme passes the required contrast checks. The report should be updated to reflect this.
*   **Fix Plan:** **Not currently required.** The automated tests pass. If specific elements are still a concern, they should be identified and re-evaluated with more precise tooling.

## 8. Accessibility Description Missing for Stat Buttons

*   **Status:** <span style="color:blue;">ℹ️</span> **Plausible**
*   **Issue:** Dynamically generated stat buttons are missing the `aria-describedby` attribute, making them less accessible to screen reader users.
*   **Expected vs. Actual:** Each stat button should have an `aria-describedby` attribute linking to a description of the stat.
*   **Verification:**
    *   The function `applyStatLabels` in `src/helpers/classicBattle/uiHelpers.js` is designed to add these attributes.
    *   The issue's presence suggests this function may be failing silently or is not being called at the correct time in the component lifecycle. The `try...catch` block within it may be suppressing errors.
*   **Fix Plan:** **Feasible.** The proposed fix is correct. The implementation of `applyStatLabels` needs to be debugged to ensure it executes reliably.

## 9. Timer Drift Detection Not Implemented

*   **Status:** <span style="color:green;">✔</span> **Verified**
*   **Issue:** The PRD requires the UI to display a "Waiting…" message if the timer drifts by more than 2 seconds, but this functionality is not implemented as specified.
*   **Steps to Reproduce:** (Difficult to reproduce manually without forcing system lag).
*   **Expected vs. Actual:** A snackbar with "Waiting…" should appear on significant timer drift.
*   **Verification:**
    *   `src/helpers/TimerController.js` includes drift detection logic with a `DRIFT_THRESHOLD` of 2 seconds.
    *   However, the `onTimerDrift` handler in `src/helpers/classicBattle/orchestrator.js` emits a `scoreboardShowMessage` with the text "Timer drift detected: ...s. Timer reset.", which does not match the "Waiting..." message specified in the PRD.
    *   Furthermore, the `handleTimerDrift` function in `src/helpers/battle/engineTimer.js` only stops the timer but does not restart it as required.
*   **Fix Plan:** **Feasible.** The implementation needs to be corrected to display the specified "Waiting…" message via a snackbar and to properly restart the countdown timer after a drift event.

---

## Overall Assessment & Recommendations

The QA report is largely accurate, identifying several critical and plausible bugs that degrade the user experience and violate PRD requirements. The proposed improvement opportunities are sound and provide a clear path to resolution.

**Priority Recommendations:**

1.  **Fix the Win-Target Mismatch (Issue #1):** This is a straightforward but critical fix to align the game with its core design documents.
2.  **Investigate the Game Hang (Issue #3):** This is the most severe bug. The suggestion to add extensive logging is the best first step to diagnose this intermittent issue.
3.  **Correct the Quit Score (Issue #4):** This is another clear bug that should be addressed to ensure accurate end-of-match reporting.
4.  **Implement Correct Timer Drift Handling (Issue #9):** The current implementation is incomplete and does not meet the PRD spec.

The remaining issues, while lower priority, are still important for delivering a polished and accessible experience.
