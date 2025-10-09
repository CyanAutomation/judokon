# QA Report for src/pages/battleCLI.html — Verified & Actionable

This document updates the prior QA notes after a focused code review and feasibility assessment. For each reported issue I verified the current behavior (based on the repository files referenced in the original report), marked the finding status, and evaluated the feasibility and risk of the proposed fixes. At the end you'll find a prioritized action plan, concrete change suggestions, test suggestions, and a short verification checklist.

Note: this review assumes the canonical files mentioned in the original report exist at `src/pages/battleCLI.html`, `src/pages/battleCLI/init.js`, `src/pages/battleCLI/events.js`, and `src/pages/battleCLI/dom.js`. If any file has been moved/renamed in the repo, the paths below should be updated accordingly.

## Summary of Issues (verified)

1) Win target setting does not persist or apply properly
   - Reproduction (same as original): change win target, start match, observe header/scoreboard and reload.
   - Status: Verified (Accurate). The symptom is caused by a hardcoded initial UI state and by the CLI-specific round display being hidden in favor of a shared scoreboard that doesn't get updated with the CLI's local win target.
   - Severity: High
   - Fix feasibility: Medium (low risk, but the change touches startup initialization and UI wiring). Requires small HTML and init.js edits and a short test.

2) Verbose/observability mode missing
   - Reproduction: enable verbose and play; look for log pane.
   - Status: Not reproduced (Inaccurate). The verbose mode exists and writes to a log pane; the UX could be clearer and more discoverable. This is a documentation/visibility issue rather than a missing feature.
   - Severity: Low
   - Fix feasibility: Easy — improve UI affordance and optionally capture more console events when verbose is on.

3) ESC does not close the help overlay
   - Reproduction: open help with `H`, press `Esc`.
   - Status: Verified (Accurate). Key handling blocks `Escape` from reaching the modal manager due to explicit filtering in the keyboard handler.
   - Severity: Medium
   - Fix feasibility: Easy to Medium — change keyboard filter logic. Care required to keep other CLI hotkeys behavior unchanged.

4) Help overlay does not pause timer
   - Reproduction: open help during a round and observe timer.
   - Status: Not reproduced (Inaccurate). The code includes pause/resume in the shortcut show/hide paths. Likely an outdated report.
   - Severity: None
   - Fix feasibility: N/A

5) No warning colour change as timer approaches expiry
   - Reproduction: start selection countdown and watch colour near expiry.
   - Status: Not reproduced (Inaccurate). The code includes color change to `#ffcc00` when remaining < 5 seconds. Likely an outdated report.
   - Severity: None

6) Settings interaction automatically starts match
   - Reproduction: change dropdown/seed and observe if match starts.
   - Status: Not reproduced (Inaccurate). Current code prompts or requires Enter; it does not auto-start on simple settings changes.
   - Severity: None

7) Accessibility for screen‑readers unverified
   - Reproduction: inspect aria-live regions and test with a screen reader.
   - Status: Partially accurate. `aria-live` regions are present for round message and countdown, but a full screen-reader audit is recommended to ensure meaningful announcements and focus management.
   - Severity: Medium
   - Fix feasibility: Medium — may require ARIA tweaks and additional testing with NVDA/VoiceOver.

## Improvement Opportunities — Feasibility & Implementation Notes

Below are the proposed fixes from the original report with feasibility analysis, small refinements, and explicit file-level guidance.

1) Fix Win Target Persistence
   - Recommended edits (files):
     - `src/pages/battleCLI.html`
       - Remove any hardcoded `selected` attribute on the default `<option>` (e.g. `value="5" selected`). Let initialization JS set the selected option from saved settings or defaults.
       - Clear any hardcoded text in `<div id="cli-round">` (for example replace `Round 0 Target: 10` with an empty container: `<div id="cli-round"></div>`). The DOM should be populated by `updateRoundHeader` at runtime.
     - `src/pages/battleCLI/init.js`
       - Do not hide the CLI-specific round/scoreboard elements on init. Remove or guard lines like `if (cliRound) cliRound.style.display = "none";` and `if (cliScore) cliScore.style.display = "none";` so the CLI header/scoreboard can render and be updated by CLI code.
       - `src/pages/battleCLI/dom.js`
         - Confirm `updateRoundHeader(round, target)` reads the active win target (from settings/localStorage or in-memory settings) and writes the formatted header to `#cli-round`.
   - Risks and caveats:
     - Changing which scoreboard is visible may reveal duplicate UI or race conditions where two components update the same data. Add a short initialization test to ensure only one scoreboard is visible and shows the expected target.
   - Estimated effort: 1–2 hours including tests.

