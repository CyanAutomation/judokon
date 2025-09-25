# QA Report — src/pages/battleClassic.html

This document reviews the QA findings for the Classic Battle UI, confirms accuracy where possible, evaluates feasibility of fixes, and adds improvement suggestions and follow-up steps. Each reported issue below contains:

- A short reproduction summary
- Verification (whether the issue is plausible/corroborated by code review)
- Fix feasibility and recommended changes (concrete implementation notes)
- Suggested tests and follow-ups

---

## Summary of findings

All eight issues reported are plausible and consistent with the code areas mentioned in the original report (hot paths: `battleClassic.init.js`, `uiHelpers.js`, `statButtons.js`, and timer helpers). Most fixes are low-to-medium risk and can be implemented with focused changes and tests. The highest-value quick wins are: disabling stat buttons after selection, adding the "Opponent is choosing…" feedback, clarifying the Next button state, and wiring the Main Menu action.

---

## 1) Opponent card exposed prematurely

Repro: Starting a match (or pressing Next without setting match length) sometimes reveals the opponent's card immediately.

Verification: Plausible. Likely a state/race issue where the opponent card render path runs before the UI/game state reaches the expected pre-selection state. Suspect files: `battleClassic.init.js`, data initializers, and rendering code for the opponent card.

Feasibility & recommended fix:

- Feasibility: Medium — low code risk.
- Add a defensive UI flag (e.g., `uiReady` or `opponentHidden`) and ensure opponent card markup has a default hidden state. Only flip/reveal after selection or when the round resolves.
- Ensure initialization flow (match setup → round start → enable selection) sets that flag deterministically. Prefer state checks over timing-based delays.

Tests / follow-ups:

- Unit test for render path: when match is in pre-selection state, opponent card element has `hidden` or `aria-hidden="true"`.
- Integration test: reproduce the "Next without choosing match length" flow and assert opponent card remains hidden until after selection.

---

## 2) Stat buttons remain enabled after selection

Repro: After choosing a stat (button turns blue), other stat buttons remain clickable and repeated clicks can change state multiple times.

Verification: Confirmed likely. The click handler (`handleStatButtonClick` in `src/pages/battleClassic.init.js`) should call a method to disable the stat buttons but appears not to.

Feasibility & recommended fix:

- Feasibility: High — low risk, small change.
- Immediately call an existing `disableStatButtons()` (or implement one) inside the stat click handler. Ensure re-enable happens at the start of the next round via `renderStatButtons()` or similar.
- Guard double-clicks server-side if there's an API call or event emission to avoid duplicate processing.

Tests / follow-ups:

- Unit test: after invoking the stat select handler, assert all stat buttons are disabled and further click events are ignored.
- E2E: select a stat and assert round state transitions exactly once.

---

## 3) Missing stat choice feedback

Repro: Score updates and a round outcome message appear, but there's no message indicating the stat values compared.

Verification: Likely. Code mentions `showStatComparison` in `src/helpers/classicBattle/uiHelpers.js` and a `selectStat` snackbar; behavior suggests the comparison message isn't consistently shown.

Feasibility & recommended fix:

- Feasibility: High — straightforward consolidation.
- Consolidate feedback so a single snackbar or scoreboard region shows: "You picked: SPEED (8) — Opponent picked: TECHNIQUE (6) — You win the round!".
- Ensure `showStatComparison` is called during round resolution and not suppressed by race conditions or multiple message calls.

Tests / follow-ups:

- Unit tests for the message formatting utility.
- Integration test that asserts snackbar text after round resolution contains both choices and the outcome.

---

## 4) Missing "Opponent is choosing…" prompt

Repro: After the player selects a stat, there is an unexplained delay before the opponent card flips.

Verification: Confirmed likely. The function `prepareUiBeforeSelection` in `battleClassic.init.js` contains the snackbar call, but it may not fire in all code paths.

Feasibility & recommended fix:

- Feasibility: High — small change.
- Ensure `prepareUiBeforeSelection()` is executed on all selection code paths. Make the call idempotent and explicit: call `showSnackbar(t('ui.opponentChoosing'))` immediately after player selection and before triggering the AI decision delay.

Tests / follow-ups:

- E2E test: select a stat and assert a temporary "Opponent is choosing…" message appears and disappears before reveal.

---

## 5) "Next" button visual state inconsistent with behavior

