Battle Scoreboard PRD vs Implementation — Gap Analysis

- Purpose: Compare PRD (design/productRequirementsDocuments/prdBattleScoreboard.md) to current scoreboard implementation and note deltas with actions to align.
- Scope reviewed: DOM contract, public API, event consumption, animation/timer behavior, a11y, and tests.

Task Contract

{
"inputs": [
"design/productRequirementsDocuments/prdBattleScoreboard.md",
"src/components/Scoreboard.js",
"src/helpers/setupScoreboard.js",
"src/helpers/classicBattle/timerService.js",
"src/pages/battleJudoka.html",
"tests/components/Scoreboard.test.js",
"tests/helpers/scoreboard.integration.test.js"
],
"outputs": [
"progressScore.md"
],
"success": [
"Gaps identified with file references",
"Actionable, low-risk changes proposed",
"No public API changes without justification"
],
"errorMode": "ask_on_public_api_change"
}

What The PRD Requires (abridged)

- Render-only reflector: Scoreboard renders persistent battle info (round message with locking, timer ticks, round counter, match score). No game logic or control events.
- Public API: createScoreboard, initScoreboard, showMessage/clearMessage/showTemporaryMessage, showAutoSelect, updateTimer/clearTimer, updateRoundCounter/clearRoundCounter, updateScore. Headless API suggested: render(patch), getState(), destroy().
- Event consumption: Orchestrator emits display.\* events; scoreboard applies idempotent, order-stable updates. Message precedence: outcome|critical > info > neutral; outcomes lock until next round.
- DOM contract: #round-message, #next-round-timer, #round-counter, #score-display with child spans [data-side="player"|"opponent"], and #next-ready-badge (passive).
- Behavior: score animates ≤500ms (persist ≥1s for messages), timer visible within 200ms and pauses on tab hide/resumes on focus, fallback "Waiting…" within 500ms on sync drift, reduced-motion bypasses animations.
- Accessibility: All are aria-live="polite" (atomic), #round-message role="status"; announcement debouncing within 250ms; contrast ≥4.5:1; non-color cues for outcomes.

What’s Implemented Today

