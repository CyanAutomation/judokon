JU-DO-KON! Classic Battle – Implementation Plan (TDD)

Workflow follows: context → task contract → implementation plan → validation → delivery.

Context Snapshot

- PRD: design/productRequirementsDocuments/prdBattleClassic.md
- Entry page: src/pages/battleClassic.html (currently empty)
- Existing helpers to reuse (no new hot‑path logic unless missing):
  - Orchestration/UI: src/helpers/classicBattle/\* (orchestrator.js, roundManager.js, selectionHandler.js, roundResolver.js, uiHelpers.js, statButtons.js, timerService.js, scoreboardAdapter.js, debugPanel.js)
  - Engine: src/helpers/BattleEngine.js + src/helpers/battleEngineFacade.js
  - Scoreboard: src/components/Scoreboard.js + src/helpers/setupScoreboard.js
  - Feature flags: src/helpers/featureFlags.js; defaults in src/data/settings.json
  - Rounds/options: src/data/battleRounds.js (PRD mentions), timers utils in src/helpers/timers/\*, snackbar in src/helpers/showSnackbar.js
  - State progress: src/helpers/battleStateProgress.js; badge via feature flag
  - Test hooks/promises: src/helpers/classicBattle/promises.js, testHooks.js, setupTestHelpers.js

Task Contract
{
"inputs": [
"design/productRequirementsDocuments/prdBattleClassic.md",
"src/pages/battleClassic.html",
"src/helpers/classicBattle/*",
"src/components/Scoreboard.js",
"src/helpers/setupScoreboard.js",
"src/helpers/battleEngineFacade.js",
"src/data/settings.json",
"src/data/battleRounds.js"
],
"outputs": [
"src/pages/battleClassic.html",
"tests/classicBattle/*.test.js",
"playwright/battle-classic/*.spec.js",
"docs (if needed): README updates for page-specific usage"
],
"success": [
"eslint: PASS",
"prettier: PASS",
"jsdoc: PASS",
"vitest: PASS (new unit tests)",
"playwright: PASS (new e2e specs)",
"no_unsilenced_console"
],
"errorMode": "ask_on_public_api_change"
}

Import Policy Notes

- Hot paths (stat selection, round decision, event dispatch, render loops): only static imports from classicBattle/\*, battleEngineFacade, setupScoreboard, showSnackbar.
- Optional/heavy modules (e.g., debug panel, state progress UI) may be dynamically imported AND preloaded on idle.
- Preserve feature flag guards: autoSelect, battleStateProgress, enableTestMode, statHotkeys, skipRoundCooldown.

Phased Plan (TDD)

Phase 0 — Page Scaffold

