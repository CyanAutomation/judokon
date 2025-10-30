# QA & Improvement Plan for Classic Battle

## 1. Executive Summary

This document provides a verified and actionable fix plan for the issues identified in the QA report for `src/pages/battleClassic.html`. The original report's findings were validated against the codebase, and this revised plan includes specific file paths, code-level suggestions, and a clear priority order.

The most critical issues stem from race conditions and asynchronous event ordering, leading to incorrect state transitions and UI bugs. The plan prioritizes fixing these core logic flaws before addressing UI and accessibility improvements.

**Corrections to Original QA Report:**

- **Mystery Judoka:** The placeholder UI (`#mystery-card-placeholder`) and logic (`useObscuredStats`) **do exist**. The issue is a race condition that can reveal the opponent's card prematurely.
- **Stat Hotkeys:** The feature exists but is controlled by the `statHotkeys` feature flag. It is not consistently enabled, explaining why it seemed missing.

**Prioritized Fix Plan:**

1. **Critical:** Stabilize state management to prevent race conditions.
2. **High:** Fix opponent card visibility and ensure stat buttons are correctly disabled.
3. **Medium:** Implement unique deck draws and improve outcome messaging.
4. **Low:** Address accessibility, keyboard navigation, and timer drift.

---

## 2. Prioritized Fix Plan

### Phase 1: Critical - State Management & Race Conditions

This phase addresses the root cause of most inconsistencies: asynchronous event handling.

- **Issue:** Incorrect round progression and score inconsistencies due to race conditions between timers and user actions.
- **Relevant Files:**
  - `src/helpers/classicBattle/roundManager.js`
  - `src/helpers/classicBattle/selectionHandler.js`
  - `src/pages/battleClassic.init.js`
- **Acceptance Criteria:**
  - Round state transitions must be idempotent (e.g., multiple `roundResolved` events for the same round do not cause multiple score updates).
  - The UI must not allow new actions while a round result is being processed.
- **Actionable Fixes:**
  - [x] **Add Idempotent Guards:** In `src/helpers/classicBattle/roundManager.js` and `src/helpers/classicBattle/selectionHandler.js`, add guards to prevent re-entry into critical functions.
    - Verified existing guard implementations ensure re-entry attempts short-circuit and return cached results; no new code changes required.
    - Tests: `npx vitest run tests/helpers/selectionHandler.test.js tests/helpers/classicBattle/statSelection.failureFallback.test.js`, `npx playwright test playwright/battle-classic/stat-selection.spec.js`.

    ```javascript
    // Example in a function like applyRoundDecisionResult in roundManager.js
    let isResolving = false;
    async function applyRoundDecisionResult(store, result) {
      if (isResolving) return; // Guard against re-entry
      isResolving = true;
      try {
        // ... existing logic ...
      } finally {
        isResolving = false;
      }
    }
    ```

  - [x] **Synchronously Disable UI:** In `src/helpers/classicBattle/statButtons.js` or `selectionHandler.js`, disable buttons immediately on click, not after an async operation.
    - Updated `handleStatButtonClick` to always disable the clicked button and its siblings synchronously, even if the stat container lookup fails, by falling back to the button's parent element. (`src/pages/battleClassic.init.js:1427`)
    - Tests: `npx vitest run tests/helpers/classicBattle/statSelection.test.js tests/helpers/classicBattle/statDoubleClick.test.js tests/helpers/classicBattle/statButtons.state.test.js`, `npx playwright test playwright/battle-classic/stat-selection.spec.js`.

    ```javascript
    // In handleStatButtonClick within battleClassic.init.js
    function handleStatButtonClick(store, stat, btn) {
      if (!btn || btn.disabled) return; // Already handled
      const container =
        document.getElementById("stat-buttons") ?? (btn instanceof HTMLElement ? btn.parentElement : null);
      const buttons = container ? Array.from(container.querySelectorAll("button[data-stat]")) : [];
      const targets = buttons.length > 0 ? buttons : [btn];
      disableStatButtons(targets, container ?? undefined); // Disable synchronously

      // ... rest of the async logic ...
    }
    ```

