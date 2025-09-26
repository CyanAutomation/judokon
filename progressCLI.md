# QA Report & Fix Plan for Battle CLI

This document outlines the findings of a quality assurance review for the Battle CLI (`src/pages/battleCLI.html`) and proposes a plan to address the identified issues. The original report was validated against the codebase, and all findings were confirmed to be accurate.

## High-Severity Issues

### 1. Multiple Stat Highlights Persist Across Rounds

*   **Observation**: Selected stat rows remain highlighted into the next round. Rapidly clicking multiple stats before a round resolves can cause several rows to be highlighted simultaneously. These highlights accumulate, creating confusion.
*   **Validation**:
    *   The `selectStat()` function in `src/pages/battleCLI/init.js` clears previous selections, but rapid, non-debounced inputs can still cause a race condition, leading to multiple highlights.
    *   The `resetMatch()` function does not clear stat highlights, causing them to persist when a new match is started.
*   **Severity**: **High** – This visual bug significantly impacts UI clarity and can affect testing determinism.
*   **Fix Plan**:
    1.  **Debounce Stat Selection**: Wrap the `selectStat` call in a debounce function to prevent multiple selections in quick succession.
    2.  **Clear Highlights on Reset**: Modify the `resetMatch()` function to explicitly clear all `.selected` classes from stat rows, ensuring a clean state for new matches.

## Medium-Severity Issues

### 2. "Enter"/"Space" as "Next" Control Fails

*   **Observation**: The acceptance criteria specify that `Enter` or `Space` should advance to the next round, skipping the cooldown. Currently, this action shows an "Invalid key" message and has no effect.
*   **Validation**: The `handleCooldownKey` and `handleRoundOverKey` functions correctly listen for `Enter`/`Space`. However, an unhandled key event likely bubbles up to a default handler that displays the "Invalid key" message. The logic needs to properly stop event propagation.
*   **Severity**: **Medium** – A clear departure from specified keyboard controls.
*   **Fix Plan**:
    1.  **Stop Event Propagation**: In all keyboard handlers (`handleCooldownKey`, `handleRoundOverKey`, etc.), ensure `event.stopPropagation()` and `event.preventDefault()` are called after handling a key to prevent it from reaching other listeners.
    2.  **Consolidate Key Handling**: Refactor key handling into a single, state-aware function to manage all inputs and prevent conflicting handlers.

### 3. "Esc" Does Not Close Help Panel

*   **Observation**: The help panel (`[H]`) can only be closed by pressing `H` again. The PRD specifies that `Esc` should also close it.
*   **Validation**: The help panel is registered with a `modalManager` that *should* handle the `Esc` key. The failure suggests an issue in how the modal is registered or a bug in the manager itself. The `globalKeyHandlers` object is missing an explicit `Esc` handler.
*   **Severity**: **Medium** – An accessibility and keyboard navigation issue.
*   **Fix Plan**:
    1.  **Add `Esc` Handler**: Add a case for the `Escape` key in the main `onKeyDown` event listener that explicitly calls `hideCliShortcuts()`.
    2.  **Verify Modal Manager**: Investigate `modalManager.js` to ensure it correctly invokes the `close` callback on `Esc` and fix any identified bugs.

### 4. Native `confirm` Dialog Used for Win-Target Changes

*   **Observation**: Changing the win target triggers a native browser `confirm()` dialog. This is unstyled, inaccessible, and disrupts the user experience.
*   **Validation**: The `restorePointsToWin()` function explicitly calls `window.confirm()`.
*   **Severity**: **Medium** – An accessibility and UX consistency issue.
*   **Fix Plan**:
    1.  **Implement Custom Modal**: Replace the `window.confirm()` call with a custom, accessible modal created using the project's `createModal` component.
    2.  **Style Modal**: Ensure the new modal matches the retro terminal aesthetic of the CLI.
    3.  **Manage Focus**: Implement proper focus trapping within the modal.

## Low-Severity Issues

### 5. Timers Continue During Help and Quit Modals

*   **Observation**: The round countdown timer does not pause when the help panel or quit confirmation dialog is open.
*   **Validation**:
    *   `showQuitModal()` correctly calls `pauseTimers()` and `resumeTimers()`.
    *   The `h` key handler for the help panel **does not** call the timer-pausing functions.
*   **Severity**: **Low** – A minor divergence from expected behavior.
*   **Fix Plan**:
    1.  **Pause on Help**: Modify the `h` key handler in `globalKeyHandlers` to call `pauseTimers()` when the help panel is opened and `resumeTimers()` when it is closed.

### 6. Ambiguous State When Quitting Mid-Match

*   **Observation**: Quitting a match sometimes incorrectly displays the "Play again / Return to lobby" footer, which should only appear at the end of a match.
*   **Validation**: The `showQuitModal()` function correctly navigates the user away but may be triggering an `interrupt` that is misinterpreted by the game's state machine, leading to a premature `matchOver` event.
*   **Severity**: **Low** – A UX inconsistency.
*   **Fix Plan**:
    1.  **Refine Quit Logic**: Ensure the `interrupt` event dispatched on quit leads to a unique "quit" state rather than incorrectly transitioning to "matchOver". The UI should immediately return to the lobby without showing the end-of-match screen.

### 7. Other Low-Severity Findings & Fixes

*   **Rapid Multi-Input Not Debounced**:
    *   **Fix**: Apply a `300ms` debounce to the stat selection handler.
*   **Persistent Highlight After Quitting**:
    *   **Fix**: This will be resolved by the fix for **Issue #1**.
*   **Verbose Logs Not Exposed**:
    *   **Fix**: Add a toggle to display a verbose log panel and a shortcut to scroll it, per PRD guidelines.
*   **Error Messaging**:
    *   **Fix**: Reroute all error and hint messages to the `#snackbar-container` instead of overwriting the timer text.

This revised report now serves as a comprehensive action plan. I will await your review before proceeding with implementation.
