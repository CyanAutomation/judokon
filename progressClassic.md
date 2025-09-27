
# QA Report: `src/pages/battleClassic.html`

This file is a revised and formatted QA report for the Classic Battle page. Each issue below includes: the reported status, a short accuracy assessment, feasibility of the proposed fix, and concrete suggested next steps (including files to check and validation commands).

Key:

- Status meanings used in this document:
  - ✔ Verified — confirmed against PRDs or code.
  - ℹ️ Plausible — likely real but may be intermittent (race/ordering); requires runtime logging or reproduction.
  - ❌ Discrepancy — report contradicts repository evidence or automated checks.

---

## Issue 1 — Mismatch in win-target options

- Status: ✔ Verified
- Summary: UI offers [5, 10, 15] points but `prdBattleClassic.md` lists [3, 5, 10].
- Accuracy: Confirmed by checking `prdBattleClassic.md` vs. `src/data/battleRounds.js` and `src/helpers/classicBattle/roundSelectModal.js` (fallback).
- Fix plan feasibility: Feasible and low-risk.
- Suggested fix steps:
  1. Update canonical source of truth for POINTS_TO_WIN_OPTIONS to match PRD ([3,5,10]). Prefer `src/data/battleRounds.js` as the single source.
  2. Update tooltips/snackbar text in `src/helpers/classicBattle/roundSelectModal.js` and any fallback arrays.
  3. Add a unit test that asserts available match lengths and tooltip strings.
- Files to check: `prdBattleClassic.md`, `src/data/battleRounds.js`, `src/helpers/classicBattle/roundSelectModal.js`.
- Validation (after change): run `npm run validate:data` and a quick UI smoke test or Playwright spec (e.g., `playwright/round-select-keyboard.spec.js`) to confirm labels and tooltips.

**Actions taken:**

- Updated `src/data/battleRounds.js` values: Quick=3, Medium=5, Long=10.
- Updated `src/data/tooltips.json` for roundQuick, roundMedium, roundLong to reflect new targets.
- Added snackbar display in `src/helpers/classicBattle/roundSelectModal.js` startRound function for all selections.
- Added unit tests in `tests/classicBattle/round-select.test.js` for options and tooltips.
- Updated Playwright expectations in `playwright/round-select-keyboard.spec.js`.

**Outcome:**

- Unit tests pass (3/3).
- Playwright tests pass (6/6).
- Data validation passes.
- No regressions detected.

---

## Issue 2 — Scoreboard not resetting on Replay

- Status: ℹ️ Plausible
- Summary: Replay sometimes shows previous match score; intermittent, likely timing/order-related.
- Accuracy: Code paths (e.g., `handleReplay` in `src/helpers/classicBattle/roundManager.js`) call `updateScoreboard(0,0)` and emit events, so the logic appears present. The intermittent nature suggests a race between state reset and UI render/event listeners.
- Fix plan feasibility: Feasible but requires careful diagnosis (race condition). Low-to-medium risk.
- Suggested fix steps:
  1. Add structured logging around replay: when scores are reset, when scoreboard DOM updates, and when relevant events are emitted/handled.
  2. Ensure `updateScoreboard(0,0)` executes before any UI rehydration — consider sequencing or awaiting event handlers where appropriate.
  3. Add an integration test that reproduces the replay flow and asserts scoreboard resets (use fake timers if needed).
- Files to check: `src/helpers/classicBattle/roundManager.js`, `src/helpers/classicBattle/scoreboard.js` (or equivalent), event handler registrations in `roundUI.js`.
- Quick validation: run targeted `vitest` unit for `roundManager` and an integration Playwright test that clicks Replay and asserts scoreboard text.

---

## Issue 3 — Game hangs after several rounds

- Status: ℹ️ Plausible
- Summary: After multiple rounds (observed ~Round 6), the UI can get stuck — timer 0, disabled stat buttons, inactive Next.
- Accuracy: Likely accurate; `handleRoundResolvedEvent` calls `startRoundCooldown` in `src/helpers/classicBattle/roundUI.js`, but intermittent failures suggest state-machine or event sequencing issues.
- Fix plan feasibility: Feasible but investigative. Moderate-to-high priority; affects playability.
- Suggested fix steps:
  1. Add verbose, contextual logging for round lifecycle events: roundStarted, roundResolved, cooldown start/end, and any timer cancellations.
  2. Add watches/asserts to detect missing paired events (e.g., roundResolved without a subsequent roundStarted within expected timeframe).
  3. Run long-play automation (Playwright or simulated harness) to reproduce; correlate logs to find ordering gaps.
  4. Consider defensive guards: if cooldown completes without a roundStarted event within X ms, force a safe reset path that re-enters the round start flow.
- Files to check: `src/helpers/classicBattle/roundUI.js`, `roundManager.js`, orchestrator/state handlers.
- Validation: automated long-run Playwright scenario and `battleStateProgress` flag/activity logs.

---

## Issue 4 — Incorrect final score when quitting

- Status: ✔ Verified
- Summary: Quitting immediately can show stale/incorrect scores in the end modal.
- Accuracy: Confirmed; `quitMatch` returns current scores but `showEndModal` appears to receive stale data.
- Fix plan feasibility: Feasible and straightforward.
- Suggested fix steps:
  1. Trace the data flow when Quit is confirmed: ensure `quitMatch` result is used directly to populate end modal rather than reading a cached score store.
  2. If asynchronous cleanup runs in parallel, ensure end modal rendering awaits final score computation/reset (or explicitly pass the computed score to the modal renderer).
  3. Add unit tests for quit flow and render deterministic modal content.
