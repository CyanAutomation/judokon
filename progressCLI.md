# QA Report for `src/pages/battleCLI.html` - Revised

This report has been revised based on a detailed code review. Each issue has been investigated, and the findings and fix plans have been updated.

---

## 1. Win target setting does not persist or apply properly

- **Steps to reproduce:**
  1. On the Round 0 settings panel, change the “Win target” dropdown to 3 or 10.
  2. Start the match by selecting a stat or pressing Enter.
  3. Observe that the header still shows “Round 0 Target: 10” and the scoreboard resets to default “to 5” target; the setting reverts to 5 on reload.

- **Finding:**

  > The report is **inaccurate**. `restorePointsToWin` (`src/pages/battleCLI/init.js:1613`) reads the persisted target, syncs the selector, forwards the value to the engine, and refreshes the header via `updateRoundHeader` (`src/pages/battleCLI/dom.js:69`). The Vitest suite in `tests/pages/battleCLI.pointsToWin.test.js:16-120` exercises both persistence and the header copy, so selecting 3 or 10 survives reloads and keeps the scoreboard aligned with the engine.

- **Severity:** None

---

## 2. Verbose/observability mode missing

- **Steps to reproduce:**
  1. Enable the “Verbose” checkbox in the settings panel or load the page with `?cliVerbose=1`.
  2. Play several rounds.
  3. No log pane appears; there is no display of timestamps or state transitions.

- **Finding:**

  > The report is **inaccurate**. `setupFlags` (`src/pages/battleCLI/init.js:2426-2524`) toggles both the checkbox and `#cli-verbose-section`, and `logStateChange` (`src/pages/battleCLI/init.js:2332-2359`) appends a timestamped transcript to `#cli-verbose-log`. Activating `cliVerbose` via the checkbox or `?cliVerbose=1` reveals the log pane at the bottom of the CLI; the transcript can blend into the layout without an additional cue, but the feature itself works as shipped.

- **Severity:** None

---

## 3. ESC does not close the help overlay

- **Steps to reproduce:**
  1. During a round, press `H` to open the help overlay.
  2. Press `Esc`.
  3. Instead of closing, a hint “Invalid key, press H for help” appears and the overlay remains open.

- **Finding:**

  > The report is **inaccurate**. The shortcuts overlay is registered with the shared modal stack, so `Escape` closes it, and `shouldProcessKey` short-circuits both `Escape` and `Esc` (`src/pages/battleCLI/events.js:59-76`). `onKeyDown` now clears any lingering countdown error text without emitting “Invalid key” (`src/pages/battleCLI/events.js:136-176`). Regression coverage in `tests/pages/battleCLI.onKeyDown.test.js:85-136` confirms the dialog closes cleanly with no stray hint.

- **Severity:** None

---

## 4. Help overlay does not pause timer

- **Steps to reproduce:**
  - Press `H` during a round to view the help panel. The round timer continues counting down in the background.

- **Finding:**

  > The report is **inaccurate**. Opening the overlay calls `showCliShortcuts`, which pauses active timers before registering the modal (`src/pages/battleCLI/init.js:700-712`), and `hideCliShortcuts` resumes them when the overlay closes (`src/pages/battleCLI/init.js:726-749`). Rounds stay frozen while the help panel is visible.

- **Severity:** None

---

## 5. No warning colour change as timer approaches expiry

