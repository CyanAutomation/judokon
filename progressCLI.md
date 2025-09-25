# QA Report for `src/pages/battleCLI.html`

This report details issues found during quality assurance testing of the Classic Battle CLI interface.

| Issue                                        | Steps to Reproduce                                                                                                                                                                                                                                                                                              | Impact                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Unintuitive Match Start**                  | Load the CLI page and set a seed/win target. There is no "Start" button. Pressing keyboard shortcuts shows an "Invalid key" hint until a small, unlabeled power icon is clicked. The PRD envisioned a prominent start action.                                                                                    | Poor discoverability; keyboard-only users may be confused or blocked.                               |
| **Missing "3-Point" Match Length**           | Inspect the "Win target" dropdown. The available values are 5, 10, and 15. The PRD specifies options for 3, 5, and 10 points.                                                                                                                                                                                     | Divergence from PRD; players cannot select a 3-point quick match.                                   |
| **Unreliable Seed Determinism**              | 1. Enter seed `42` and set win target to 5. <br> 2. Start a match and record the first-round stats. <br> 3. Quit to lobby, return to the CLI, re-enter seed `42`, and start a new match. <br> The first-round stat values will be different from the first match.                                                     | Violates the deterministic seed requirement, which undermines repeatability for QA and automation.    |
| **Incomplete Settings Persistence**          | Choose win target 5 and seed 42, then reload the page (Ctrl+R). Both values revert to their defaults (win target 10, blank seed). The PRD expects persistence via `localStorage`.                                                                                                                                 | Users must re-enter preferences each session. Automated tests cannot rely on stored settings.       |
| **Timer Doesn't Pause on Tab Hide**          | Start a round, then switch to another browser tab for ~5 seconds. When you return, the countdown will have decreased even though the game was not visible.                                                                                                                                                       | Violates the requirement that timers pause on tab hide. Players may inadvertently lose their turn. |
| **Confusing Dual Timers**                    | Start a match. The top score bar shows "Time Left: xx s" while the main area shows "Time remaining: xx". These timers often fall out of sync, especially after toggling help or switching tabs.                                                                                                                  | Redundant and inconsistent information can mislead players and screen-reader users.                 |
| **Unclear Verbose Mode**                     | In a match, check the "Verbose" toggle. No log area appears, and it is not clear how to access the verbose data.                                                                                                                                                                                                | The PRD calls for a verbose log view with timestamps; lacking this reduces observability for debugging. |
| **Round Counter Glitch on Quit**             | Start a match, play several rounds, quit, then return to the CLI page. The header will briefly flash the round number from the previous match (e.g., `Round n`) before resetting to `Round 0`.                                                                                                                   | Minor UX bug that could confuse players about whether a new match has properly started.             |
| **Incorrect Keyboard Shortcut State**        | On the initial screen (before a match starts), pressing the number keys `1`, `2`, or `3` silently changes the "Win target" dropdown value to 5, 10, or 15 respectively, without any confirmation.                                                                                                                  | Unintended behavior may cause accidental settings changes.                                          |

---

## Agent Verification & Improvement Plan

After reviewing the code, I can confirm the accuracy of most of the reported issues and propose the following plan to address them.

### 1. Unintuitive Match Start

*   **Verification**: Correct. The `renderStartButton` function is only called as a fallback. The primary flow relies on `initRoundSelectModal`, which is not an obvious way to start a match.
*   **Plan**:
    *   Always render the "Start Match" button on the initial screen.
    *   The "Start Match" button should be the first focusable element.
    *   Pressing "Enter" should trigger this button.

### 2. Missing "3-Point" Match Length

*   **Verification**: Correct. `src/config/battleDefaults.js` confirms `POINTS_TO_WIN_OPTIONS` is `[5, 10, 15]`.
*   **Plan**:
    *   Update `POINTS_TO_WIN_OPTIONS` in `src/config/battleDefaults.js` to `[3, 5, 10]`.
    *   Update the `<select>` element in `src/pages/battleCLI.html` to match, and set the default to 5.

### 3. Unreliable Seed Determinism

*   **Verification**: Correct. `initSeed()` is only called once when the page loads. It is not called when a new match is started via `resetMatch()`. This causes the seed to not be reset.
*   **Plan**:
    *   Modify `resetMatch()` in `src/pages/battleCLI/init.js` to re-initialize the seed by calling `initSeed()` or by re-implementing the seed reset logic within `resetMatch`.

### 4. Incomplete Settings Persistence

*   **Verification**: Partially correct. The report is right that settings don't persist correctly, but the cause is a bug, not a complete lack of implementation. The seed is not correctly applied from `localStorage`, and the win target persistence seems to have issues.
*   **Plan**:
    *   In `initSeed()`, ensure the seed from `localStorage` is not just displayed, but also applied to the battle engine using `setTestMode()`.
    *   Review and fix the `restorePointsToWin` logic to ensure the win target is reliably saved and loaded.

### 5. Timer Doesn't Pause on Tab Hide

*   **Verification**: The code for this (`visibilitychange` event listener) appears to be correct. However, given the report, there may be a subtle bug.
*   **Plan**:
    *   Add logging to the `pauseTimers` and `resumeTimers` functions to trace their execution on tab visibility changes.
    *   Verify that all timers (cooldown, selection) are correctly paused and resumed.

### 6. Confusing Dual Timers

*   **Verification**: Correct. The code attempts to hide the legacy timer but this is a fragile approach. Two different timer displays are being updated from different parts of the code.
*   **Plan**:
    *   Refactor the timer display logic to use a single, unified timer element.
    *   Remove the legacy timer elements from the HTML and the code that updates them.

### 7. Unclear Verbose Mode

*   **Verification**: The code to show the verbose log section seems correct. The issue may be that the section is not being correctly revealed.
*   **Plan**:
    *   Review the `setupFlags` function and the associated CSS to ensure the verbose log section is displayed when the "Verbose" checkbox is checked.
    *   Ensure the log auto-scrolls to the bottom.

### 8. Round Counter Glitch on Quit

*   **Verification**: This is likely a race condition where the UI is not updated synchronously.
*   **Plan**:
    *   In `resetMatch()`, ensure that the round counter in the UI is updated immediately and synchronously before any asynchronous operations.

### 9. Incorrect Keyboard Shortcut State

*   **Verification**: I cannot reproduce this from a code review. The `onKeyDown` handler in `events.js` appears to correctly filter out number keys when not in the `waitingForPlayerAction` state.
*   **Plan**:
    *   Add logging to `onKeyDown` in `src/pages/battleCLI/events.js` to trace which keys are being processed in which state.
    *   If the issue is confirmed, add a more specific check in `shouldProcessKey` or `routeKeyByState` to prevent number keys from being processed when not in the correct state.

I will now await your review of this plan before proceeding with the fixes.