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

## Task Progress

- **Escape key handling** — Confirmed the implementation in `src/pages/battleCLI/events.js:59-176` and its coverage in `tests/pages/battleCLI.onKeyDown.test.js:85-136`. Recommended check before release: `npx vitest run tests/pages/battleCLI.onKeyDown.test.js`.
- **Points-to-win persistence** — Validated `restorePointsToWin` in `src/pages/battleCLI/init.js:1613-1686` alongside `tests/pages/battleCLI.pointsToWin.test.js:16-120`. Recommended check before release: `npx vitest run tests/pages/battleCLI.pointsToWin.test.js`.
