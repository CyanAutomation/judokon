# QA Report: JU-DO-KON! Classic Battle (`battleClassic.html`)

**Report Date:** September 20, 2025

## 1. Executive Summary

This report details 16 critical, high, and medium-severity issues discovered during a quality assurance review of the Classic Battle feature. The issues span functionality, user interface, accessibility, and state management. Key problems include a broken core gameplay loop (timers, scoring, and round progression are non-functional), missing UI elements (judoka cards), and numerous accessibility gaps.

The recommendations section outlines a clear path forward, prioritizing a full state machine implementation to resolve the majority of the functional bugs, followed by UI and accessibility enhancements.

## Phase 1 – Round Entry Controls (2025-09-20)

- **Action:** Re-disabled the `Next` button whenever `renderStatButtons` prepares a new round so that players cannot advance before making a stat selection. Implemented via `disableNextRoundButton()` in `src/pages/battleClassic.init.js`.
- **Outcome:** The round flow now keeps `Next` disabled until a selection resolves or the timer auto-selects; this closes QA item #10 (Next button always enabled).
- **Validation:**
  - `npx vitest run tests/classicBattle/init-complete.test.js`
  - `npx vitest run tests/classicBattle/timer.test.js`
  - `npx vitest run tests/classicBattle/page-scaffold.test.js`
  - `npx playwright test battle-classic/round-select.spec.js`
- `npx playwright test battle-classic/timer.spec.js`

## Phase 2 – Timer & Auto-Select Stabilization (2025-09-20)

