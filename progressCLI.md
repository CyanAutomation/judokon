# QA Report for `src/pages/battleCLI.html`

**Reviewer:** Gemini

## Reviewer's Summary

This report has been revised to clarify the issues found during testing of the Classic Battle CLI page. The original report's findings are largely accurate, though some verification notes have been updated based on a direct code review.

The most significant issues are related to **timer management during modals** and a **confusing match start flow**. The timer logic appears to be complex and prone to bugs, leading to a poor user experience and deviations from PRD requirements.

This updated report provides a cleaner, more readable format and offers specific, actionable recommendations for each issue.

---

## 1. CRITICAL: Timer Does Not Pause During Quit Modal

- **Finding:** When the "Quit" modal is open, the round timer continues to count down in the background. This violates the PRD requirement that timers must pause when a modal is active.
- **Verification:** The `showQuitModal()` function correctly calls `pauseTimers()`, which is intended to clear the timer intervals. However, the UI continues to update. This suggests that while the core logic might be paused, the UI-level countdown is not, or that the `pauseTimers` function is not working as expected. The timer logic is complex, with multiple `setInterval` and `setTimeout` calls, making it susceptible to such bugs.
- **Recommendation:** Refactor the timer logic to use a single, pausable timer object instead of separate `interval` and `timeout` variables. This will simplify the code and make it easier to reliably pause and resume. At a minimum, `pauseTimers` needs to be debugged to ensure it stops all timer-related activity, including UI updates.

## 2. HIGH: Timer Resets After Cancelling Quit

- **Finding:** After opening the "Quit" modal and then closing it (by pressing "Escape" or clicking "Cancel"), the round timer resets to its full duration (e.g., 30 seconds) instead of resuming from where it was paused.
- **Verification:** The `resumeTimers()` function is called on modal close. It attempts to restart the countdown with the `pausedSelectionRemaining` value. The fact that it resets suggests that `pausedSelectionRemaining` is either not being captured correctly in `pauseTimers()` or that `startSelectionCountdown()` is not using the provided value correctly.
- **Recommendation:** Debug the `pauseTimers` and `resumeTimers` functions. Ensure that the remaining time is correctly captured, stored, and then used to resume the countdown.

## 3. HIGH: Confusing and Inconsistent Match Start Flow

- **Finding:** The match does not start in a clear or consistent way. The "Select Match Length" modal sometimes fails to appear, leaving the user with no clear instructions. Pressing "Enter" (a common way to start) results in an "Invalid key" error.
- **Verification:** The `init()` function calls `initRoundSelectModal()`, with `renderStartButton()` as a fallback if it fails. The inconsistency suggests that `initRoundSelectModal` is error-prone. The key handler in the `waitingForMatchStart` state does not handle "Enter".
- **Recommendation:**
  1.  Make the start flow more robust. If `initRoundSelectModal` fails, `renderStartButton` should provide a very clear, prominent button to start the match.
  2.  Add support for the "Enter" key to either open the match length modal or to start the match directly.
  3.  Add a tooltip or a visible hint near the lightning-bolt icon to indicate that it can start a match.

## 4. MEDIUM: Enter Key Does Not Confirm Stat Selection

- **Finding:** When navigating stats with the arrow keys, pressing "Enter" does not select the highlighted stat. Only number keys (1-5) work.
- **Verification:** The `handleWaitingForPlayerActionKey()` function only checks for numeric keys.
- **Recommendation:** Modify `handleWaitingForPlayerActionKey()` to also handle the "Enter" key. When "Enter" is pressed, it should select the currently highlighted stat (which can be tracked in the application state).

## 5. MEDIUM: Poor Focus Management in Quit Modal

- **Finding:** In the "Quit" modal, only the "Cancel" button has a visible focus ring. The "Quit" button is not focusable via the Tab key, making it inaccessible to keyboard-only users.
- **Verification:** This is an accessibility issue likely originating in the `createModal` or `createButton` components, or in the way the modal is constructed in `showQuitModal()`.
- **Recommendation:** Ensure that both buttons in the modal are focusable and have a visible focus style. The `tabindex` of the buttons should be managed correctly.

## 6. LOW: Inconsistent Timer Terminology

- **Finding:** The UI uses different labels for the timer, such as "Timer:", "Time remaining:", and "Time Left:".
- **Verification:** The code confirms this. `setCountdown()` in `battleCLI.init.js` uses "Timer:", while `startSelectionCountdown()` and the `timerTick` event handler in `battleCLI/init.js` use "Time remaining:".
- **Recommendation:** Standardize on a single, consistent label for the timer across the entire application. "Time remaining:" is a good choice.

## 7. LOW: Verbose Log Feature is Hidden

- **Finding:** The verbose log feature is difficult to discover and use. There is no UI indicator to show that it is active.
- **Verification:** The feature is controlled by the `cliVerbose` feature flag and is hidden by default.
- **Recommendation:** Add a small, visible indicator (e.g., "Verbose ON") to the UI when this mode is active. Consider automatically showing the log pane when it's enabled.

## 8. LOW: No Screen Reader Announcement on Match End

- **Finding:** When a match ends, there is no announcement for screen reader users to indicate the outcome.
- **Verification:** The `handleMatchOver()` function, which is called at the end of a match, does not trigger any `aria-live` announcements.
- **Recommendation:** Add an `aria-live` region to the page and use it to announce the final result of the match (e.g., "Match over. You win!").

## 9. LOW: Seed Validation Is Not Real-Time

- **Finding:** The original report stated there was no validation for the seed input. This is incorrect. Validation exists, but it only triggers on the `change` event (when the user clicks away from the input), not in real-time.
- **Verification:** The `initSeed()` function attaches a `change` event listener to the seed input.
- **Recommendation:** For a better user experience, change the event listener from `change` to `input` to provide real-time validation as the user types.