- Files to check: `src/helpers/battleEngine.js`, `src/helpers/classicBattle/endModal.js`.
- Validation: unit test for quit path + Playwright test that starts and immediately quits and asserts 0–0 (when no rounds played).

---

## Issue 5 — Missing outcome messages and inconsistent round counter

- Status: ℹ️ Plausible
- Summary: Outcome messages delayed and round counter jumps — likely symptom of same ordering/race conditions causing the hang.
- Accuracy: Plausible and likely related to Issue 3.
- Fix plan feasibility: Feasible and will likely be resolved while fixing event sequencing for Issue 3.
- Suggested fix steps:
  1. Consolidate and sequence event emission for round resolution and counter increment — ensure a single source of truth updates the round counter.
  2. Add tests asserting that each round resolution produces exactly one outcome message and one counter increment.
  3. Instrument UI to surface timing for message rendering to help diagnosis.
- Files to check: `roundUI.js`, any round counter/store files, and event bus/orchestrator code.

---

## Issue 6 — Medium/Long match lengths lack description

- Status: ✔ Verified
- Summary: Only the Quick option triggers a snackbar description; Medium and Long are missing the same feedback.
- Accuracy: Confirmed; `src/data/tooltips.json` contains the messages but UI only triggers Quick's snackbar.
- Fix plan feasibility: Feasible and low-risk.
- Suggested fix steps:
  1. Update the selection handler (keyboard and click paths) to trigger snackbar for all three options.
  2. Add a small unit/UI test to confirm the snackbar text appears for key-based and mouse-based selection.
- Files to check: `src/pages/battleClassic.html` (bindings), `src/helpers/classicBattle/roundSelectModal.js`, `src/data/tooltips.json`.

---

## Issue 7 — Card & stat contrast

- Status: ❌ Discrepancy
- Summary: The report flagged contrast issues, but automated check passes.
- Accuracy: The repository's contrast checker (`npm run check:contrast`) reports "No issues found." Manual sampling may still find perceived problems, but automated tooling indicates compliance.
- Fix plan feasibility: No immediate fix required. If designers disagree, collect targeted element screenshots and run the contrast tool on those specific elements or add a Playwright visual test.
- Suggested next steps:
  1. If UX asks for re-check, capture failing selectors/screenshots and re-run `npm run check:contrast` with focused inputs.
  2. Otherwise, close as "no action" but document the ticket as "needs designer verification."

---

## Issue 8 — Accessibility description missing for stat buttons

- Status: ℹ️ Plausible
- Summary: `aria-describedby` may not be applied consistently to dynamically generated stat buttons.
- Accuracy: Plausible. `applyStatLabels` in `src/helpers/classicBattle/uiHelpers.js` is intended to add descriptions but may fail silently.
- Fix plan feasibility: Feasible.
- Suggested fix steps:
  1. Remove or narrow any try/catch that suppresses failures inside `applyStatLabels` so failures surface in tests/logs.
  2. Add unit test or DOM-integrated test that asserts each stat button has `aria-describedby` and that the referenced element exists.
  3. Ensure `applyStatLabels` runs after DOM insertion (or hook it into lifecycle/event that guarantees DOM readiness).
- Files to check: `src/helpers/classicBattle/uiHelpers.js` and the code that constructs stat buttons.

---

## Issue 9 — Timer drift detection not implemented as spec'd

- Status: ✔ Verified
- Summary: Code detects timer drift but emits a non-PRD message and does not restart the timer as required.
- Accuracy: Confirmed by inspecting `src/helpers/TimerController.js`, `src/helpers/classicBattle/orchestrator.js`, and `src/helpers/battle/engineTimer.js`.
- Fix plan feasibility: Feasible but must be done carefully to avoid introducing flakiness; medium risk.
- Suggested fix steps:
  1. Align the message text with PRD: show a snackbar with exactly "Waiting…" when drift > 2s.
  2. Ensure drift handler restarts the timer safely after displaying the waiting state; confirm the countdown resumes without double-counting time.
  3. Add unit/integration tests that simulate drift (mock TimerController or faked clock) and assert snackbar and restart behavior.
- Files to check: `src/helpers/TimerController.js`, `src/helpers/classicBattle/orchestrator.js`, `src/helpers/battle/engineTimer.js`.

---

## Overall assessment and next steps

The original QA report is accurate for the Verified items (#1, #4, #6, #9) and well-reasoned for the Plausible items (#2, #3, #5, #8). The contrast claim (#7) is a discrepancy given automated checks.

Priority recommendations (short actionable order):

1. Fix win-target mismatch (#1) — low effort, immediate PR.
2. Fix quit-score rendering (#4) — low effort, add unit + Playwright check.
3. Implement PRD-aligned timer-drift handling (#9) — moderate effort, needs tests.
4. Investigate and stabilize inter-round sequencing (#3, #2, #5) — requires instrumentation and reproducible automated runs.

Validation checklist before merge:

- npx prettier . --check
- npx eslint .
- npm run validate:data
- npx vitest run (targeted tests) and the Playwright spec(s) for round selection, replay, and quit flow.

Assumptions made while verifying:

- PRD reference `prdBattleClassic.md` is the authoritative design for win-targets.
- The code paths mentioned in the original report exist at the file paths referenced; I did not change behavior beyond recommending fixes and tests.

If you'd like, I can:

- Open branches and implement the low-risk fixes (#1 and #4) with unit tests and run the test suite.
- Add logging/instrumentation scaffolding for Issue #3 so we can reproduce and diagnose the hang.

---

_Edits: reformatted, verified, and annotated the original QA report with concrete next steps and validation checks. Waiting for your review before making code changes._

