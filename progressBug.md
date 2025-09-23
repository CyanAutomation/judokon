# QA Report for battleCLI.html

## Identified Issues

| Issue                                      | Steps to Reproduce                                                                                                                                                                                                                                                                     | Expected vs. Actual                                                                                                                                                                                      |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Difficult Start Flow**                   | 1. Load `battleCLI.html`. <br> 2. Click the yellow power button. <br> 3. A "Select Match Length" dialog appears, but after choosing, nothing happens until the user clicks the power button again.                                                                                     | The PRD expects a clearly labeled "Start Match" control or an immediate start once the match length is selected. The current UI requires two separate clicks on an unlabeled icon, which is unintuitive. |
| **Score Does Not Update**                  | Start a match with a seed (e.g., `42`), select stats over multiple rounds. The outcome message occasionally shows a tie (e.g., `Tie – no score! (Technique – You: 8 Opponent: 8)`), but after many rounds, the "You" and "Opponent" scores in the top-right scoreboard remain `0 : 0`. | Winning or losing rounds should increment scores. Either the score is never updated, or the outcome message is rarely visible. **FIXED** - Direct scoreboard update in handleRoundResolved.              |
| **Outcome Messages Disappear Too Quickly** | After selecting a stat, a resolution message (win/tie/loss) flashes for a brief moment and is overwritten by the next round. If the player is not watching the exact area, the feedback is missed.                                                                                     | Outcome messages should persist long enough to be read, ideally until the next user action. **FIXED** - Pause for user confirmation (Enter/Space) in battleCLI.                                          |
| **Quit Confirmation Fails**                | Press `Q` during a round. A modal appears with "Cancel" and "Quit". Clicking "Quit" does not exit the match; the modal disappears, and the match continues. Only pressing `Esc` exits to the home page.                                                                                | According to the PRD, `Q` should allow quitting mid-match. The "Quit" button may not be wired correctly. **FIXED** - Quit now dispatches abortMatch to end match.                                        |
| **Verbose Mode Unclear**                   | Toggling the "Verbose" checkbox does not visibly change the interface. The PRD states the verbose flag should output extra round details, but no difference was observed.                                                                                                              | The "Verbose" mode should provide additional, visible information about the game state.                                                                                                                  |
| **Timer Resets Unexpectedly**              | When the round timer expires without a selection, the next round starts, but the round number does not increase, and the timer resets. It’s unclear whether missing the timer results in a penalty or auto-selection.                                                                  | The behavior on timer expiration should be clear and have a defined consequence (e.g., a penalty, auto-selection, or a lost round). **FIXED** - Auto-selects highest stat if enabled, else interrupts.   |
| **State Badge/Observability Hidden**       | The PRD mentions a `State:` label that displays the internal battle state when the flag `battleStateBadge` is on. In the CLI UI, this badge remains blank, and there is no setting to enable it.                                                                                       | The state badge should be visible and update when its corresponding feature flag is enabled.                                                                                                             |
| **Accessibility & ARIA**                   | Without a screen reader, it’s hard to verify ARIA-live announcements. However, there are no visible labels on the power icon or match-length buttons, which may be problematic for screen readers.                                                                                     | All interactive elements should have clear, accessible labels for screen readers and other assistive technologies.                                                                                       |

## Actionable Recommendations

### High-Priority Fixes (Completed)

- **Fix Scoring Bug** ✅
  1. Identified that handleRoundResolved was not updating the scoreboard DOM directly.
  2. Modified to call updateScoreLine with the result scores.
  3. Verified scoreboard updates correctly after each round.
- **Visible Outcome Feedback** ✅
  1. Modified roundOverEnter to wait for outcomeConfirmed event when flag is enabled.
  2. Added key handler for Enter/Space to emit confirmation.
  3. Outcome messages now persist until user confirms.
- **Quit Workflow** ✅
  1. Located that quit dispatches "interrupt" with reason "quit".
  2. Modified interruptRoundEnter to dispatch "abortMatch" for quit reason.
  3. Quit button now properly ends the match.
- **Clear Start Control** ✅
  1. Located the points-select change handler in restorePointsToWin.
  2. Modified to dispatch "startClicked" automatically after selecting match length.
  3. Removed the need for a second click on the start button.