- **Steps to reproduce:**
  - The PRD lists a warning colour (#ffcc00) for the timer when nearly expired. In testing, the timer remained a consistent colour and did not change to warn the player.

- **Finding:**

  > The report is **inaccurate**. `applyCountdownText` inside `startSelectionCountdown` sets the countdown colour to `#ffcc00` when fewer than five seconds remain and clears it otherwise (`src/pages/battleCLI/init.js:1206-1214`). The warning behaviour already ships.

- **Severity:** None

---

## 6. Settings interaction automatically starts match

- **Steps to reproduce:**
  - Interacting with the settings dropdown or seed input instantly starts the round. There is no separate “start match” action, making it easy to start accidentally while adjusting settings.

- **Finding:**

  > The report is **inaccurate**. Changing the selector opens a confirmation modal and only calls `resetMatch` after the player accepts (`src/pages/battleCLI/init.js:1630-1681`), while `initSeed` only persists deterministic seeds (`src/pages/battleCLI/init.js:609-653`). Nothing dispatches `startClicked` until the user explicitly starts the match, so adjusting settings no longer auto-launches a round.

- **Severity:** None

---

## 7. Accessibility for screen‑readers unverified

- **Finding:**

  > The report is **partially accurate**. Canonical live regions (`#round-message`, `#cli-countdown`, scoreboard) already expose `role="status"` and `aria-live` in `src/pages/battleCLI.html:68-118`, so baseline announcements work. We have not run a recent VoiceOver/NVDA pass against the CLI, so a focused audit remains prudent.

- **Severity:** Low

---

## Improvement Opportunities

- **Maintain regression coverage for points-to-win:** The Vitest suite (`tests/pages/battleCLI.pointsToWin.test.js`) already guards the persistence/header flow; consider adding a lightweight Playwright scenario to cover a full reload so DOM regressions cannot slip past unit coverage.
- **Polish Escape key UX:** ✅ Done — `shouldProcessKey` now bypasses `Escape`/`Esc`, and `onKeyDown` clears countdown errors (`src/pages/battleCLI/events.js:59-176`), with regression coverage in `tests/pages/battleCLI.onKeyDown.test.js:85-136`.
- **Improve verbose-mode discoverability:** The runtime markup (`src/pages/battleCLI.html`) lacks the `#verbose-indicator` element even though `setupFlags` toggles it. Wire the indicator into the header or surface a snackbar when verbose mode activates so players notice the transcript.
- **Protect countdown warning styling:** Add a focused unit/integration test that drives `startSelectionCountdown` below five seconds and asserts the colour flip (`src/pages/battleCLI/init.js:1206-1214`) to prevent regressions.
- **Full accessibility audit:** Run a screen-reader pass (NVDA/VoiceOver) that covers round announcements, countdown changes, and shortcut toggles, documenting any gaps and remediation steps.

---

## Layout and Styling Opportunities

Based on a Playwright audit of the CLI page layout and CSS analysis, the following opportunities for improvement have been identified:

- **Enhanced Responsive Design:**
  - Add intermediate breakpoints (e.g., 1024px, 768px) to optimize the layout for tablets and large mobile devices. The current design switches abruptly at 720px and 420px.
  - Improve the stat selection grid on mobile: consider a single-column layout with larger touch targets for better usability on small screens.

- **Header Layout Stability:**
  - The absolutely positioned `#cli-round` element can cause layout shifts on narrow screens when it falls back to static positioning. Implement a more robust centering solution using CSS Grid or Flexbox to prevent jumps.
  - Add visual separators or background variations to better distinguish the title, status, and controls sections in the header.

- **Settings Section Visual Hierarchy:**
  - Enhance the collapsible settings panel with better visual cues (e.g., icons, animations) to indicate its expandable state.
  - Improve form element alignment and spacing, particularly for the seed input and error messages, to create a more polished terminal-like interface.

- **Stat Selection Grid Optimization:**
  - Refine the CSS Grid layout for stat buttons to ensure consistent sizing and alignment across different viewport widths. Consider using `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))` for better balance.
  - Add subtle hover and selection animations to improve user feedback without compromising the terminal aesthetic.

- **Verbose Log Section Improvements:**
  - Enhance the scrollable verbose log with better visual separation (e.g., timestamps, borders) and ensure it maintains readability at different font sizes.
  - Add a toggle or indicator to show when new log entries are available, improving discoverability.

- **Footer and Controls Enhancement:**
  - Improve the footer layout to better integrate the controls hint and snackbar container, ensuring they don't overlap on smaller screens.
  - Add keyboard shortcut highlighting or tooltips to make the controls more discoverable for new users.

- **Color Scheme and Theming:**
  - Expand the retro theme options with additional color variations (e.g., amber, blue terminals) while maintaining accessibility standards.
  - Implement a theme toggle that persists user preferences and applies smoothly without layout shifts.

- **Typography and Spacing Consistency:**
  - Standardize spacing using a consistent scale (e.g., multiples of 8px) throughout the interface for better visual rhythm.
  - Optimize font sizes and line heights for different screen densities, ensuring readability on high-DPI displays.

- **Accessibility Layout Enhancements:**
  - Ensure all interactive elements maintain proper focus indicators and keyboard navigation paths in the CLI layout.
  - Add `aria-live` regions for dynamic content updates and verify screen reader compatibility for the terminal-style interface.

- **Performance and Rendering:**
  - Minimize layout recalculations by using fixed dimensions where appropriate and avoiding content-based sizing for critical elements.
  - Optimize CSS for fast rendering by reducing complex selectors and leveraging efficient layout methods.

- **Interactive Feedback:**
  - Add subtle animations for state changes (e.g., selection, countdown warnings) to enhance user engagement while respecting `prefers-reduced-motion`.
  - Implement loading states and progress indicators for better perceived performance during data loading or processing.

- **Escape key handling** — Confirmed the implementation in `src/pages/battleCLI/events.js:59-176` and its coverage in `tests/pages/battleCLI.onKeyDown.test.js:85-136`. Recommended check before release: `npx vitest run tests/pages/battleCLI.onKeyDown.test.js`.
- **Points-to-win persistence** — Validated `restorePointsToWin` in `src/pages/battleCLI/init.js:1613-1686` alongside `tests/pages/battleCLI.pointsToWin.test.js:16-120`. Recommended check before release: `npx vitest run tests/pages/battleCLI.pointsToWin.test.js`.
- **Match start recovery** — Hooked the existing data-load retry signal into the Classic Battle bootstrap and guarded subsequent round-cycle restarts so load failures surface the modal without fatal overlays (`src/pages/battleClassic.init.js:1683-1963`, `tests/helpers/classicBattle/cardSelection.test.js:166-235`). Tests: `npx vitest run tests/helpers/classicBattle/cardSelection.test.js`, `npx vitest run tests/integration/battleClassic.integration.test.js`, `npx playwright test playwright/battle-classic/bootstrap.spec.js`.
