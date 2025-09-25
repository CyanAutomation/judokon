# QA Report for `src/pages/battleClassic.html`

This report details issues found during quality assurance testing of the Classic Battle interface.

| Issue                                        | Steps to Reproduce                                                                                                                                                                                                              | Expected (from PRD)                                                                                                                   | Actual Behaviour                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Opponent Card Exposed Prematurely**        | Occasionally, when starting a match (especially after pressing **Next** without selecting match length), the opponent’s card is immediately visible, revealing their stats before the player has acted.                               | The opponent’s card should remain hidden until the player selects a stat.                                                             | The opponent's card sometimes loads already revealed, defeating the suspense of the round.                                                 |
| **Stat Buttons Not Disabled After Selection**  | Select a stat (e.g., Power). The selected button turns blue, but all other stat buttons remain red and clickable. Repeated clicks can advance the round counter multiple times or cause inconsistent state.                      | After choosing a stat, all stat buttons should be disabled until the next round.                                                      | Buttons remain active after selection, allowing for multiple unintended inputs.                                                              |
| **Missing Stat Choice Feedback**             | Pick a stat. The scoreboard only shows the round outcome (e.g., “You win the round!”) and updates the score. There is no message indicating which stats were compared.                                                          | The PRD requires a message indicating the player's and opponent's stat choices and values (e.g., "You picked Speed (8) – Opponent picked Technique (6)"). | The game does not provide context for why a round was won or lost, reducing clarity.                                                       |
| **Missing "Opponent is Choosing" Prompt**    | After selecting a stat, there is no message indicating that the AI is making its choice. The opponent's card simply flips after a short delay.                                                                                | The scoreboard should display “Opponent is choosing…” during the AI's decision delay.                                                 | The delay feels abrupt and uninformative, as there is no feedback explaining the pause.                                                    |
| **"Next" Button State Inconsistent**         | After a round resolves, the **Next** button is greyed out, suggesting it is disabled. However, clicking it still skips to the next round.                                                                                  | The **Next** button should clearly indicate its state (enabled/disabled) and only be clickable when enabled.                          | The button's appearance and behavior are mismatched, which is confusing for the user.                                                      |
| **Main Menu Button Not Functional**          | Clicking the **Main Menu** button in the header has no effect.                                                                                                                                                                | The button should show a confirmation modal and, if confirmed, return the user to the home screen.                                    | The user cannot exit the match via the Main Menu button.                                                                                     |
| **Lacking Keyboard Navigation**              | Pressing **Tab** repeatedly does not cycle through in-game buttons; focus jumps to the browser’s address bar instead. Stat buttons cannot be selected with the keyboard.                                                          | All interactive controls, including stat buttons, should be navigable and operable via the keyboard.                                    | Players who rely on keyboard navigation cannot interact with the game.                                                                     |
| **Timer Does Not Pause on Tab Hide**           | Start a round and switch to another browser tab. The stat-selection timer continues to count down even when the tab is not active.                                                                                         | The timer should pause when the page loses focus and resume when it regains focus.                                                    | Players may inadvertently lose their turn or have a random stat selected for them if they switch tabs.                                     |

---

## Agent Verification & Improvement Plan

After reviewing the code, I can confirm the accuracy of most of the reported issues and propose the following plan to address them.

### 1. Opponent Card Exposed Prematurely

*   **Verification**: Plausible. This is likely a race condition or state management issue, where the UI is rendered before the game state is fully initialized, especially when the match setup flow is bypassed.
*   **Plan**:
    *   Introduce a state flag (e.g., `uiReady`) to ensure the opponent's card is hidden by default.
    *   Only reveal the opponent's card after the `roundResolved` event has fired and the appropriate animations are complete.

### 2. Stat Buttons Not Disabled After Selection

*   **Verification**: Correct. The `handleStatButtonClick` function in `src/pages/battleClassic.init.js` does not call a function to disable the stat buttons after a selection is made.
*   **Plan**:
    *   In `handleStatButtonClick`, after a stat is selected, immediately call `disableStatButtons` to make all stat buttons unclickable.
    *   The buttons should be re-enabled by `renderStatButtons` at the start of the next round.

### 3. Missing Stat Choice Feedback

*   **Verification**: The `showStatComparison` function in `src/helpers/classicBattle/uiHelpers.js` is supposed to show this, but it may not be firing correctly. The `selectStat` function also shows a "You picked" snackbar.
*   **Plan**:
    *   Ensure `showStatComparison` is reliably called after every round resolution.
    *   Consolidate feedback logic to show a single, clear message in the snackbar, formatted as: "You picked: [Your Stat] ([Your Value]) – Opponent picked: [Opponent's Stat] ([Opponent's Value]) – [Outcome]!"

### 4. Missing "Opponent is Choosing" Prompt

*   **Verification**: Correct. The code to display this message exists in `prepareUiBeforeSelection` within `battleClassic.init.js`, but it appears a bug is preventing it from being displayed reliably.
*   **Plan**:
    *   Debug the `prepareUiBeforeSelection` function to ensure `showSnackbar(t("ui.opponentChoosing"))` is always called and the snackbar is visible.

### 5. "Next" Button State Inconsistent

*   **Verification**: Correct. The button has a `disabled` attribute in the HTML, but its visual state is not consistently updated. This is likely a CSS issue.
*   **Plan**:
    *   Add explicit styles in `src/styles/battleClassic.css` for `button[disabled]` to ensure a consistent, visibly disabled state (e.g., `opacity: 0.5; cursor: not-allowed;`).

### 6. Main Menu Button Not Functional

*   **Verification**: Correct. No event listener is attached to the `#home-button` in `battleClassic.init.js`.
*   **Plan**:
    *   Add an event listener to the "Main Menu" button that calls the `quitMatch` function, providing a consistent exit flow.

### 7. Lacking Keyboard Navigation

*   **Verification**: Partially correct. `enableStatButtons` in `statButtons.js` does set `tabIndex = 0`, but this may not be applied in all states. The `statHotkeys` feature flag is also not enabled by default.
*   **Plan**:
    *   Ensure `enableStatButtons` is called at the start of every round to make buttons tabbable.
    *   Enable the `statHotkeys` feature flag by default to allow selection with number keys `1-5`.
    *   Ensure all interactive elements have clear focus states (e.g., a prominent outline).

### 8. Timer Does Not Pause on Tab Hide

*   **Verification**: Correct. The timer logic in `createRoundTimer.js` and `timerService.js` lacks a `visibilitychange` event listener.
*   **Plan**:
    *   Add a `visibilitychange` event listener to the page that calls `timer.stop()` when the tab is hidden and `timer.start()` when it becomes visible again.

I will now await your review of this plan before proceeding with the fixes.