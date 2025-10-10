# QA Report for `src/pages/battleCLI.html` - Revised

This revision re-validates every QA finding against the current CLI implementation and its regression coverage.

**Summary**

- 6 of 7 reported issues are no longer reproducible in the current build; behaviour matches the expected design and unit tests.
- Accessibility coverage exists for live regions, but we still need a fresh assistive-technology audit (VoiceOver/NVDA).
- Follow-up work focuses on observability discoverability, automated safeguards, and the outstanding a11y review.

## Latest Actions

- Added a header-level verbose-mode indicator to `src/pages/battleCLI.html` so `setupFlags` can surface observability status without scrolling.
- Updated `setupFlags` to manage `aria-hidden` on the indicator and added `battleCLI.verboseFlag.test.js` coverage to ensure the UI reflects flag changes.
- Extended countdown regression coverage in `tests/pages/battleCLI.countdown.test.js` to assert the warning colour under five seconds and the reset when the timer restarts.

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
  >
  > **Note:** The header now includes `#verbose-indicator` so verbose mode surfaces inline without scrolling (2025-02-14 refresh).

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

## Recommended Follow-Up

- **✅ Completed — Verbose indicator hook**: Added `#verbose-indicator`, synchronized `aria-hidden`, and covered the behaviour via `battleCLI.verboseFlag.test.js`.
- **✅ Completed — Countdown warning regression test**: `battleCLI.countdown.test.js` now asserts the warning colour under five seconds and the reset on restart.
1. **Playwright persistence scenario (0.5 day)** — Introduce a CLI E2E test that toggles the win target, reloads, and verifies the header + scoreboard values to complement the unit coverage (`tests/pages/battleCLI.pointsToWin.test.js`).
2. **Screen-reader verification (1 day)** — Run NVDA + VoiceOver smoke tests covering round announcements, countdown updates, verbose log toggles, and modal focus traps. Capture findings in the accessibility log and file follow-up tickets as needed.

## Validation Evidence

- `npx vitest run tests/pages/battleCLI.countdown.test.js`
- `npx vitest run tests/pages/battleCLI.verboseFlag.test.js`
- `npx vitest run tests/pages/battleCLI.pointsToWin.test.js`
- `npx vitest run tests/pages/battleCLI.onKeyDown.test.js`
- `npx playwright test playwright/cli.spec.js --reporter=line --workers=1`