- **Action:** Added a scheduler-independent fallback in `createCountdownTimer()` (`src/helpers/timerUtils.js`) that spins up a `setInterval` countdown when RAF-driven ticks never arrive, so the selection timer still updates and expires on time in lightweight builds.
- **Outcome:** The selection timer now decrements in the UI and the existing expiration handler fires, restoring automatic stat selection on timeout (QA items #3 and #5).
- **Notes:** Local Vitest + Playwright runs confirm per-second updates and timeout auto-selection across multiple round lengths.
- **Regression status:** Targeted suites remained green after the timer fallback change; awaiting manual QA confirmation before proceeding.
- **Validation:**
  - `npx vitest run tests/classicBattle/init-complete.test.js`
  - `npx vitest run tests/classicBattle/timer.test.js`
  - `npx vitest run tests/classicBattle/autoSelectHandlers.test.js`
  - `npx playwright test battle-classic/timer.spec.js`
  - `npx playwright test battle-classic/stat-selection.spec.js`

Pending your review before starting Phase 3.

## 2. Issues Found

The following table details the identified issues, ranked by severity.

| #   | Severity     | Issue                                                                                                                                                                        | Steps to Reproduce                                                                                                                                                                   |
| --- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Critical** | **Inconsistent match-length modal** – After quitting or replaying, the match-length selection dialog sometimes does not appear, blocking the user from starting a new match. | Navigate to `battleClassic.html`; observe modal. Select a length and then quit. Return to `battleClassic.html` via the navbar; the modal is missing and the match cannot be started. |
| 2   | **Critical** | **Cards never displayed** – The player and opponent judoka cards are never shown. Only stat buttons appear, making the core visual element of the game absent.               | Start a match and observe the battle area throughout multiple rounds: cards are never rendered.                                                                                      |
| 3   | **Critical** | **Selection timer doesn’t work** – The "Time Left: 30s" display is static and never counts down. This prevents the auto-selection on timeout, breaking a core game mechanic. | Start a match. Observe that "Time Left" stays at 30s. Choose a stat; the text becomes "3s" and remains static.                                                                       |
| 4   | **Critical** | **Scoreboard fails to update** – After the first round, the score no longer updates, and round results are not displayed, leaving the player without feedback.               | Win one round (select any stat). Note the score is 1-0. Select another stat and click **Next**; the score remains 1-0 and no result message appears.                                 |
| 5   | **High**     | **Auto-select never triggers** – Because the timer is broken, the `autoSelect` feature never triggers a stat choice on timeout. The round stalls until manual intervention.  | Let the 30-second timer expire without clicking any stat. No stat is auto-selected; the round does not progress.                                                                     |
| 6   | **High**     | **Round numbering increments by two** – Pressing "Next" advances the round counter by two (e.g., Round 2 → Round 4), confusing the player.                                   | During a match, click **Next** repeatedly; notice the round number jumps by two instead of one.                                                                                      |
| 7   | **High**     | **Replay does not reset state** – The "Replay" button fails to reset scores. The end-of-match "Replay" button incorrectly navigates to `index.html`.                         | During a match, click **Replay**; the round resets to 1 but scores persist. Quit the match and click **Replay** in the final modal; you are redirected to the home menu.             |
| 8   | **Medium**   | **Contradictory end-condition messaging** – Quitting early shows a "Match Over – It’s a draw! (1-0)" modal while the scoreboard says "You quit the match. You lose!".        | Start a match, win a round, then quit. Note the conflicting messages in the modal and scoreboard.                                                                                    |
| 9   | **Medium**   | **Broken navigation link** – The main navigation bar’s "Classic Battle" link points to `battleJudoka.html`, which returns a 404 error.                                       | From any page, click "Classic Battle" in the bottom navigation bar.                                                                                                                  |
| 10  | **Medium**   | **"Next" button is always enabled** – The "Next" button is clickable before a stat is selected, allowing players to skip rounds without playing.                             | At the start of a round, observe that "Next" is enabled. Clicking it increments the round without a stat selection.                                                                  |
| 11  | **Medium**   | **Modal doesn’t trap focus** – When a confirmation modal is open, focus can move to background elements, which remain interactive. This is an accessibility failure.         | Open the "Quit" confirmation. Press `Tab` to cycle focus; focus moves to elements behind the modal.                                                                                  |
| 12  | **Low**      | **Missing ARIA roles and descriptions** – Key elements like the scoreboard and stat buttons lack ARIA attributes, making the game inaccessible to screen reader users.       | Inspect elements: no `aria-live` on the scoreboard, no `aria-describedby` on stat buttons.                                                                                           |
| 13  | **Low**      | **Keyboard shortcuts are advertised but not working** – The UI suggests using number or arrow keys to select match length, but these have no effect.                         | On the match-length modal, press keys 1–3 or arrow keys; nothing happens.                                                                                                            |
| 14  | **Low**      | **Opponent AI and difficulty not visible** – There is no indication of the opponent's stat choice or a way to set difficulty, making the game feel incomplete.               | Play multiple rounds; there is no "Opponent is choosing…" message or difficulty selector.                                                                                            |
| 15  | **Low**      | **State-progress and debug features absent** – The debug panel, seed control, and battle state progress list are not present, hindering testing and development.             | There is no toggle to enable test mode or view debug output.                                                                                                                         |
| 16  | **Low**      | **Tooltip formatting incorrect** – Tooltips on match-length buttons contain a literal `\n` instead of a line break, appearing unprofessional.                                | Hover over the "Quick" button; the tooltip shows `Quick\nFirst to 5 points wins.` instead of a new line.                                                                             |

## 3. Recommendations for Fixes

The following improvements are recommended to address the issues above. They are ordered by priority, starting with foundational changes.

### 1. Implement a Central State Machine

A robust state machine is critical. It will resolve the majority of the functional bugs by design.

- **Action:** Ensure the UI correctly binds to the battle engine’s state transitions: `init` → `selection` → `opponentChoose` → `resolution` → `cooldown` → `nextRound` → `end`.
- **Fixes:** #1, #4, #5, #6, #7, #10

### 2. Correct Core Gameplay Loop

- **Action (Timers):** Use `setInterval` or `requestAnimationFrame` to create a reliable, pausable timer for the 30-second selection window.
- **Fixes:** #3, #5
- **Action (State Reset):** Ensure the `replay` action fully resets the game state, including round number, scores, and card decks.
- **Fixes:** #7
- **Action (Round Increments):** The round counter should only increment once per completed round. The "Next" button should be disabled during the selection phase.
- **Fixes:** #6, #10

### 3. Render UI Components Correctly

- **Action (Judoka Cards):** Implement and render the card components to show judoka portraits and stats. The opponent’s card should be revealed after the player’s selection.
- **Fixes:** #2
- **Action (Tooltips):** Replace the literal `\n` with `<br>` or by rendering separate block elements so that tooltips format correctly.
- **Fixes:** #16
- **Action (End-of-Match Messages):** Display clear and consistent outcomes (Win/Loss/Draw) in both the scoreboard and the end-of-match modal.
- **Fixes:** #8

### 4. Improve Accessibility (A11y)

- **Action (ARIA):** Implement `aria-live="polite"` on the scoreboard and `aria-describedby` on stat buttons to provide screen reader support. Add `alt` text for card images.
- **Fixes:** #12
- **Action (Focus Management):** Trap focus within modals to prevent interaction with background elements.
- **Fixes:** #11
- **Action (Keyboard Navigation):** Implement the advertised keyboard shortcuts (number and arrow keys) for match length selection.
- **Fixes:** #13
- **Action (Contrast and Layout):** Ensure the color contrast meets WCAG 2.1 AA standards (≥4.5:1) and that the layout is responsive, especially at 200% zoom.
- **Fixes:** (Not explicitly in a bug, but a best practice)

### 5. Repair Navigation and Add Features

- **Action (Navigation):** Correct the bottom navigation link to point to `battleClassic.html`. Add a header link to return to the main menu.
- **Fixes:** #9
- **Action (AI Difficulty):** Add a UI control to select AI difficulty (Easy/Medium/Hard) and adjust the opponent's logic accordingly.
- **Fixes:** #14
- **Action (Debug Mode):** Implement the debug panel and state-progress list behind a feature flag to aid development and testing.
- **Fixes:** #15
