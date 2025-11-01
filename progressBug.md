# Scoreboard Component Centralization

## Progress Update – 2025-02-14

- Replaced the CLI header markup and test template with the shared scoreboard nodes so the component can mount directly (`battleCLI.html`, `battleCLI/cliDomTemplate.js`).
- Updated CLI helpers (`dom.js`, `winTargetSync.js`, `battleCLI.init.js`) to drive the shared scoreboard APIs and keep CLI datasets/targets in sync; removed legacy node handling.
- Refreshed CLI-specific stylesheet rules to style the shared nodes and dropped the `.standard-scoreboard-nodes` wrapper.
- Tests: `npm run test:battles:cli` ✅
- Playwright: `npx playwright test playwright/cli-layout.spec.js` ⚠️ (local static server cannot bind to 127.0.0.1 due to EPERM even with escalated permissions; test not executed).

## Assessment and Evaluation

The goal is to centralize the scoreboard component for use in both `battleClassic.html` and `battleCLI.html`.

- **`prdBattleScoreboard.md`**: The PRD clearly outlines the need for a reusable scoreboard component, and even points to `src/components/Scoreboard.js` as the source for it.

- **`src/components/Scoreboard.js`**: This file contains the `createScoreboard` function, which dynamically creates the necessary HTML elements for the scoreboard. It also has a `Scoreboard` class and an `initScoreboard` function that wires up the logic. This is the reusable component we want to use.

- **`src/pages/battleClassic.html`**: This file already includes the necessary HTML structure for the scoreboard with the correct IDs (`round-message`, `next-round-timer`, `round-counter`, `score-display`). The initialization logic is handled in `battleClassic.init.js`, which correctly calls `setupScoreboard`. This is the desired implementation.

- **`src/pages/battleCLI.html`**: This file uses a custom, separate implementation for the scoreboard (`cli-round` and `cli-score`). It also contains the standard scoreboard nodes, but they are hidden. The initialization logic in `battleCLI.init.js` does not use the shared `setupScoreboard` function.

## Opportunity for Centralization

The clear opportunity is to refactor the CLI battle mode to use the shared scoreboard component, which will bring it in line with the classic battle mode and the project's intended architecture.

## Proposed Fix Plan

1. **Modify `src/pages/battleCLI.html`**:
   - Remove the custom scoreboard elements (`cli-round` and `cli-score`).
   - Make the `standard-scoreboard-nodes` div visible by removing `style="display: none"` and `aria-hidden="true"`.

2. **Modify `src/pages/battleCLI.init.js`**:
   - Remove the `setCountdown` function as its functionality will be handled by the scoreboard component.
   - Update the `init` function to remove the call to `setCountdown` from the `window.__battleCLIinit` object.

3. **Modify `src/helpers/battleCLI.js` (imported as `init.js` in `battleCLI.init.js`)**:
   - Import `setupScoreboard` from `../helpers/setupScoreboard.js`.
   - Call `setupScoreboard()` in the `init` function.
   - Replace the direct DOM manipulations of `cli-round` and `cli-score` with calls to the scoreboard helper functions (`updateRoundCounter`, `updateScore`, `updateTimer`).

## Scoreboard Implementation Comparison

A key difference between the two battle pages is the implementation of the scoreboard.

### `battleClassic.html` (Standard Implementation)

- **Design and Layout:** The scoreboard is visually integrated into the main graphical UI. It's part of the header and uses standard HTML `<p>` elements with IDs like `round-counter` and `score-display`. The styling is consistent with the overall card-game theme.
- **Functionality:** It uses the centralized and reusable scoreboard component from `src/components/Scoreboard.js`. The logic for updating the round, score, and timers is handled by the `Scoreboard` class, making it a standardized and maintainable component.

### `battleCLI.html` (Custom Implementation)

- **Design and Layout:** The scoreboard is designed to mimic a command-line interface. It uses custom `<div>` elements (`#cli-round`, `#cli-score`) within a `.cli-status` container, which is styled to look like a terminal's status line. This gives it a distinct, text-heavy, and compact visual structure that fits the CLI theme.
- **Functionality:** This version uses a completely separate, one-off implementation. The scoreboard is updated through direct DOM manipulation within the `battleCLI.js` helper. While it achieves the desired visual style, it does not use the shared `setupScoreboard` component, leading to duplicated logic. Interestingly, the standard scoreboard nodes exist in the HTML but are hidden, pointing to an initial intent to possibly use the shared component.

## Feasibility Assessment (September 27, 2025)

Based on a review of `src/pages/battleCLI.html` and its associated CSS (`src/pages/battleCLI.css`), it is feasible to replace the custom scoreboard with the reusable component from `src/components/Scoreboard.js` while preserving the unique CLI styling.

The key challenge is that the current CLI scoreboard has specific styling and layout controlled by the `.cli-status` class and the `#cli-round` and `#cli-score` IDs. The standard scoreboard nodes are present but hidden.

A simple "unhiding" of the standard nodes is insufficient as they will not inherit the correct CLI styling.

### Path to Implementation without Sacrificing Style

The most effective way to achieve this is to merge the two implementations:

1. **HTML (`src/pages/battleCLI.html`):**
   - The hidden `div.standard-scoreboard-nodes` should be made visible by removing `style="display: none"` and `aria-hidden="true"`.
   - The existing `.cli-status` div, which contains the custom scoreboard, should be repurposed to wrap the now-visible standard scoreboard elements.
   - The IDs `#cli-round` and `#cli-score` must be moved from the custom `div` elements to the corresponding standard elements (`p#round-counter` and `p#score-display`).
   - The original custom `div` elements for the scoreboard can then be safely removed.

2. **CSS (`src/pages/battleCLI.css`):**
   - The CSS rules currently targeting `#cli-round` and `#cli-score` will now correctly apply to the standard scoreboard elements, preserving the intended CLI look and feel, including the absolute positioning of the round counter.
   - The styles for `.standard-scoreboard-nodes` should be reviewed and potentially removed if they are no longer needed, as the container `div` will now be `.cli-status`.

### Opportunities for Improvement

- **Reduced Complexity:** This change will remove redundant HTML and JavaScript, simplifying the `battleCLI` implementation.
- **Consistency:** The CLI page will now use the same underlying scoreboard logic as the classic battle page, making future updates easier and reducing the chance of bugs.
- **Adherence to Architecture:** This refactoring aligns the `battleCLI` page with the intended component-based architecture of the application.

By following this plan, we can successfully integrate the reusable scoreboard component into the CLI page without any loss of the existing styling or structure.