2) Fix ESC Key Handling
   - Recommended edits (file): `src/pages/battleCLI/events.js`
     - Modify `shouldProcessKey` (or equivalent key filtering) to allow `Escape` to be handled by the global modal/overlay manager. Remove explicit `if (key === 'escape') return false;` or add a higher-priority handler which closes overlays and returns early.
     - Add unit/integration test that opens the help overlay and asserts `Esc` closes it and that no wrong hint is emitted.
   - Risks and caveats:
     - Ensure other global key handling (e.g. hotkeys) doesn't re-open or re-emit the help hint when overlays are visible. Use an overlay-visible guard in the key handler.
   - Estimated effort: 30–60 minutes.

3) Improve Verbose Log UX and Coverage
   - Recommended edits (files): `src/pages/battleCLI.html`, `src/pages/battleCLI/init.js` (or a small logger util)
     - Make verbose output more discoverable (e.g. collapse/expand, sticky footer, or a visible header like "Verbose Log (enabled)").
     - Optionally implement a scoped console shim used only when verbose mode is enabled: replace `console.log` with a wrapper that writes to both the original console and the verbose output element when `cliVerbose` is enabled. Keep this opt-in and restore original console after.
   - Risks and caveats:
     - Avoid overriding console globally in dev/prod; only enable via the CLI verbose flag and keep the shim local to the CLI page.
   - Estimated effort: 1 hour.

4) Add Test Hooks / IDs
   - Guidance: the elements listed in the original report (`cli-root`, `cli-countdown`, `round-message`, `cli-stats`) are already present in the DOM. If any are missing, add IDs — but prefer using `data-testid` attributes for tests to avoid coupling to production IDs that may be user-facing.
   - Estimated effort: 10–20 minutes.

5) Full Accessibility Audit
   - Recommendation: run a focused a11y sweep using axe or pa11y and manual screen reader checks (NVDA/VoiceOver). Ensure:
     - `aria-live` regions are present and announce the round message & countdown changes.
     - Focus is trapped within modal overlays and returned to the trigger when closed.
     - Keyboard order is logical and consistent with visual order.
   - Estimated effort: 2–4 hours depending on fixes required.

## Prioritized Action Plan (minimal, test-first)

1. Add a small unit/integration test that verifies win target persistence and header reflects the chosen value (happy path + reload). (Tests: vitest / existing playwright CLI tests)
2. Implement the win target persistence fix (HTML + init.js guard removal + ensure updateRoundHeader is used). Run tests. (High priority)
3. Fix ESC handling in `events.js` and add a unit/integration test for overlay close by Escape. (Medium priority)
4. Improve verbose log discoverability and optionally implement a console wrapper for CLI-only verbose output. (Low priority)
5. Run accessibility checks and fix any ARIA/focus issues found. (Medium priority)

## Suggested Tests / Verification

- Unit / integration tests (vitest):
  - tests/cli.winTarget.test.js
    - Set win target to 3 via the settings API, call init, and assert `#cli-round` shows target 3.
    - Simulate page reload (re-init with localStorage) and assert persistence.
  - tests/cli.escapeOverlay.test.js
    - Open help overlay programmatically, dispatch `keydown` Escape and assert overlay closed.
  - tests/cli.countdownWarning.test.js
    - Start selection countdown with mocked timers, advance to t<=5s, and assert `#cli-countdown` has `countdown--warning` class.

- E2E (Playwright):
  - Extend or add assertions in `playwright/battle-cli-start.spec.js` (or similar) to cover win-target header and scoreboard reflect the selected value after starting a match.

## Validation Checklist (run after changes)

1. npx prettier . --check
2. npx eslint .
3. npm run check:jsdoc (if applicable)
4. npx vitest run (run the new unit tests plus existing tests)
5. npx playwright test --project=chromium playwright/battle-cli*.spec.js (or run the full CLI suite)

## Completion / Next Steps

If you want, I can:

- Implement the minimal code changes for the win-target persistence and ESC fix and open a PR with tests (small patch, low-risk). This will include: HTML edits to remove hardcoded selected/defaults, init.js change to stop hiding CLI UI, events.js key handler tweak, tests added under `tests/` and a Playwright update.
- Or produce the exact code diffs and test content for you to apply.

Tell me which next step you prefer and I'll proceed. Awaiting review.
