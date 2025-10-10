# QA Report for `src/pages/battleClassic.html` - Revised

This report has been revised based on a detailed code review. The root cause of the critical issues has been identified, and the fix plan has been updated accordingly.

---

## 1. Match never starts

- **Steps to reproduce:**
  1. Load `battleClassic.html` in a Chrome browser.
  2. The page displays the scoreboard header ("Round 0 – You: 0 Opponent: 0") and two buttons (“Replay”, “Quit”).
  3. There is no modal asking for the 3/5/10 point target.
  4. Clicking **Replay** or **Quit** or pressing **Enter** does nothing, and the match never begins.

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
  1. In `src/helpers/classicBattle/cardSelection.js`, modify the `loadJudokaData` function to re-throw the error after calling the `onError` handler. This will ensure that the error propagates up to the caller.
  2. In `src/helpers/classicBattle/cardSelection.js`, modify the `drawCards` function to handle the error from `loadJudokaData`. If the data is empty or the loading fails, it should not proceed with drawing cards and should ensure the error is visible to the user.

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

---

## Layout and Styling Opportunities

Based on a Playwright audit of the page layout and CSS analysis, the following opportunities for improvement have been identified:

- **Responsive Design Enhancements:**
  - Add an intermediate breakpoint (e.g., 768px) for tablet devices where the 3-column grid remains but with adjusted spacing and sizing. Currently, the layout switches abruptly to single-column at 480px.
  - Optimize button sizing and spacing for touch devices to ensure adequate touch targets without excessive whitespace.

- **Battle Status Header Integration:**
  - The `.battle-status-header` overlay uses margin-based positioning which may not align consistently across devices. Consider integrating it into the CSS Grid layout of the header or using Flexbox for better responsive behavior.
  - Add subtle animations or transitions for status updates to improve visual feedback.

- **Card Slot Visual Balance:**
  - The grid columns use `minmax(0, 1fr)` which allows slots to shrink to zero width. Implement minimum widths (e.g., `minmax(250px, 1fr)`) to maintain card proportions and prevent visual distortion on wide screens.
  - Enhance the mystery card placeholder with a more engaging design, such as a card back pattern or subtle animation, instead of the basic SVG question mark.

- **Stat Buttons Layout Consistency:**
  - Replace the `flex-wrap` layout with CSS Grid (`grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))`) for more uniform button alignment and better space utilization.
  - Add hover and focus states with smooth transitions to improve interactivity feedback.

- **Modal Layout Optimization:**
  - The round select modal's button grid works well but could benefit from vertical stacking on very small screens (< 400px) to prevent cramped layouts.
  - Ensure consistent spacing and sizing between modal buttons and the main battle controls.

- **Visual Hierarchy Improvements:**
  - Add progress indicators or visual cues (e.g., score bars, round progress dots) to the battle status area for better game state comprehension.
  - Implement subtle background patterns or gradients for the battle slots to enhance depth without distracting from the cards.

- **Accessibility Layout Enhancements:**
  - Ensure all interactive elements maintain proper focus indicators and keyboard navigation paths.
  - Add `aria-live` regions for dynamic score and round updates to improve screen reader experience.
  - Verify color contrast ratios for all text elements, especially in the battle status overlay.

- **Performance Layout Considerations:**
  - Minimize layout shifts by using consistent sizing units and avoiding content-based width calculations.
  - Optimize CSS for fast rendering by reducing complex selectors and leveraging CSS Grid/Flexbox efficiently.

- **Theming and Customization:**
  - Ensure all layout-related CSS uses design tokens (CSS variables) to support future theming options.
  - Consider user preference settings for layout density (compact/spacious) to accommodate different user needs.