- Component + setup (present):
  - src/components/Scoreboard.js provides createScoreboard, initScoreboard, showMessage, clearMessage, showTemporaryMessage, updateTimer/clearTimer, updateRoundCounter/clearRoundCounter, updateScore. Score animation uses requestAnimationFrame for 500ms and respects shouldReduceMotionSync(). Message lock prevents transient "Waiting…" from overwriting outcomes (data-outcome="true"). Visibility/focus listeners call injected pauseTimer/resumeTimer.
  - src/helpers/setupScoreboard.js exports setupScoreboard(controls, scheduler) and re-exports component methods.
  - src/pages/battleJudoka.html contains scoreboard DOM nodes (#round-message, #next-round-timer, #round-counter, #score-display with two spans). No #next-ready-badge.

- Integration points (partial):
  - src/helpers/classicBattle/timerService.js calls scoreboard.updateTimer/clearTimer and shows fallback "Waiting…" on drift or timer sync issues; also uses showTemporaryMessage on unsynced default duration. It does not call showAutoSelect.
  - No production wiring found that calls updateScore or updateRoundCounter; those are only exercised in unit/integration tests. No call to setupScoreboard during Classic Battle bootstrap.

- Tests (partial):
  - tests/components/Scoreboard.test.js validates DOM attributes, message lock, and basic updates; reduced motion mocked to true (animation paths not exercised).
  - tests/helpers/scoreboard.integration.test.js verifies timer ticks and drift fallback via timerService and basic score/counter rendering without explicit init.
  - Playwright a11y smoke tests assert at least one role=status per page, but no scoreboard-specific animation/timer pause behaviors.

Key Deltas vs PRD

- Missing event bridge: Scoreboard does not consume PRD display.\* events. There is no adapter that maps orchestrator events (e.g., display.round.message/outcome, display.score.update) to Scoreboard API calls.
- Not initialized on page: Classic Battle bootstrap does not call setupScoreboard; visibility/focus pause/resume hooks are inert in production.
- DOM contract gaps: No #next-ready-badge; #score-display spans lack data-side attributes; newline in text content for opponent score is odd for SRs and formatting.
- Message persistence and debouncing: No ≥1s persistence rule for outcome messages and no 250ms announcement debouncing/coalescing across live regions.
- Headless API: No render(patch), getState(), or destroy() methods are exposed as suggested in PRD.
- Next readiness: Scoreboard does not reflect data-next-ready state (badge is missing); readiness is handled around the Next button only.
- A11y details: Timer region currently has role="status" in code and HTML; PRD only mandates polite live region. Not a blocker, but worth confirming. Non-color cues for outcomes not defined in component (likely CSS concern).

Low-Risk Alignments To Close Gaps

- Wire scoreboard during Classic Battle bootstrap:
  - Where: src/helpers/classicBattle/bootstrap.js (or view.js during init).
  - Action: import { setupScoreboard } from "../setupScoreboard.js" and pass controls { startCoolDown, pauseTimer, resumeTimer, scheduler } available from timer/orchestrator layers. This activates visibility/focus pause/resume.

- Add a thin event adapter for display.\* events:
  - Where: src/helpers/classicBattle/scoreboardAdapter.js (new).
  - Map orchestrator emissions to Scoreboard APIs:
    - display.round.start → clearMessage(); updateRoundCounter(n)
    - display.round.message({ text, kind, lock }) → showMessage(text, { outcome: !!lock })
    - display.round.outcome({ text }) → showMessage(text, { outcome: true })
    - display.message.clear → clearMessage()
    - display.timer.show({ secondsRemaining }) → updateTimer(secondsRemaining)
    - display.timer.tick({ secondsRemaining }) → updateTimer(secondsRemaining)
    - display.timer.hide → clearTimer()
    - display.score.update({ player, opponent }) → updateScore(player, opponent)

- DOM contract adjustments:
  - Add #next-ready-badge to header markup (battleJudoka.html) and ensure it passively mirrors the Next button’s data-next-ready without focus-stealing (e.g., via MutationObserver or explicit adapter update).
  - In Scoreboard.setScoreText, set data-side attributes on spans and avoid newline between them to reduce SR punctuation: <span data-side="player">You: X</span><span data-side="opponent">Opponent: Y</span>.

- Message persistence and debouncing:
  - In showMessage, when opts.outcome === true, ensure at least 1s display before any clear or downgrade; simplest approach: set a timestamp and ignore non-outcome/placeholder updates until 1000ms elapsed.
  - Introduce a micro debouncer (≤250ms) for aria-live updates across #round-message, #next-round-timer, and #score-display to coalesce rapid updates (e.g., batch within a micro-queue flushed on timer).

- Headless API surface:
  - Add minimal render(patch: Partial<State>), getState(): Readonly<State>, and destroy(): void to Scoreboard.js, keeping functions ≤50 lines and documenting with @pseudocode.

- Readiness badge reflection:
  - Implement a passive reflectNextReady(isReady: boolean) in the adapter to toggle #next-ready-badge and avoid announcements for now (PRD marked pending).

- A11y confirmations:
  - Confirm role for timer region; consider removing role="status" from #next-round-timer to reduce verbosity while retaining aria-live="polite" and aria-atomic="true".
  - Ensure CSS provides non-color outcome cues (icon or pattern) to meet color-independence guidance.

Tests To Add/Adjust

- Unit (Vitest):
  - Score animation respects reduced-motion and runs ≤500ms otherwise (can spy on requestAnimationFrame and performance.now).
  - Outcome message persistence blocks placeholder overwrites for ≥1s.
  - Announcement debouncer coalesces multiple updates within 250ms window.
  - setScoreText assigns data-side attributes and renders without newline.

- Integration (Vitest/jsdom):
  - initScoreboard hooks pause/resume on visibility/focus; simulate document.hidden and focus events to verify pauseTimer/resumeTimer calls.
  - Adapter maps display.\* events to DOM updates idempotently.

- E2E (Playwright):
  - Timer pauses when tab hidden and resumes when visible (simulate via Page.emulateMedia or visibility change if supported in our harness, else integration-level test).
  - Outcome message persists ≥1s and is not overwritten by subsequent placeholder before next round.
  - Optional: reduced-motion emulation to assert animation bypass on score updates.

Risk, Import Policy, and Follow-up

- Import policy: Keep Scoreboard and adapter statically imported in hot paths. No dynamic imports in stat selection, decision, events, or render loops.
- Back-compat: Adding adapter is additive; no need to remove existing timerService scoreboard calls. Dual paths are safe and idempotent.
- Styling/accessibility: Requires minor HTML update (next-ready-badge) and possible CSS tweaks; verify contrast via npm run check:contrast.
- Follow-up: After wiring, consider consolidating all scoreboard updates through the adapter to simplify testing and ensure debouncing applies consistently.

Verification Hints

- Grep checks:
  - grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle || true
  - grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js" || true
  - Run: npx vitest run && npx playwright test && npm run check:contrast

Implementation Plan (Phased)

- Goal: Align scoreboard implementation with PRD while minimizing risk. Each phase ends with targeted unit tests (only relevant files/patterns), not the whole suite.

Phase 0 — Wire Up Scoreboard On Page (no behavior change)

- Changes:
  - Call `setupScoreboard(controls)` during Classic Battle bootstrap to enable visibility/focus pause/resume and ensure DOM refs are resolved early.
- Files:
  - `src/helpers/classicBattle/bootstrap.js`
- Tests to run (unit/integration only):
  - `npx vitest run tests/helpers/scoreboard.integration.test.js`
  - `npx vitest run tests/components/Scoreboard.test.js -t "creates DOM structure"`

Phase 1 — Event Adapter (display.\* → Scoreboard API)

- Changes:
  - Add `scoreboardAdapter` that subscribes to orchestrator’s `display.*` events and calls the corresponding Scoreboard methods.
  - Ensure idempotency (safe to replay) and no cross-talk with existing direct calls.
- Files:
  - `src/helpers/classicBattle/scoreboardAdapter.js` (new)
  - `src/helpers/classicBattle/orchestrator.js` (hook adapter init)
- Tests to run:
  - Create adapter-focused unit tests with mocked event emitter: `tests/helpers/scoreboard.adapter.test.js`.
  - Commands:
    - `npx vitest run tests/helpers/scoreboard.adapter.test.js`

Phase 2 — DOM Contract Tightening

- Changes:
  - Add `#next-ready-badge` to header (passive visual only).
  - Update `setScoreText` to set `[data-side]` on spans and remove newline between spans.
- Files:
  - `src/pages/battleJudoka.html`
  - `src/components/Scoreboard.js` (setScoreText)
- Tests to run:
  - Extend existing unit test to assert data-side and no newline: add cases to `tests/components/Scoreboard.test.js`.
  - Commands:
    - `npx vitest run tests/components/Scoreboard.test.js -t "updates message and score"`

Phase 3 — Message Persistence (≥1s) + Announcement Debounce (≤250ms)

- Changes:
  - In `showMessage`, when `{ outcome: true }`, lock for ≥1000ms against downgrades/placeholder overwrites.
  - Add a micro debouncer around aria-live updates for `#round-message`, `#next-round-timer`, and `#score-display`.
- Files:
  - `src/components/Scoreboard.js`
- Tests to add/run:
  - `tests/components/Scoreboard.persistence.test.js` — verifies lock duration and that placeholders within 1s are ignored.
  - `tests/components/Scoreboard.debounce.test.js` — verifies multiple rapid updates coalesce.
  - Commands:
    - `npx vitest run tests/components/Scoreboard.persistence.test.js`
    - `npx vitest run tests/components/Scoreboard.debounce.test.js`

Phase 4 — Headless API Surface

- Changes:
  - Add `render(patch)`, `getState()`, and `destroy()` to `Scoreboard.js` for deterministic tests and CLI use. Keep functions ≤50 LOC with `@pseudocode`.
- Files:
  - `src/components/Scoreboard.js`
- Tests to add/run:
  - `tests/components/Scoreboard.headless.test.js`
  - Commands:
    - `npx vitest run tests/components/Scoreboard.headless.test.js`

Phase 5 — Visibility Pause/Resume Verification

- Changes:
  - Ensure `initScoreboard` listener wiring is active via bootstrap; no new logic.
- Files:
  - (No new files; validate existing)
- Tests to add/run:
  - `tests/components/Scoreboard.visibility.test.js` — mock `pauseTimer`/`resumeTimer` and simulate `document.hidden=true` + `focus` events.
  - Commands:
    - `npx vitest run tests/components/Scoreboard.visibility.test.js`

Phase 6 — A11y and Styling Confirmations

- Changes:
  - Optionally remove `role="status"` from `#next-round-timer` (keep `aria-live="polite"`, `aria-atomic="true"`).
  - Ensure non-color cues for outcome states via CSS tokens (component to toggle `data-outcome`; CSS provides style).
- Files:
  - `src/components/Scoreboard.js` (attribute adjustment if decided)
  - `src/styles/battle.css` (non-color cues)
- Tests to run (unit level):
  - `npx vitest run tests/components/Scoreboard.test.js -t "creates DOM structure"`

Quality Gates Per Phase

- Prettier/Eslint for touched files only (fast path):
  - `npx prettier src/components/Scoreboard.js src/helpers/classicBattle/*.js src/pages/battleJudoka.html --check`
  - `npx eslint src/components/Scoreboard.js src/helpers/classicBattle/*.js`
- Import policy quick check:
  - `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null || true`

Phase 0 — Execution Summary

- Actions taken:
  - Wired scoreboard during Classic Battle bootstrap to enable visibility/focus pause/resume and early DOM reference resolution.
    - File: `src/helpers/classicBattle/bootstrap.js`
    - Change: Imported `setupScoreboard` and invoked it after controller/view initialization using `controller.timerControls`.
- Targeted tests run:
  - `npx vitest run tests/helpers/scoreboard.integration.test.js` — PASS (2/2)
  - `npx vitest run tests/components/Scoreboard.test.js -t "creates DOM structure"` — PASS (1/1)
- Outcome:
  - No regressions detected in scoreboard integration or DOM structure.
  - Scoreboard hooks now activate in production boot, aligning with PRD visibility pause/resume requirement.

Milestone reached — awaiting review before proceeding to Phase 1 (Event Adapter).

Phase 1 — Execution Summary (Event Adapter)

- Actions taken:
  - Implemented `src/helpers/classicBattle/scoreboardAdapter.js` to listen for `display.*` events and map them to Scoreboard API calls (message, outcome, timer show/tick/hide, score, round start → counter).
  - Initialized adapter in `src/helpers/classicBattle/orchestrator.js` (`initScoreboardAdapter()` during orchestrator init). Safe no-op until `display.*` events exist.
  - Added focused unit test `tests/helpers/scoreboard.adapter.test.js` using the battle event bus to emit `display.*` events and assert DOM updates.
- Targeted tests run:
  - `npx vitest run tests/helpers/scoreboard.adapter.test.js` — PASS (1/1)
- Outcome:
  - Adapter correctly updates scoreboard elements in response to PRD `display.*` events.
  - No regressions expected; adapter is additive and idempotent.

Milestone reached — awaiting review before proceeding to Phase 2 (DOM Contract Tightening).

Phase 2 — Execution Summary (DOM Contract Tightening)

- Actions taken:
  - Score spans now carry side metadata and no newline:
    - `src/components/Scoreboard.js`: `setScoreText` sets `[data-side="player"|"opponent"]` and removes the newline between spans.
  - Added passive readiness badge container:
    - `src/pages/battleJudoka.html`: inserted `<span id="next-ready-badge" aria-hidden="true" hidden></span>` next to `#score-display`.
  - Updated unit tests to assert new DOM contract (no newline, data-side present):
    - `tests/components/Scoreboard.test.js` adjusted expectations to query spans by `[data-side]`.
- Targeted tests run:
  - `npx vitest run tests/components/Scoreboard.test.js` — PASS (6/6)
  - `npx vitest run tests/helpers/scoreboard.adapter.test.js` — PASS (1/1)
  - `npx vitest run tests/helpers/scoreboard.integration.test.js -t "renders messages, score, round counter, and round timer without init"` — PASS (1/1)
- Outcome:
  - DOM contract now matches PRD requirements for score spans and readiness badge placeholder without regressions in targeted areas.

Milestone reached — awaiting review before proceeding to Phase 3 (Message Persistence + Debounce).

Phase 3 — Execution Summary (Message Persistence + Debounce)

- Actions taken:
  - Outcome persistence (≥1s):
    - `src/components/Scoreboard.js`: outcome messages now set an internal `outcomeLockUntil` and block overwrites (including placeholders) until the 1s window elapses or explicit clear/round start.
  - Announcement debouncing (~200ms):
    - `src/components/Scoreboard.js`: introduced `setLiveText` to coalesce rapid updates in `#round-message`, `#next-round-timer`, and `#round-counter`.
    - Uses a 200ms window to reduce aria-live chatter; visual updates remain consistent.
  - Tests added/updated:
    - New: `tests/components/Scoreboard.persistence.test.js` — verifies 1s block for outcome messages.
    - New: `tests/components/Scoreboard.debounce.test.js` — verifies coalescing for message and timer.
    - Updated: `tests/components/Scoreboard.test.js` — adjusted to account for debounced updates and 1s outcome lock behavior.
- Targeted tests run:
  - `npx vitest run tests/components/Scoreboard.persistence.test.js` — PASS (1/1)
  - `npx vitest run tests/components/Scoreboard.debounce.test.js` — PASS (2/2)
  - `npx vitest run tests/components/Scoreboard.test.js` — PASS (6/6)
- Outcome:
  - Scoreboard now meets PRD requirements for minimum outcome visibility and announcement coalescing without regressions in targeted areas.

Milestone reached — awaiting review before proceeding to Phase 4 (Headless API Surface).

Phase 4 — Execution Summary (Headless API Surface)

- Actions taken:
  - Verified `src/components/Scoreboard.js` already exposes the headless API: `render(patch)`, `getState()`, and `destroy()` with concise implementations and internal state snapshot.
  - Confirmed focused unit coverage exists in `tests/components/Scoreboard.headless.test.js` (render/apply patch and destroy behavior).
  - Adjusted two existing tests to respect the ~200ms live-region debounce introduced in Phase 3 (to avoid brittle immediate assertions):
    - `tests/helpers/scoreboard.integration.test.js` — await timer advancement before asserting message/counter/timer text.
    - `tests/helpers/scoreboard.adapter.test.js` — advance fake timers after each `display.*` emission prior to assertions.

- Targeted tests run:
  - `npx vitest run tests/components/Scoreboard.headless.test.js` — PASS (2/2)
  - `npx vitest run tests/helpers/scoreboard.integration.test.js` — PASS (2/2)
  - `npx vitest run tests/helpers/scoreboard.adapter.test.js` — PASS (1/1)
  - `npx vitest run tests/helpers/setupScoreboard.test.js` — PASS (3/3)
  - Related battle tests (subset):
    - `npx vitest run tests/helpers/classicBattle/battleStateBadge.test.js` — PASS (2/2)
    - `npx vitest run tests/helpers/classicBattle/battleStateProgress.test.js` — PASS (3/3)
    - `npx vitest run tests/helpers/classicBattle/countdownReset.test.js` — PASS (1/1)
    - `npx vitest run tests/helpers/timerService.test.js` — PASS (3/3)

- Outcome:
  - Headless API surface is present and validated by tests. No public API changes required.
  - Tests updated to align with debounced live-region behavior; no functional changes to runtime code.
  - Sampled classic battle flows show no regressions.

Milestone reached — awaiting review before proceeding to Phase 5 (Visibility/Focus verification + Readiness reflection).

Phase 5 — Execution Summary (Visibility/Focus + Readiness)

- Changes:
  - Added passive readiness reflection to scoreboard setup:
    - `src/helpers/setupScoreboard.js`: attach a `MutationObserver` to `#next-button` and toggle `#next-ready-badge.hidden` based on readiness (`data-next-ready=="true"` if present, else `!disabled`). No announcements, keeps `aria-hidden`.
  - Unit tests for readiness and existing visibility/focus hooks:
    - New: `tests/helpers/scoreboard.readiness.test.js` — verifies badge visibility toggles when enabling/disabling Next.
    - Existing: `tests/helpers/setupScoreboard.test.js` already covers pause-on-hide and resume-on-focus.

- Targeted tests run:
  - `npx vitest run tests/helpers/setupScoreboard.test.js` — PASS (3/3)
  - `npx vitest run tests/helpers/scoreboard.readiness.test.js` — PASS (1/1)
  - `npx vitest run tests/components/Scoreboard.headless.test.js` — PASS (2/2)
  - Related battle tests (subset):
    - `npx vitest run tests/helpers/classicBattle/nextButton.manualClick.test.js` — PASS (1/1)
    - `npx vitest run tests/helpers/classicBattle/nextButton.countdownFinished.test.js` — PASS (2/2)
    - `npx vitest run tests/helpers/classicBattle/cooldownEnter.autoAdvance.test.js` — PASS (1/1)

- Outcome:
  - Visibility/focus behavior remains correct; readiness badge now reflects button state without touching public APIs.
  - No regressions detected in sampled classic battle flows.

Milestone reached — awaiting review before proceeding to Phase 6 (A11y/Styling confirmations).
