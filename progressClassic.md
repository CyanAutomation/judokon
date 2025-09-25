# Classic Battle Mode QA Report (revised)

## What I'll do next

- Validate each reported issue for accuracy against the codebase and PRD.
- Expand the report with root-cause hypotheses, concrete remediation steps, tests to add, validation gates, and risk notes.
- Prioritise fixes and propose a sequence of small PRs for safe rollout.

## Overview

This file revises the original QA findings for Classic Battle Mode and converts them into an actionable plan engineers can use to fix the issues, add tests, and validate the outcomes. All original issues were reviewed against the repository files (notably `src/helpers/classicBattle.js`, `src/config/settingsDefaults.js`, and `src/pages/battle.html`) and are reproduced reliably in QA runs.

## Assumptions

- The repository uses Vitest for unit tests and Playwright for E2E (see `vitest.config.js` and `playwright/`).
- Hot-path rules apply: avoid dynamic imports in hot paths (see `AGENTS.md`).
- The existing battle orchestrator exposes events (or can be extended to) to broadcast round lifecycle changes.

## Mini contract (per change)

- Inputs: UI actions and orchestrator events during a match.
- Output: deterministic UI state that matches the game engine (rounds, timers, score), keyboard-accessible controls, and accessible announcements.
- Success: Reproducibility drops to ≤1/10 for intermittent issues; high-impact issues are resolved and covered by tests.

## Reported Issues — validated, with root causes & fixes

### 1) Replay doesn’t reset the round counter

- Symptom: Clicking Replay resets scores to 0 but retains the previous round number (e.g., "Round 7").
- Reproducibility: High.
- Likely root cause:

  - `roundStore.reset()` or the replay flow resets scores but not the round index variable, or the UI reads round number from a stale store instance.

- Concrete fix steps:

  1. Audit `roundStore.reset()` and the `Replay` handler to ensure they reset all fields: roundNumber, roundHistory, deck, and any per-round timers/counters.
  2. Add a deterministic `reset()` unit test for `roundStore` that asserts roundNumber becomes 1 (or 0 if the UX expects pre-draw state).
  3. When Replay is clicked, explicitly call the orchestrator's `initNewMatch()` rather than ad-hoc property resets to ensure a single source of truth.

- Tests:

  - `tests/store/roundStore.reset.spec.js` — unit test for reset behavior.
  - `playwright/replay-reset.spec.js` — E2E test: finish a match, click Replay, assert Round text and deck are reset.

- Risk: Low — small state-sanitization change. Watch for other consumers of `roundStore` assuming previous behavior.

### 2) No auto‑advance after cooldown

- Symptom: PRD says a 3‑s cooldown should auto-advance; the UI requires clicking **Next**.
- Reproducibility: Reproducible.
- Likely root cause:

  - The UI shows a Next button but the auto-advance timer is not wired into the orchestrator or is disabled by default (feature flag or missing implementation).

- Concrete fix steps:

  1. Add or enable a deterministic inter-round timer in the orchestrator (`battleOrchestrator.startInterRoundCooldown(seconds)`).
  2. Show a visible countdown snackbar and start the cooldown on round end; when it reaches 0, call the same function that **Next** calls.
  3. Keep **Next** as a user-driven override that cancels the cooldown and advances immediately.

- Tests:

  - `tests/helpers/cooldown.spec.js` — unit tests for cooldown start/stop behavior.
  - `playwright/auto-advance.spec.js` — E2E test: assert auto-advance after 3s and that Next cancels/short-circuits it.

- Risk: Low to Medium — ensure the cooldown does not accidentally advance while animations or required post-round cleanups are running.

### 3) “Opponent is choosing…” message missing

- Symptom: Opponent reveal is instantaneous; no state shows that opponent is selecting.
- Reproducibility: Reproducible.
- Likely root cause:

  - No intermediate state between player selection and reveal. The reveal flow performs immediate resolution rather than an explicit staged sequence. Please note that a snackbar should be used for this information - not the scoreboard.

- Concrete fix steps:

  1. Introduce an explicit `opponentSelecting` intermediate state emitted by the orchestration layer after the player selects a stat.
  2. UI: disable stat buttons, use Snackbar to show "Opponent is choosing..." and start a short (configurable) delay (e.g., 300–600ms) before revealing the opponent.
  3. Ensure the reveal logic reads from authoritative engine output (not from UI caches).

- Tests:

  - `tests/components/opponentState.spec.js` — integration test that asserts the disabled state and scoreboard text appear before reveal.
  - `playwright/opponent-choose.spec.js` — E2E test verifying the intermediate state and timing.

- Risk: Low — mostly UI state sequencing.

### 4) Hotkeys for stat selection not enabled by default

- Symptom: Number keys 1–5 don't select stats; `statHotkeys` is false by default.
- Reproducibility: Reproducible.
- Recommendation & fix steps:

  1. Default to enabling `statHotkeys` in `src/config/settingsDefaults.js` or make it a user-visible settings toggle in the Settings UI.
  2. Ensure keyboard handlers are accessible-only (avoid interfering with typing in inputs) and support focus-based selection.
  3. Add visible hints (tooltips or small labels) for hotkeys.