### Phase 2: High - Core Gameplay Bugs

- **Issue:** Opponent card is revealed too early; stat buttons remain active after selection.
- **Relevant Files:**
  - `src/pages/battleClassic.html` (for `#mystery-card-placeholder`)
  - `src/pages/battleClassic.init.js`
  - `src/helpers/classicBattle/statButtons.js`
- **Acceptance Criteria:**
  - The opponent card placeholder must remain visible until the player has selected a stat.
  - All stat buttons must be disabled immediately after a player makes a choice.
- **Actionable Fixes:**
  - [x] **Ensure Placeholder Visibility:** In `src/pages/battleClassic.init.js`, ensure the logic that reveals the opponent's card is strictly tied to an event that fires _after_ the player's selection is confirmed. Add a CSS class like `.is-obscured` to the opponent card container and only remove it upon the `roundResolved` event.
    - Applied the `.is-obscured` state when rendering the mystery placeholder and deferred card reveal logic to the `roundResolved` handler so the placeholder persists until the result is available. (`src/helpers/classicBattle/opponentPlaceholder.js`, `src/helpers/classicBattle/cardSelection.js`, `src/pages/battleClassic.init.js`, `src/helpers/classicBattle/uiEventHandlers.js`, `src/styles/battleClassic.css`)
    - Tests: `npx vitest run tests/helpers/classicBattle/opponentPlaceholder.test.js tests/integration/battleClassic.integration.test.js tests/integration/battleClassic.placeholder.test.js`, `npx playwright test playwright/battle-classic/opponent-reveal.spec.js`.
  - [x] **Immediate Button Disabling:** (Covered in Phase 1) Ensure the `disableStatButtons` function is called at the very beginning of the `handleStatButtonClick` handler.

### Phase 3: Medium - Gameplay Polish

- **Issue:** Outcome messages are missing; cards can repeat during a match.
- **Relevant Files:**
  - `src/helpers/setupScoreboard.js`
  - `src/helpers/showsnackbar.js`
  - `src/helpers/classicBattle/roundManager.js`
  - `src/helpers/randomJudokaPage.js`
- **Acceptance Criteria:**
  - A "Win/Loss/Draw" message is shown after every round.
  - All judoka cards drawn within a single match are unique.
- **Actionable Fixes:**
  - [ ] **Queue Scoreboard Messages:** In `src/helpers/setupScoreboard.js`, modify it to queue messages if the scoreboard is not yet initialized, ensuring no messages are dropped.
  - [ ] **Implement Per-Match Deck:** In `src/helpers/classicBattle/roundManager.js`, create a shuffled, 25-card deck when a match starts. Draw from this deck for each round instead of using the global randomizer.

    ```javascript
    // In a new function in roundManager.js, called by handleReplay or at match start
    function createMatchDeck(allCards) {
      const shuffled = allCards.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 25);
    }
    // Store this deck in the battleStore and .pop() from it in startRound.
    ```

### Phase 4: Low - Accessibility & Timers

- **Issue:** Inconsistent keyboard navigation and hotkeys; timers don't pause when the tab is hidden.
- **Relevant Files:**
  - `src/helpers/classicBattle/statButtons.js`
  - `src/config/battleDefaults.js`
  - `src/helpers/classicBattle/timerUtils.js` (or equivalent timer logic file)
- **Acceptance Criteria:**
  - Stat hotkeys are only active when the `statHotkeys` feature flag is enabled in settings.
  - All timers pause when the page visibility state is "hidden".
- **Actionable Fixes:**
  - [ ] **Respect Hotkey Feature Flag:** In `src/helpers/classicBattle/statButtons.js`, modify `wireStatHotkeys` to check the feature flag before adding the event listener. Remove any logic that force-enables the flag.
  - [ ] **Implement Timer Pausing:** In the core timer logic (e.g., `src/helpers/classicBattle/timerService.js`), add event listeners for the Page Visibility API.

    ```javascript
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        activeSelectionTimer.pause();
      } else {
        activeSelectionTimer.resume();
      }
    });
    ```