- Goal: Create semantic, accessible HTML skeleton with scoreboard region and main battle containers; no game logic yet.
- Deliverables:
  - src/pages/battleClassic.html scaffold (header with #round-message, #next-round-timer, #round-counter, #score-display; main area for cards, stat buttons, Next, Quit).
  - Static imports prepared via a bootstrap script tag placeholder (no logic executed).
- Tests (unit/E2E):
  - tests/classicBattle/page-scaffold.test.js: loads the HTML (JSDOM) and asserts required IDs exist and have correct aria roles (role="status", aria-live="polite").
  - playwright/battle-classic/smoke.spec.js: page loads, header content visible, no console errors.

Phase 0 — Outcome

- Added tests:
  - tests/classicBattle/page-scaffold.test.js
  - playwright/battle-classic/smoke.spec.js
- Initial run (expected fail): unit tests failed (no markup present).
- Implemented scaffold: src/pages/battleClassic.html with header scoreboard, battle layout, stat buttons container, Next/Quit controls, and persistent snackbar container.
- Unit tests: PASS
  - Command: `npx vitest run tests/classicBattle/page-scaffold.test.js`
- Playwright (file URL, no web server):
  - Spec navigates via `file://` path and asserts nodes are visible.
  - Local command (no server): `npx playwright test -c playwright/local.config.js \
".*battle-classic/smoke.spec.js$"`
  - Note: In this sandbox, starting Playwright or binding a server is restricted; please run the above locally to verify. No app logic is executed yet, so smoke should pass under normal environment.

Phase 1 — Scoreboard + Engine Bootstrap

Phase 0 — Clarification

- The Playwright smoke test did not exist previously; it has now been created at `playwright/battle-classic/smoke.spec.js` to fulfill TDD for the scaffold.
- Adjusted playwright/local.config.js to resolve tests (testDir=".").
- Fixed scaffold visibility for header regions: added CSS `header p { min-height: 1.2em }` and initial score text so Playwright's `toBeVisible` passes.
- Playwright smoke: PASS
  - Command: `npx playwright test -c playwright/local.config.js battle-classic/smoke.spec.js -g "Classic Battle page scaffold"`

- Goal: Initialize Scoreboard and Battle Engine orchestration on page load.
- Implementation:
  - Static import setupScoreboard.initScoreboard and classicBattle/orchestrator.js bootstrap in a small page-specific init module.
  - Ensure body gets data-battle-state from orchestrator.
  - Wire snackbar container early to avoid duplicate IDs.
- Tests:
  - tests/classicBattle/bootstrap.test.js: with JSDOM, init module calls initScoreboard with header nodes; ensure default Scoreboard.getState() returns initial values.
  - playwright/battle-classic/bootstrap.spec.js: data-battle-state present; round counter shows “Round 0” and score “You: 0 Opponent: 0”.

Phase 2 — Points‑to‑Win Modal (Rounds Options)

- Goal: On first visit, show modal for 5/10/15 (default 10), then start match.
- Implementation:
  - Use classicBattle/roundSelectModal.js and src/data/battleRounds.js.
  - Persist choice for session only (PRD open question – start with non‑persistent; add persistence later if decided).
- Tests:
  - tests/classicBattle/round-select.test.js: simulate selection, assert battleEngineFacade.getPointsToWin() reflects choice.
  - playwright/battle-classic/round-select.spec.js: choose 15, see header target text or internal state (via exposed debug/test mode) update before first round.

Phase 2 — Actions & Outcome

- Added failing tests first:
  - Unit: tests/classicBattle/round-select.test.js (clicks Long/15 and asserts engine `getPointsToWin()` = 15 and `body[data-target] = "15"`).
  - E2E: playwright/battle-classic/round-select.spec.js (file://) and server variant playwright/battle-classic/round-select.server.spec.js (http://).
- Implemented wiring:
  - src/pages/battleClassic.init.js now calls `createBattleEngine()` then `initRoundSelectModal(onStart)`; onStart updates `document.body.dataset.target` to selected points.
- Focused runs: PASS
  - Unit: `npx vitest run tests/classicBattle/round-select.test.js`
  - Playwright (server): `npx playwright test playwright/battle-classic/round-select.server.spec.js -g "Classic Battle round select"`
  - Note: file:// spec remains in repo but is blocked by browser CORS for module scripts; the server-based spec verifies the same behavior over http.

Phase 3 — Stat Selection + Timer (30s, pause/resume, auto‑select)

- Goal: Enable stat buttons at selection phase; show countdown in #next-round-timer; auto‑select on expiry when autoSelect flag enabled; pause on tab hidden, resume on focus; drift handling → “Waiting…” and restart.
- Implementation:
  - Reuse classicBattle/statButtons.js, timerService.js, timerUtils.js, scheduler.js, featureFlags.
  - Ensure no await import in selection/decision flow; timer drift check via timerUtils.
- Tests:
  - tests/classicBattle/timer.test.js: fake timers; assert updateTimer called each second; when hidden, pause; on resume, continues; when drift > 2s, “Waiting…” shown once and timer restarts.
  - tests/classicBattle/auto-select.test.js: with autoSelect=true, no click → getRoundTimeoutPromise resolves; with autoSelect=false, no auto resolution.
  - playwright/battle-classic/stat-selection.spec.js: click a stat; buttons disable; opponent reveal begins.

Phase 4 — Opponent Reveal + Round Resolution + Scoreboard

- Goal: After player select or auto‑select, show “Opponent is choosing…” then outcome; update score and round message.
- Implementation:
  - Use classicBattle/roundResolver.js, scoreboardAdapter.js and i18n for messages.
- Tests:
  - tests/classicBattle/round-resolution.test.js: use getRoundResolvedPromise; assert Scoreboard.getState().message.outcome=true and score increments by 1 for win.
  - playwright/battle-classic/scoreboard.spec.js: outcome text visible; score updates, next-round snackbar starts.

Phase 5 — Inter‑Round Cooldown + Next Button

- Goal: Start cooldown after outcome; show one persistent snackbar updating each second; Next button skips cooldown; respect skipRoundCooldown flag in tests/developer mode.
- Implementation:
  - Use roundManager.startCooldown, timerService.onNextButtonClick, CooldownRenderer.
- Tests:
  - tests/classicBattle/cooldown.test.js: fake timers; assert snackbar text updates; Next button enabled only during cooldown; pressing it triggers countdown cancellation and next round start.
  - playwright/battle-classic/next-button.spec.js: play a round, then click Next to skip remaining cooldown.

Phase 6 — End Conditions + Quit/Replay

- Goal: End when points target reached or 25 rounds; show modal with result; Quit confirms, Replay restarts.
- Implementation:
  - Use quitModal.js, roundManager.handleReplay(), battleEngineFacade end events; header/home logo confirmation.
- Tests:
  - tests/classicBattle/end-conditions.test.js: drive engine to win target; assert matchOverPromise resolves; modal shows correct result structure.
  - playwright/battle-classic/quit-flow.spec.js: open quit, confirm, return home; cancel keeps match.

Phase 7 — Accessibility + Flags + Debug Panel

- Goal: Meet WCAG contrast; aria roles; keyboard navigation for stat buttons and quit flows; enable debug panel when enableTestMode; show state progress list when battleStateProgress=true.
- Implementation:
  - Use Scoreboard aria roles; stat buttons aria-describedby; featureFlags to toggle debug/state progress.
- Tests:
  - tests/classicBattle/a11y-attrs.test.js: assert aria-live/roles present; stat buttons get aria-describedby.
  - playwright/battle-state-progress.spec.js (reuse existing pattern) + a new spec to assert debug panel visibility when flag enabled.

Phase 8 — Polish + Telemetry (if applicable)

- Goal: Hook optional audio cues (TBD), ensure deterministic hooks for testers; finalize docs.
- Tests: minimal unit checks for any added helpers; no regression in prior specs.

Validation Plan

- Commands to run before commit:
  - npx prettier . --check
  - npx eslint .
  - npm run check:jsdoc
  - npx vitest run
  - npx playwright test
  - npm run check:contrast
- Quick gates (optional): add npm script check:agents with the repo’s grep checks for hot‑path dynamic imports and unsuppressed console in tests.

Delivery (PR body template)

- Task Contract JSON
- Files changed list with per‑file purpose
- Verification summary: eslint/prettier/jsdoc PASS, vitest X passed/Y failed, playwright PASS/FAIL, contrast PASS
- Risk + follow‑up notes (e.g., open questions: persist points‑to‑win across sessions? AI difficulty exposure?)

Notes on Reuse vs New Code

- Reuse the existing classicBattle orchestrator, round/timer services, and scoreboard; only add page‑specific boot/init code and markup.
- Before adding any new helper, search src/helpers/classicBattle/_ and src/helpers/_; prefer extending via composition or adding small adapters guarded by feature flags.

Phase 1 — Outcome

- Tests added first (failing), then code implemented to satisfy them.
- Implemented: src/pages/battleClassic.init.js initializes scoreboard and seeds visible defaults; battleClassic.html links the init; header shows Round 0 and initial score.
- Unit: PASS — `npx vitest run tests/classicBattle/bootstrap.test.js`
- Playwright: PASS — `npx playwright test -c playwright/local.config.js battle-classic/bootstrap.spec.js -g "Classic Battle bootstrap"`
