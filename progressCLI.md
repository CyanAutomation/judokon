# QA Report for `src/pages/battleCLI.html` - Revised

This report has been revised based on a detailed code review. Each issue has been investigated, and the findings and fix plans have been updated.

---

## 1. Win target setting does not persist or apply properly

- **Steps to reproduce:**
  1. On the Round 0 settings panel, change the “Win target” dropdown to 3 or 10.
  2. Start the match by selecting a stat or pressing Enter.
  3. Observe that the header still shows “Round 0 Target: 10” and the scoreboard resets to default “to 5” target; the setting reverts to 5 on reload.

- **Finding:**
    > The report is **inaccurate**. `restorePointsToWin` in `src/pages/battleCLI/init.js` pulls the saved target from `localStorage`, syncs the dropdown, and calls `updateRoundHeader` so the CLI header mirrors the engine-provided target. The HTML (`battleCLI.html`) no longer hardcodes a default value, and the CLI scoreboard remains visible and up to date.

- **Severity:** None

---

## 2. Verbose/observability mode missing

- **Steps to reproduce:**
  1. Enable the “Verbose” checkbox in the settings panel or load the page with `?cliVerbose=1`.
  2. Play several rounds.
  3. No log pane appears; there is no display of timestamps or state transitions.

- **Finding:**
    > The report is **inaccurate**. Enabling `cliVerbose` (either via checkbox or query param) toggles `#cli-verbose-section` through `setupFlags` and `logStateChange` appends timestamped entries to `#cli-verbose-log`, so the transcript renders at the bottom of the CLI. The output may simply be easy to overlook without an additional visual cue.

- **Severity:** Low

---

## 3. ESC does not close the help overlay

- **Steps to reproduce:**
  1. During a round, press `H` to open the help overlay.
  2. Press `Esc`.
  3. Instead of closing, a hint “Invalid key, press H for help” appears and the overlay remains open.

- **Finding:**
    > The report is **partially accurate**. The shortcuts overlay registers with the shared modal manager (`registerModal` in `src/helpers/modalManager.js`), so pressing Escape does close it. The confusion stems from `onKeyDown` in `src/pages/battleCLI/events.js` letting the key fall through to the countdown error path, which surfaces the “Invalid key” message even though the overlay dismisses.

- **Severity:** Low

---

## 4. Help overlay does not pause timer

- **Steps to reproduce:**
  - Press `H` during a round to view the help panel. The round timer continues counting down in the background.

- **Finding:**
    > The report is **inaccurate**. `showCliShortcuts` and `hideCliShortcuts` in `src/pages/battleCLI/init.js` call `pauseTimers`/`resumeTimers`, so opening the overlay halts both selection and cooldown timers until it closes. This behaviour matches the current implementation, so the prior observation is outdated.

- **Severity:** None

---

## 5. No warning colour change as timer approaches expiry

- **Steps to reproduce:**
  - The PRD lists a warning colour (#ffcc00) for the timer when nearly expired. In testing, the timer remained a consistent colour and did not change to warn the player.

- **Finding:**
    > The report is **inaccurate**. `applyCountdownText` inside `startSelectionCountdown` (`src/pages/battleCLI/init.js`) sets the countdown colour to `#ffcc00` whenever fewer than five seconds remain and clears the inline style otherwise. The warning state is already implemented.

- **Severity:** None

---

## 6. Settings interaction automatically starts match

- **Steps to reproduce:**
  - Interacting with the settings dropdown or seed input instantly starts the round. There is no separate “start match” action, making it easy to start accidentally while adjusting settings.

- **Finding:**
    > The report is **inaccurate**. `restorePointsToWin` shows a confirmation modal before calling `resetMatch`, and `initSeed` simply stores the seed without dispatching `startClicked`. A match only starts when the player submits via Enter or space.

- **Severity:** None

---

## 7. Accessibility for screen‑readers unverified

- **Finding:**
  > The report is **partially accurate**. Announcements such as `#round-message`, `#cli-countdown`, and the scoreboard already use `role="status"`/`aria-live`, but we have not revalidated with assistive technology lately. Scheduling a focused audit is still prudent.

- **Severity:** Low

---

## Improvement Opportunities

- **Add regression coverage for points-to-win:** Extend the CLI integration tests to exercise `restorePointsToWin`, verifying that a stored value updates both the dropdown and header after reload. This guards against future persistence regressions.
- **Polish Escape key UX:** ✅ Done — `shouldProcessKey` ignores both `Escape` and `Esc`, and `onKeyDown` now clears any lingering error message while allowing the modal manager to close overlays. `battleCLI.onKeyDown.test.js` locks the behaviour.
- **Improve verbose-mode discoverability:** Ensure the production DOM includes a visible indicator (e.g., wire the existing `#verbose-indicator` from `cliDomTemplate.js` into `battleCLI.html`) or add a snackbar notice when verbose mode is enabled so players know where to look for logs.
- **Protect countdown warning styling:** Add a focused test that drives `startSelectionCountdown` below five seconds and asserts the inline colour update, preventing regressions to the warning highlight.
- **Full accessibility audit:** Run a screen-reader pass (NVDA/VoiceOver) that covers round announcements, countdown changes, and shortcut toggles, documenting any gaps and remediation steps.

---

## Task Progress

- **Escape key error hint** — Verified `src/pages/battleCLI/events.js:59-70` clears stale error copy while keeping countdown text when a timer is active, and expanded coverage in `tests/pages/battleCLI.onKeyDown.test.js:99-132` for both idle and active countdown scenarios. Tests: `npx vitest run tests/pages/battleCLI.onKeyDown.test.js` ✔, `npx playwright test playwright/cli.spec.js` ✔ (rerun with elevated permissions to bind the CLI test server).
