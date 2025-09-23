# QA Report for battleCLI.html

## Identified Issues

| Issue                                      | Steps to Reproduce                                                                                                                                                                                                                                                                     | Expected vs. Actual                                                                                                                                                                                      |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Difficult Start Flow**                   | 1. Load `battleCLI.html`. <br> 2. Click the yellow power button. <br> 3. A "Select Match Length" dialog appears, but after choosing, nothing happens until the user clicks the power button again.                                                                                     | The PRD expects a clearly labeled "Start Match" control or an immediate start once the match length is selected. The current UI requires two separate clicks on an unlabeled icon, which is unintuitive. |
| **Score Does Not Update**                  | Start a match with a seed (e.g., `42`), select stats over multiple rounds. The outcome message occasionally shows a tie (e.g., `Tie – no score! (Technique – You: 8 Opponent: 8)`), but after many rounds, the "You" and "Opponent" scores in the top-right scoreboard remain `0 : 0`. | Winning or losing rounds should increment scores. Either the score is never updated, or the outcome message is rarely visible.                                                                           |
| **Outcome Messages Disappear Too Quickly** | After selecting a stat, a resolution message (win/tie/loss) flashes for a brief moment and is overwritten by the next round. If the player is not watching the exact area, the feedback is missed.                                                                                     | Outcome messages should persist long enough to be read, ideally until the next user action.                                                                                                              |
| **Quit Confirmation Fails**                | Press `Q` during a round. A modal appears with "Cancel" and "Quit". Clicking "Quit" does not exit the match; the modal disappears, and the match continues. Only pressing `Esc` exits to the home page.                                                                                | According to the PRD, `Q` should allow quitting mid-match. The "Quit" button may not be wired correctly.                                                                                                 |
| **Verbose Mode Unclear**                   | Toggling the "Verbose" checkbox does not visibly change the interface. The PRD states the verbose flag should output extra round details, but no difference was observed.                                                                                                              | The "Verbose" mode should provide additional, visible information about the game state.                                                                                                                  |
| **Timer Resets Unexpectedly**              | When the round timer expires without a selection, the next round starts, but the round number does not increase, and the timer resets. It’s unclear whether missing the timer results in a penalty or auto-selection.                                                                  | The behavior on timer expiration should be clear and have a defined consequence (e.g., a penalty, auto-selection, or a lost round).                                                                      |
| **State Badge/Observability Hidden**       | The PRD mentions a `State:` label that displays the internal battle state when the flag `battleStateBadge` is on. In the CLI UI, this badge remains blank, and there is no setting to enable it.                                                                                       | The state badge should be visible and update when its corresponding feature flag is enabled.                                                                                                             |
| **Accessibility & ARIA**                   | Without a screen reader, it’s hard to verify ARIA-live announcements. However, there are no visible labels on the power icon or match-length buttons, which may be problematic for screen readers.                                                                                     | All interactive elements should have clear, accessible labels for screen readers and other assistive technologies.                                                                                       |

## Actionable Recommendations

### High-Priority Fixes

- **Fix Scoring Bug**
  1. Identify the code responsible for updating scores in the scoreboard.
  2. Debug why the score update logic is not being triggered or is incorrectly calculating scores.
  3. Implement the necessary changes to ensure scores are updated in real-time after each round.
  4. Verify that the scoreboard correctly reflects win/loss outcomes.
- **Visible Outcome Feedback**
  1. Modify the UI logic to pause the display of the round outcome message.
  2. Implement an event listener for user confirmation (e.g., `Enter` or `Space` key press).
  3. Clear the outcome message and proceed to the next round only after user confirmation.
- **Quit Workflow**
  1. Locate the event handler for the "Quit" button in the quit dialog.
  2. Implement the logic to terminate the current match and navigate back to the main menu.
  3. (Optional) Add a keydown listener for 'Q' when the quit dialog is active to trigger the quit action.

### UI/UX Improvements

- **Clear Start Control**
  1. Locate the HTML and CSS for the yellow power icon.
  2. Replace the icon with a clearly labeled "Start Match" button.
  3. Modify the JavaScript to trigger the match start automatically after the match length is selected, removing the need for a second click.
- **Timer Behavior**
  1. Define the desired behavior for timer expiration (e.g., auto-select highest stat, penalty, or loss).
  2. Implement the chosen behavior in the game logic.
  3. Add a clear visual or textual cue in the UI to inform the player about the consequence of the timer expiring.
- **Keyboard Hints**
  1. Add a UI element to display the keyboard hint (e.g., "Press 1–5 to choose a stat").
  2. Ensure this hint is visible only when the game is waiting for stat selection.
  3. Implement ARIA-live region to announce the hint to screen readers.
- **Match Length Selection**
  1. Modify the UI logic to hide the settings panel immediately after the match length is selected.
  2. Implement a mechanism to disable match length changes once a match has started.

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