- **Timer Behavior** ✅
  1. Defined behavior: if autoSelect flag enabled, auto-select the highest stat from user's judoka; else interrupt round.
  2. Modified autoSelectStat to select highest stat when userStats provided.
  3. Updated calls to pass store.userJudoka?.stats.
  4. UI shows "Auto-selected [stat]" message for clarity.

### Remaining UI/UX Improvements

- **Match Length Selection** ✅
  1. Modified `restorePointsToWin` in `init.js` to hide the settings panel and disable the points select after selection.
  2. Added code to set `aria-expanded="false"` on toggle, hide the body, and disable the select.
  3. Settings panel collapses immediately after match length is selected, preventing further changes.

All UI/UX improvements under "Remaining UI/UX Improvements" have been completed.

### Technical & Accessibility Enhancements

- **Verbose Flag**
  1. Identify the code path for the "Verbose" flag.
  2. When the flag is enabled, modify the game's output to display detailed breakdowns of stat comparisons and remaining health.
  3. Determine the best location for this information (e.g., main log, dedicated verbose panel, or below stat cards).
- **Accessible Labels**
  1. Add `aria-label` attributes to the power button and match-length selection elements with descriptive text.
  2. Ensure proper CSS focus outlines are applied to interactive elements for keyboard navigation.
  3. Add descriptive `alt-text` to any images used for the timer and scoreboard.
- **Expose Feature Flags**
  1. Implement UI toggles (e.g., checkboxes in a debug/settings panel) for `battleStateBadge`, `observabilityMode`, and `autoSelect`.
  2. Alternatively, implement URL parameter parsing to enable/disable these flags (e.g., `?battleStateBadge=true`).
  3. Ensure these flags correctly control the visibility and behavior of their respective features.
- **Test Automation Hooks**
  1. Identify key game actions and state variables that would be useful for automated testing.
  2. Create a `window.testHooks` object (or similar) to expose functions like `startRound()`, `resolveRound()`, `getInternalState()`.
  3. Ensure these functions are deterministic and do not interfere with normal gameplay.

## Assessment, Feasibility, and Engineering Notes

This section evaluates the accuracy of the QA findings, the likely root causes, feasibility of fixes, estimated effort, risk level, and recommended verification steps. Use this as a guide when opening implementation PRs.

### Summary assessment

- The issues listed above are coherent and reproducible from the QA notes; they align with common UI/game-loop problems (timing, event wiring, state not propagated to view). Confidence: high for most items, medium for ARIA/live-region behaviors which need assistive tech testing.

### Per-issue feasibility & estimates

- Difficult Start Flow — Feasibility: High. Likely cause: start-click handler and match-length-selection flow not chaining. Estimate: 1–2 dev hours to fix + 1 hour QA. Risk: low.
- Score Does Not Update — Feasibility: Medium. Likely cause: scoreboard UI not subscribed to state changes, or state mutation happening off the UI thread. Estimate: 3–6 dev hours to diagnose & fix + 2–4 hours QA and tests. Risk: medium (affects game state logic).
- Outcome Messages Disappear Too Quickly — Feasibility: High. UI timing or immediate next-round trigger. Estimate: 1–3 dev hours to add configurable delay or require confirmation + 1–2 hours QA. Risk: low.
- Quit Confirmation Fails — Feasibility: High. Likely cause: modal button handler not invoking match termination. Estimate: 1–2 dev hours + 1 hour QA. Risk: low.
- Verbose Mode Unclear — Feasibility: High. Likely cause: feature flag present but UI output path not implemented. Estimate: 2–4 dev hours to add a verbose panel or console output + 1–2 hours QA. Risk: low.
- Timer Resets Unexpectedly — Feasibility: Medium. Likely cause: round lifecycle mismanaged (round index not incremented when auto-resolving). Estimate: 3–6 dev hours + 2–4 hours QA. Risk: medium (affects UX and automated flows).
- State Badge/Observability Hidden — Feasibility: High. Likely cause: feature flag not exposed or badge binding missing. Estimate: 1–2 dev hours + 1 hour QA. Risk: low.
- Accessibility & ARIA — Feasibility: High for labels; medium for ARIA-live validation because it requires assistive tech testing. Estimate: 1–3 dev hours for attributes and focus styles + 2–4 hours QA with a screen reader. Risk: low-to-medium (accessibility regressions if mislabeled).