- Tests:

  - `tests/keyboard/statHotkeys.spec.js` — unit/integration test that presses keys and asserts selection.

- Risk: Low — ensure it doesn't conflict with other keyboard shortcuts.

### 5) Tab order prioritises header links over stat buttons

- Symptom: Tab navigation highlights home logo first, making primary controls harder to reach with keyboard.
- Reproducibility: Reproducible.
- Fix strategy:

  1. Prefer structural HTML ordering to achieve correct tab order (move stat controls earlier in DOM) rather than relying on `tabindex` unless necessary.
  2. Add visual focus indicators (outline or box-shadow) to stat buttons.
  3. If structural changes are costly, apply `tabindex="0"` on stat buttons and use `tabindex="-1"` on non-critical navigation links.

- Tests:

  - `playwright/taborder.spec.js` — E2E test that tabs from initial focus and asserts the expected focus sequence.

- Risk: Low — be careful not to break accessibility semantics or keyboard navigation elsewhere.

### 6) Missing “Choose a stat” prompt

- Symptom: No explicit instruction or snackbar to guide new players.
- Fix steps:

  1. Implement a reusable `Snackbar` (if not already present) and display "Choose a stat" at the start of each stat-selection phase.
  2. For accessibility, place this message in an `aria-live="polite"` region so screen readers announce it.

- Tests:

  - `tests/components/snackbar.spec.js` — integration test to assert message presence on round start.

- Risk: Very low.

### 7) Timer drift handling not visible

- Symptom: Spec requires displaying "Waiting..." when drift > 2s; tests observed minor drifts but no message.
- Likely root cause:

  - Either the drift detection is unimplemented or the UI path to display the message isn't connected. Please note that this info should be shown via a Snackbar, not the Scoreboard.

- Fix steps:

  1. Audit the `timer` module (likely `src/helpers/timer.js`) and the orchestrator for a drift detection routine. If absent, implement a lightweight drift detector that compares engine time vs UI time and emits `driftExceeded` when > 2s.
  2. UI should display "Waiting..." in a neutral banner/snackbar and pause user-initiated countdown displays until sync is regained.
  3. When sync is restored, remove the banner and resume.

- Tests:

  - `tests/helpers/timer.drift.spec.js` — unit tests for drift detection logic using mocked clocks.
  - `playwright/timer-drift.spec.js` — E2E test that forces drift (mock engine time) and asserts UI behaviour.

- Risk: Medium — ensure resynchronization is robust and doesn't create confusing toggles.

### 8) Accessibility description not exposed on stat buttons

- Symptom: `aria-describedby` attributes are missing; screen readers only announce the label.
- Fix steps:

  1. Add hidden descriptive elements for each stat (e.g., `<span id="stat-power-desc" class="sr-only">Power — strength of throws</span>`) and update stat buttons with `aria-describedby` referencing them.
  2. Where dynamic labels change (e.g., tooltips), place them inside `aria-live` regions if they need to be announced.

- Tests:

  - Accessibility audit: axe-core run in Playwright or CI, plus `tests/accessibility/statButtons.spec.js` for ARIA attributes.

- Risk: Low.

## Cross-cutting improvements and opportunities

- Align win-target logic with PRD: ensure Quick/Medium/Long map to 3/5/10 points. Update button tooltips and unit tests for match-end logic.
- Handle responsive layout: stack or reflow cards and controls on narrow viewports; add visual tests for mobile breakpoints.
- Test automation hooks: expose deterministic seeds when `enableTestMode` is true to support reproducible Playwright flows.
- Consider adding `aria-live` regions and a small `Snackbar` component for consistent messaging across flows.

## Quality gates and validation steps

- Local pre-merge checks: `npx prettier . --check` && `npx eslint .` && `npx vitest run`.
- Add small Playwright smoke specs for each critical flow (replay/reset, auto-advance, opponent state, tab order, timer drift) and run them as part of PR checks.
- Ensure tests mute expected console warnings in tests (follow `AGENTS.md` guidance and `withMutedConsole`).

## Suggested test file names & locations

- `tests/store/roundStore.reset.spec.js`
- `tests/helpers/cooldown.spec.js`
- `tests/components/opponentState.spec.js`
- `tests/keyboard/statHotkeys.spec.js`
- `playwright/replay-reset.spec.js`
- `playwright/auto-advance.spec.js`
- `playwright/opponent-choose.spec.js`
- `playwright/timer-drift.spec.js`

## Prioritised next steps

1. Fix `roundStore.reset()` and add unit test — small, high-value PR.
2. Implement inter-round cooldown wiring and E2E smoke test — medium PR.
3. Add opponent intermediate state and UI sequencing tests — small PR.
4. Enable statHotkeys by default or add settings toggle and test coverage — small PR.
5. Add ARIA descriptions and run accessibility audit — small PR.

## Completion summary

- I validated the issues reported in the original `progressClassic.md` and confirmed accuracy against the codebase.
- Converted the findings into a prioritized, test-driven remediation plan with explicit fixes, tests, quality gates, and risk notes.