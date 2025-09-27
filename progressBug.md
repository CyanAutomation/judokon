# Scoreboard Component Centralization

## Assessment and Evaluation

The goal is to centralize the scoreboard component for use in both `battleClassic.html` and `battleCLI.html`.

* **`prdBattleScoreboard.md`**: The PRD clearly outlines the need for a reusable scoreboard component, and even points to `src/components/Scoreboard.js` as the source for it.

* **`src/components/Scoreboard.js`**: This file contains the `createScoreboard` function, which dynamically creates the necessary HTML elements for the scoreboard. It also has a `Scoreboard` class and an `initScoreboard` function that wires up the logic. This is the reusable component we want to use.

* **`src/pages/battleClassic.html`**: This file already includes the necessary HTML structure for the scoreboard with the correct IDs (`round-message`, `next-round-timer`, `round-counter`, `score-display`). The initialization logic is handled in `battleClassic.init.js`, which correctly calls `setupScoreboard`. This is the desired implementation.

* **`src/pages/battleCLI.html`**: This file uses a custom, separate implementation for the scoreboard (`cli-round` and `cli-score`). It also contains the standard scoreboard nodes, but they are hidden. The initialization logic in `battleCLI.init.js` does not use the shared `setupScoreboard` function.

## Opportunity for Centralization

The clear opportunity is to refactor the CLI battle mode to use the shared scoreboard component, which will bring it in line with the classic battle mode and the project's intended architecture.

## Proposed Fix Plan

1. **Modify `src/pages/battleCLI.html`**:
    * Remove the custom scoreboard elements (`cli-round` and `cli-score`).
    * Make the `standard-scoreboard-nodes` div visible by removing `style="display: none"` and `aria-hidden="true"`.

2. **Modify `src/pages/battleCLI.init.js`**:
    * Remove the `setCountdown` function as its functionality will be handled by the scoreboard component.
    * Update the `init` function to remove the call to `setCountdown` from the `window.__battleCLIinit` object.

3. **Modify `src/helpers/battleCLI.js` (imported as `init.js` in `battleCLI.init.js`)**:
    * Import `setupScoreboard` from `../helpers/setupScoreboard.js`.
    * Call `setupScoreboard()` in the `init` function.
    * Replace the direct DOM manipulations of `cli-round` and `cli-score` with calls to the scoreboard helper functions (`updateRoundCounter`, `updateScore`, `updateTimer`).

## Scoreboard Implementation Comparison

A key difference between the two battle pages is the implementation of the scoreboard.

### `battleClassic.html` (Standard Implementation)

*   **Design and Layout:** The scoreboard is visually integrated into the main graphical UI. It's part of the header and uses standard HTML `<p>` elements with IDs like `round-counter` and `score-display`. The styling is consistent with the overall card-game theme.
*   **Functionality:** It uses the centralized and reusable scoreboard component from `src/components/Scoreboard.js`. The logic for updating the round, score, and timers is handled by the `Scoreboard` class, making it a standardized and maintainable component.

### `battleCLI.html` (Custom Implementation)

*   **Design and Layout:** The scoreboard is designed to mimic a command-line interface. It uses custom `<div>` elements (`#cli-round`, `#cli-score`) within a `.cli-status` container, which is styled to look like a terminal's status line. This gives it a distinct, text-heavy, and compact visual structure that fits the CLI theme.
*   **Functionality:** This version uses a completely separate, one-off implementation. The scoreboard is updated through direct DOM manipulation within the `battleCLI.js` helper. While it achieves the desired visual style, it does not use the shared `setupScoreboard` component, leading to duplicated logic. Interestingly, the standard scoreboard nodes exist in the HTML but are hidden, pointing to an initial intent to possibly use the shared component.