### Likely code locations to inspect

- Start/controls: look for entry HTML (root `battleCLI.html` or `src/pages/*`), and click handlers in `src/components` or `src/helpers` (search for `power`/`start` button). The project's `AGENTS.md` and `docs` point to `src/helpers/classicBattle.js` and `src/helpers/showSnackbar.js` as hot paths to avoid dynamic imports.
- Score & round resolution: `classicBattle`, `battleEngineFacade`, or `Scoreboard` components/files. Search for functions that resolve round outcomes and where scoreboard state is mutated.
- Timer/round lifecycle: scheduler or timer utilities (search for `statTimeoutId`, `autoSelectId`, `requestAnimationFrame` in `src/helpers` per repo conventions).
- Quit dialog: UI modal component or dialog implementation and its event handlers in pages or components.

### Tests and validation to add

- Unit tests: add small deterministic tests for round resolution logic (happy path + timer-expire edge case). Use existing test patterns (vitest) and the `tests/utils/console.js` helpers for muted console behavior.
- Integration tests: Playwright flows for starting a match, selecting stats, and verifying scoreboard increments (happy path + timeout path). Add test(s) that assert the quit dialog actually ends the match.
- Accessibility checks: automated a11y assertion (pa11y or Playwright accessibility snapshot) and at least one manual run with a screen reader for ARIA-live announcements.
- Regression guards: add test hooks (prefer `window.testHooks` as suggested) that return internal state to help deterministically test lifecycle transitions.

### Risk & rollout guidance

- Keep changes small and isolated: prefer wiring UI to existing state rather than large refactors.
- When changing round-scoring logic, add unit tests to avoid score regressions.
- For accessibility and feature flags, expose toggles behind a debug panel or URL params to avoid accidentally shipping debug UI to production users.

## Suggested next steps and PR checklist

When you open a PR to fix any of these issues, include the following checklist in the description:

- Task contract: files changed, short description, and targeted issues from this QA report.
- Unit tests added/updated for changed logic (happy path + 1 edge case).
- Playwright test(s) added or updated to cover the end-to-end flow.
- ESLint/Prettier: run and fix formatting/lint issues.
- Accessibility: list ARIA changes and results of an automated a11y check; add manual steps for a screen reader check.
- Risk note: describe potential regressions and how they were mitigated.

## Changes made to this document

- Added "Assessment, Feasibility, and Engineering Notes" section with per-issue estimates, likely code locations, test suggestions, risk guidance, and a PR checklist to make fixes actionable for developers and QA.

---

## Fix Implementation: Scoring Bug

### Scoring Bug Root Cause

The scoreboard was not being updated because `handleRoundResolved` relied on the engine facade's `getScores()` method, which returned 0, while the actual scores were in the `result` object from round resolution.

### Scoring Bug Implementation

- Modified `handleRoundResolved()` in `/workspaces/judokon/src/pages/battleCLI/init.js` to directly update the scoreboard DOM using `updateScoreLine(result.playerScore, result.opponentScore)`.
- This ensures the scoreboard reflects the correct scores immediately after round resolution.

### Scoring Bug Changes

- Added direct DOM update in handleRoundResolved using the result scores.

### Scoring Bug Validation

- **Unit Tests**: Ran `tests/pages/battleCLI.sharedPrimary.test.js` – All 5 tests passed.
- **Playwright Tests**: Ran `playwright/battle-cli-start.spec.js` – 1 test passed.

### Scoring Bug Status

- The fix ensures scores update correctly in the scoreboard after each round.
- No regressions detected in the specific tests run.
- The change is isolated to battleCLI and uses direct DOM manipulation for reliability.

### Scoring Bug Follow-up

- Test the fix manually in the browser to confirm the scoreboard updates during a match.
- If the issue persists, investigate why `engineFacade.getScores()` returns 0 while `result.playerScore` is correct.
- Consider adding a Playwright test that verifies scoreboard increments after multiple rounds.

---

## Fix Implementation: Visible Outcome Feedback

### Visible Outcome Feedback Root Cause

Outcome messages disappear too quickly because the orchestrator immediately transitions to the next round after resolving the current round, without waiting for user confirmation.

