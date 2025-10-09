# QA Report for `src/pages/battleClassic.html` - Revised

This report has been revised based on a detailed code review. The root cause of the critical issues has been identified, and the fix plan has been updated accordingly.

---

## 1. Match never starts

- **Steps to reproduce:**
  1.  Load `battleClassic.html` in a Chrome browser.
  2.  The page displays the scoreboard header ("Round 0 – You: 0 Opponent: 0") and two buttons (“Replay”, “Quit”).
  3.  There is no modal asking for the 3/5/10 point target.
  4.  Clicking **Replay** or **Quit** or pressing **Enter** does nothing, and the match never begins.

- **Expected behaviour:**

  > On first visit, a modal should ask the player to choose 3/5/10 points, then the match should start automatically with the first card drawn. If test or headless mode is detected, the game should auto-start and begin the first round.

- **Observed behaviour:**
  > **Finding:** The report is **accurate**. The root cause is a silent failure when loading `judoka.json`. The `loadJudokaData` function in `src/helpers/classicBattle/cardSelection.js` incorrectly returns an empty array on error instead of throwing an exception. This causes a cascade of failures, leading to the game getting stuck.

---

## 2. Dependent Issues (Symptoms of "Match never starts")

- **Quit flow unresponsive:** The game is not initialized, so the event listeners for the buttons are not attached.
- **Replay button does nothing:** The game is not initialized, so the event listeners for the buttons are not attached.
- **No way to return to main menu:** The game is not initialized, so the UI is not fully rendered.
- **Stat buttons and card view never render:** The game is not initialized, so the cards are not drawn.

---

## 3. Other Issues

### Accessibility: missing descriptions for stat buttons (cannot confirm)

- **Status:** Not testable due to match not starting.
- **Expectation:** When stat buttons eventually render, each should have an `aria-describedby` linking to a short description.

### Dataset load failure not surfaced

- **Steps to reproduce:** If the engine fails to load `judoka.json`, the PRD specifies that an error with a “Retry” option must be shown.
- **Expected behaviour:** On failure to load data, the UI should display a message and a retry button.
- **Observed behaviour:**
  > **Finding:** The report is **accurate**. The `loadJudokaData` function calls an error handler that is supposed to show a modal, but it then returns an empty array, which prevents the error from propagating and being handled correctly.

---

## Improvement Opportunities

- **Fix Data Loading Error Handling:**
  1.  In `src/helpers/classicBattle/cardSelection.js`, modify the `loadJudokaData` function to re-throw the error after calling the `onError` handler. This will ensure that the error propagates up to the caller.
  2.  In `src/helpers/classicBattle/cardSelection.js`, modify the `drawCards` function to handle the error from `loadJudokaData`. If the data is empty or the loading fails, it should not proceed with drawing cards and should ensure the error is visible to the user.

- **Implement a Robust Startup Sequence:**
  - The `init` function in `src/pages/battleClassic.init.js` should be made more robust. It should have a clear success/failure path. If any of the critical initialization steps fail (like loading data), the game should not attempt to start. Instead, it should display a clear error message to the user with an option to retry.

- **Implement End-of-Match Modal:**
  - At the end of a match, a modal should display the winner, final scores, and options to replay or quit. This is currently not implemented.

- **Edge Case Handling:**
  - Add explicit error-handling hooks for timer drift, simultaneous inputs, and AI failure. During an unexpected error, roll back to the previous round and show an error message instead of leaving the game in an unresponsive state.

- **Accessibility Improvements:**
  - Ensure that stat buttons include `aria-describedby` attributes linking to hidden descriptions for screen-reader users. Provide tooltips or labels explaining each stat so that children (age 8–12) understand what they represent. Add audio cues (optional) for scoring events and round outcomes to enhance feedback.

- **Performance Instrumentation:**
  - Incorporate performance hooks to measure time to first render. The JavaScript bundle should be analyzed and optimized for size and lazy-loading opportunities.

- **Testing Hooks:**
  - Expose deterministic seeds via query parameters or a debug panel to allow automated QA to reproduce card draws. Provide a headless fast-forward mode that eliminates cooldown delays and timer wait times for test automation.
