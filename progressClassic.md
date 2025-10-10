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

Based on a review of the codebase and the Playwright audit, the following opportunities have been identified to improve the layout, styling, and accessibility of the Classic Battle page. The suggestions are broken down into three phases, from foundational fixes to visual polish.

### Phase 1: Foundational Improvements

This phase focuses on addressing key layout and accessibility issues to build a solid foundation.

1. **Card Slot Sizing:**
    - **Issue:** On large screens, card slots can become excessively wide, and on screens just above the mobile breakpoint, they can become too narrow. The current CSS uses `minmax(0, 1fr)`, allowing card slots to shrink to zero width.
    - **Suggestion:** In `src/styles/battleClassic.css`, modify the `#battle-area` grid definition to `grid-template-columns: repeat(3, minmax(250px, 1fr));`. This will establish a minimum width for the card slots, ensuring they maintain a reasonable and consistent size across a wider range of viewports.

2. **Stat Button Layout:**
    - **Issue:** The current `flex-wrap` layout for the stat buttons can result in inconsistent alignment and spacing as the container width changes.
    - **Suggestion:** In `src/styles/battleClassic.css`, convert the `#stat-buttons` container to use CSS Grid for a more robust and uniform layout. Applying `display: grid;` and `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));` will create a responsive grid that automatically adjusts the number of columns to fit the available space while maintaining consistent button sizing.

3. **Accessibility: `aria-live` Regions:**
    - **Status:** **Verified and Implemented.** The HTML (`src/pages/battleClassic.html`) already includes `aria-live="polite"` on the score and round counter elements (`#round-counter`, `#score-display`). This is a best practice and no further action is needed for this specific item.

### Phase 2: Responsive and Interactive Enhancements

This phase focuses on improving the user experience on different screen sizes and making the interface more interactive and intuitive.

1. **Tablet Breakpoint:**
    - **Issue:** The page layout abruptly transitions from a three-column grid to a single column at 480px, which is not optimal for tablet-sized devices.
    - **Suggestion:** Introduce an intermediate breakpoint in `src/styles/battleClassic.css` at `768px`. A new media query (`@media (max-width: 768px)`) can be used to adjust the grid layout to two columns or simply refine spacing to better utilize the screen real estate on tablets, providing a more tailored user experience.

2. **Button Interactivity:**
    - **Issue:** The stat selection buttons currently lack visual feedback on hover and focus, making the interface feel less responsive.
    - **Suggestion:** In `src/styles/battleClassic.css`, add `:hover` and `:focus-visible` states for the stat buttons. These states should include a subtle visual change, such as a change in background color or a border, combined with a smooth `transition` to provide clear, immediate feedback to user interactions.

3. **Battle Status Header:**
    - **Issue:** The `.battle-status-header` is positioned using margins, which can be brittle and lead to inconsistent alignment across different devices and screen sizes.
    - **Suggestion:** Refactor the header component to use Flexbox for alignment. By integrating the status header into a flex container, its position and alignment can be managed more robustly and predictably, ensuring it adapts correctly to responsive changes.

### Phase 3: Visual Polish and Theming

This phase focuses on aesthetic improvements and future-proofing the design system.

1. **Mystery Card Placeholder:**
    - **Issue:** The current placeholder for the opponent's card is a basic SVG icon, which feels static and unengaging.
    - **Suggestion:** Enhance the mystery card placeholder with a more visually appealing design. This could include a custom card-back graphic, a subtle pulsing animation, or a shimmer effect to create a sense of anticipation and improve the overall aesthetic.

2. **Visual Hierarchy and Game State:**
    - **Issue:** The current UI relies solely on text to convey the game state (round and score), which may not be immediately clear at a glance.
    - **Suggestion:** Introduce more explicit visual progress indicators. This could take the form of score bars that fill up as players score points, or a series of dots representing the rounds in the match, which fill in as the game progresses. These additions would provide a clearer, more intuitive understanding of the game state.

3. **Theming and Customization:**
    - **Status:** **Verified and Implemented.** The CSS codebase already makes excellent use of CSS variables (design tokens) for colors, spacing, and other properties, which is a best practice for theming.
    - **Future Suggestion:** To further leverage this, consider implementing user-configurable layout options, such as "compact" and "spacious" modes. This would allow users to tailor the interface to their preferences and could be controlled via a new setting in the settings page.