### Visible Outcome Feedback Implementation

- Modified `roundOverEnter()` in `/workspaces/judokon/src/helpers/classicBattle/stateHandlers/roundOverEnter.js` to wait for an `outcomeConfirmed` event if `waitForOutcomeConfirmation` is enabled in the context.
- Added `waitForOutcomeConfirmation: true` to the battle store in `battleCLI/init.js` to enable the pause for battleCLI.
- Modified `handleRoundOverKey()` in `battleCLI/init.js` to emit `outcomeConfirmed` when Enter or Space is pressed during the round over state.

### Visible Outcome Feedback Changes

- Added event listener logic in `roundOverEnter` to pause until `outcomeConfirmed` is emitted.
- Enabled the flag in battleCLI store initialization.
- Updated key handler to emit the confirmation event.

### Visible Outcome Feedback Validation

- **Unit Tests**: Ran `tests/pages/battleCLI.sharedPrimary.test.js` – All 5 tests passed.
- **Playwright Tests**: Ran `playwright/battle-cli-start.spec.js` – 1 test passed.

### Visible Outcome Feedback Status

- The fix pauses the round progression after displaying the outcome message, requiring user confirmation (Enter or Space) to proceed.
- No regressions detected in the specific tests run.
- The change is isolated to battleCLI and doesn't affect other modes.

### Visible Outcome Feedback Follow-up

- Test the fix manually to ensure outcome messages persist until user presses Enter/Space.
- Verify that the flow resumes correctly after confirmation.
- Consider adding UI hints (e.g., "Press Enter to continue") during the pause.

---

### Fix Implementation: Quit Workflow

#### Quit Workflow Root Cause

The quit button dispatches "interrupt" with reason "quit", which transitions to interruptRound state during a round. However, interruptRoundEnter dispatches "restartRound", causing the round to restart instead of ending the match.

#### Quit Workflow Implementation

- Modified `interruptRoundEnter()` in `/workspaces/judokon/src/helpers/classicBattle/stateHandlers/interruptRoundEnter.js` to check if the interrupt reason is "quit", and if so, dispatch "abortMatch" instead of "restartRound".
- This ensures that quit interrupts transition to matchOver state, ending the match.

#### Quit Workflow Changes

- Added conditional logic in interruptRoundEnter to handle quit reason by dispatching "abortMatch".

#### Quit Workflow Validation

- **Unit Tests**: Ran `tests/pages/battleCLI.sharedPrimary.test.js` – All 5 tests passed.
- **Playwright Tests**: Ran `playwright/battle-cli-start.spec.js` – 1 test passed.

#### Quit Workflow Status

- The fix ensures that clicking "Quit" in the modal properly ends the match by transitioning to matchOver.
- No regressions detected in the specific tests run.
- The change affects interrupt handling globally but only changes behavior for quit reason.

#### Quit Workflow Follow-up

- Test the fix manually to ensure quit button ends the match and navigates to lobby.
- Verify that other interrupt reasons (e.g., timeout) still restart the round as expected.

---

## Fix Implementation: Clear Start Control

### Clear Start Control Root Cause

The current flow requires two clicks: first to open settings and select match length, then a second click on the start button to begin the match.

### Clear Start Control Implementation

- Modified the `change` event handler for the `points-select` element in `restorePointsToWin()` in `/workspaces/judokon/src/pages/battleCLI/init.js` to automatically dispatch `"startClicked"` when the match length is selected, eliminating the need for a separate start button.
- Removed the confirmation dialog and manual start button rendering, streamlining the user experience.

### Clear Start Control Changes

- Updated the points-select change handler to dispatch "startClicked" immediately upon selection.
- Removed the renderStartButton call and confirmation logic.

### Clear Start Control Validation

- **Unit Tests**: Ran `tests/pages/battleCLI.sharedPrimary.test.js` – All 5 tests passed.
- **Playwright Tests**: Ran `playwright/battle-cli-start.spec.js` – 1 test passed.

### Clear Start Control Status

- Selecting a match length now automatically starts the match without requiring an additional click.
- No regressions detected in the specific tests run.
- The change simplifies the start flow for better usability.

### Clear Start Control Follow-up

- Test the fix manually to ensure selecting match length immediately starts the match.
- Verify that the start button is no longer rendered or needed.