Repro: After a round resolves the Next button looks disabled but is still clickable.

Verification: Plausible. The HTML may toggle the `disabled` attribute inconsistently, or CSS styles for `button[disabled]` are missing/overridden.

Feasibility & recommended fix:

- Feasibility: High — mostly a presentation fix.
- Ensure the Next button's `disabled` attribute is set/unset in the game state logic and add clear `button[disabled]` CSS rules (opacity, cursor: not-allowed, pointer-events: none) to prevent clicks when visually disabled.
- Also verify there's no JavaScript click handler that ignores `disabled` and acts regardless — if present, early-return on `.disabled` state.

Tests / follow-ups:

- Unit test: confirm `disabled` is set when expected.
- E2E: click the greyed-out Next button and assert no state change.

---

## 6) Main Menu button not wired

Repro: Clicking the Main Menu button in the header does nothing.

Verification: Confirmed likely. No event listener attached to `#home-button` in `battleClassic.init.js` was found during the review.

Feasibility & recommended fix:

- Feasibility: High — trivial wiring.
- Attach a click handler that opens a confirmation modal and, on confirm, calls `quitMatch()` or navigates the user to the home route while cleaning up match state. Keep modals accessible (focus trap, Escape to cancel).

Tests / follow-ups:

- E2E test: click Main Menu, confirm the modal, and assert navigation and cleanup occurred.

---

## 7) Keyboard navigation not functioning

Repro: Tab does not focus in-game controls; stat buttons aren't keyboard-selectable.

Verification: Partially confirmed. There are helpers like `enableStatButtons` that set `tabIndex`, but those may not be called at the right times. A feature flag `statHotkeys` may also be disabled by default.

Feasibility & recommended fix:

- Feasibility: Medium — needs careful attention to accessibility and focus management.
- Ensure `tabIndex` is set for all interactive controls at round start. Call `element.focus()` where appropriate for first-action focus.
- Revisit feature flag decision: keyboard hotkeys can be enabled by default or behind a user setting, but keyboard focus/tab order must always work regardless of hotkeys.
- Add visible focus styles and ARIA labels. Implement number key handlers (`1-5`) as a progressive enhancement, but keep keyboard tab navigation as a baseline requirement.

Tests / follow-ups:

- Automated a11y checks (axe/pa11y) for focus order and keyboard operability.
- Unit/integration tests that simulate Tab navigation and keyboard selection.

---

## 8) Timer continues while tab is hidden

Repro: If the player switches browser tabs during stat selection, the timer continues counting down.

Verification: Confirmed likely. Timer code (`createRoundTimer.js` / `timerService.js`) lacks `visibilitychange` handling.

Feasibility & recommended fix:

- Feasibility: High — small, careful change.
- Add a `document.addEventListener('visibilitychange', ...)` handler that pauses the timer when `document.hidden` is true and resumes when visible. Make sure to preserve remaining time and avoid time-drift issues.

Tests / follow-ups:

- Unit test for the timer service verifying pause/resume updates remaining time correctly.
- E2E test: start timer, hide tab (or simulate), assert timer pauses and resumes.

---

## Prioritization & next steps

Suggested order of fixes (fast wins first):

1. Disable stat buttons after selection (prevents incorrect state transitions).
2. Show "Opponent is choosing…" messaging (improves feedback and perceived latency).
3. Fix Next button disabled state (presentation + guard against click handlers).
4. Wire Main Menu button and confirm/cleanup flow.
5. Add timer visibilitypause/resume.
6. Ensure opponent card is reliably hidden until reveal (state gating).
7. Keyboard navigation and hotkeys (accessibility focused).
8. Consolidate stat comparison snackbar/message.

Each change should be accompanied by at least one unit test and one integration/E2E test where appropriate.

---

## Quality gates and verification

Before merge, run these checks:

- npx prettier . --check
- npx eslint .
- npm run validate:data (if data schema changes)
- npx vitest run (unit tests)
- npx playwright test (integration/E2E)
- pa11y/axe accessibility audit for keyboard and focus issues

---

## Completion

I have reviewed the report, confirmed plausibility for all items, and updated this file with verification, actionable fixes, and tests. If you want, I can now open PRs with the highest-priority fixes one-by-one (starting with disabling stat buttons + opponent-choosing messaging). What would you like me to do next?
