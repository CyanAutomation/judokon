# QA Report for battleCLI.html

## Identified Issues

| Issue | Steps to Reproduce | Expected vs. Actual |
| :--- | :--- | :--- |
| **Difficult Start Flow** | 1. Load `battleCLI.html`. <br> 2. Click the yellow power button. <br> 3. A "Select Match Length" dialog appears, but after choosing, nothing happens until the user clicks the power button again. | The PRD expects a clearly labeled "Start Match" control or an immediate start once the match length is selected. The current UI requires two separate clicks on an unlabeled icon, which is unintuitive. |
| **Score Does Not Update** | Start a match with a seed (e.g., `42`), select stats over multiple rounds. The outcome message occasionally shows a tie (e.g., `Tie – no score! (Technique – You: 8 Opponent: 8)`), but after many rounds, the "You" and "Opponent" scores in the top-right scoreboard remain `0 : 0`. | Winning or losing rounds should increment scores. Either the score is never updated, or the outcome message is rarely visible. |
| **Outcome Messages Disappear Too Quickly** | After selecting a stat, a resolution message (win/tie/loss) flashes for a brief moment and is overwritten by the next round. If the player is not watching the exact area, the feedback is missed. | Outcome messages should persist long enough to be read, ideally until the next user action. |
| **Quit Confirmation Fails** | Press `Q` during a round. A modal appears with "Cancel" and "Quit". Clicking "Quit" does not exit the match; the modal disappears, and the match continues. Only pressing `Esc` exits to the home page. | According to the PRD, `Q` should allow quitting mid-match. The "Quit" button may not be wired correctly. |
| **Verbose Mode Unclear** | Toggling the "Verbose" checkbox does not visibly change the interface. The PRD states the verbose flag should output extra round details, but no difference was observed. | The "Verbose" mode should provide additional, visible information about the game state. |
| **Timer Resets Unexpectedly** | When the round timer expires without a selection, the next round starts, but the round number does not increase, and the timer resets. It’s unclear whether missing the timer results in a penalty or auto-selection. | The behavior on timer expiration should be clear and have a defined consequence (e.g., a penalty, auto-selection, or a lost round). |
| **State Badge/Observability Hidden** | The PRD mentions a `State:` label that displays the internal battle state when the flag `battleStateBadge` is on. In the CLI UI, this badge remains blank, and there is no setting to enable it. | The state badge should be visible and update when its corresponding feature flag is enabled. |
| **Accessibility & ARIA** | Without a screen reader, it’s hard to verify ARIA-live announcements. However, there are no visible labels on the power icon or match-length buttons, which may be problematic for screen readers. | All interactive elements should have clear, accessible labels for screen readers and other assistive technologies. |

## Actionable Recommendations

### High-Priority Fixes
*   **Fix Scoring Bug**: Investigate why scores remain at `0 : 0`. Ensure the scoreboard updates in real-time and correctly reflects round outcomes.
*   **Visible Outcome Feedback**: Keep the result message and stat comparison displayed until the player confirms the next round (e.g., by pressing `Enter` or `Space`).
*   **Quit Workflow**: Ensure that clicking "Quit" in the quit dialog ends the match and returns to the main menu. Optionally, allow `Q` to quit directly when the dialog is shown.

### UI/UX Improvements
*   **Clear Start Control**: Replace the yellow power icon with an explicit "Start Match" button. The match should start automatically after selecting the match length.
*   **Timer Behavior**: Clarify in the UI what happens if the timer expires. Either auto-select the highest stat or mark it as a loss, and communicate this to the player.
*   **Keyboard Hints**: Display a prompt such as "Press 1–5 to choose a stat" near the stat cards when waiting for input. Use ARIA-live to announce this to screen readers.
*   **Match Length Selection**: After choosing the match length, hide the settings panel to focus on the match. Consider allowing the match length to be changed only before starting, not mid-match.

### Technical & Accessibility Enhancements
*   **Verbose Flag**: If enabled, include detailed breakdowns (stat values compared, remaining health, etc.) either in the main log or below the stat cards.
*   **Accessible Labels**: Add `aria-label` attributes and focus outlines to the power button and match-length options. Provide descriptive `alt-text` for the timer and scoreboard.
*   **Expose Feature Flags**: Provide toggles or URL parameters for `battleStateBadge`, `observabilityMode`, and `autoSelect` as per the PRD to aid debugging and automated testing.
*   **Test Automation Hooks**: Expose deterministic callbacks (e.g., to start a round, resolve a round, or fetch the internal state) on the `window` object to facilitate automated QA.