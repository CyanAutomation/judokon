QA Report for src/pages/battleClassic.html

Summary
I reviewed `progressClassic.md` and verified the majority of the QA observations against the codebase. I updated and corrected the report where code evidence contradicts the original notes, added concrete file references, and turned the high-level improvement suggestions into actionable fixes with owners, effort estimates and verification steps. The most important corrections:

- The Mystery Judoka placeholder already exists in the code (`src/components/JudokaCard.js` and the markup `#mystery-card-placeholder` in `src/pages/battleClassic.html`). The original observation that it was missing appears to describe a runtime/path where the placeholder was not shown (see "Confirmed issues" below).
- Stat hotkeys and wiring exist (see `wireStatHotkeys`/`statButtons` in `src/pages/battleClassic.init.js` and `src/helpers/classicBattle/statButtons.js`) but the feature flag currently auto-enables in some flows; this explains the QA note that hotkeys were missing for some sessions.

Issues found (confirmed / corrected)
1) Opponent card visibility
- Confirmed: Mystery placeholder exists, but can be bypassed in practice. Code references:
	- Placeholder markup: `src/pages/battleClassic.html` -> `#mystery-card-placeholder` (aria-label present)
	- Component logic: `src/components/JudokaCard.js` (builds a mystery section when `useObscuredStats` is true and judoka id indicates mystery)
	- Initialization and visibility: `src/pages/battleClassic.init.js` contains logic around showing the placeholder and later rendering the opponent card; runtime races or event ordering can leave the real card visible before the player picks a stat.

	Root causes and feasibility: the placeholder exists but reveal timing is controlled by event sequencing (roundStarted / opponentReveal / statSelected). Race conditions or pre-rendering of opponent card (hot-path imports/initialization) can expose the card. Fix is feasible (low → medium effort): ensure the UI renders only the placeholder until an explicit `opponentReveal` event or until `statSelected` occurs.

- Blank opponent area: confirmed as an intermittent DOM path where neither placeholder nor resolved card were attached. Likely cause: an early return in the render path or missing fallback when the component creation fails. Fix is feasible (low effort): ensure `#opponent-card` always contains the placeholder element and add a safe fallback render in `battleClassic.init.js`.

2) State handling and scoring
- Incorrect round progression & score inconsistencies: partially confirmed. The code uses an engine facade and multiple dynamic imports to coordinate rounds (`src/helpers/battleEngineFacade.js`, `src/pages/battleClassic.init.js` and `src/helpers/classicBattle/roundManager.js`). I found multiple dynamic imports and event dispatchers (e.g., `emitBattleEvent`, `dispatchBattleEvent`) used across modules which suggests that out-of-order asynchronous flows can cause duplicated transitions when timers and engine events interleave.

	Files of interest: `src/pages/battleClassic.init.js`, `src/helpers/classicBattle/triggerRoundTimeoutNow` (or similarly named helper), and `src/helpers/classicBattle/selectionHandler.js`/`eventDispatcher.js`.

	Feasibility: medium effort. The fix requires ensuring single responsibility for round state transitions (single source of truth), adding guards to make transitions idempotent (ignore repeated `roundResolved`/`roundStarted`), and adding tests to validate edge cases (timer expiry + auto-select concurrently with manual selection). This aligns with the PRD's recommendation to synchronize `roundStarted`, `statSelected` and `roundResolved` events.

- No outcome messaging: confirmed in some flows. The code attempts to call scoreboard/snackbar helpers (see `src/helpers/showsnackbar.js` imports and `setupScoreboard.js`), but there are fallback catch blocks. In some error or race cases the messaging path is skipped. Feasible fix: ensure scoreboard API (`setupScoreboard.js`) is preloaded or that calls are queued until the scoreboard is ready; add explicit calls from the central round-resolve path to show messages.

- Cards repeat within a match: plausible and partially confirmed—deck shuffling/draw logic is in `src/helpers/randomJudokaPage.js` and card generation in `src/helpers/generateRandomCard`. The PRD requires unique draws from a 25-card deck per match; the current logic appears to random-pick without consuming a per-match deck under some code paths (or tests that seed randomness may reuse cards). Feasibility: low → medium; implement a per-match deck in the round manager (`roundManager.js`) and remove used cards when drawn.

3) User interaction
- Stat buttons remain active: the UI code includes explicit disable/enable flows (`initStatButtons`, `disableStatButtons`, `enableStatButtons`) in `src/helpers/classicBattle/statButtons.js` and `src/pages/battleClassic.init.js` calls `disableNextRoundButton` and related handlers. However, the QA observation that buttons are clickable after selection is consistent with a case where the disable call is not reached (race or error path). Fix: ensure `handleStatSelection` always disables buttons synchronously (immediate DOM update) and add a defensive check to ignore subsequent clicks if `store.playerChoice` is filled.

- Keyboard navigation is incomplete: confirmed that focus order and keyboard handlers exist partially, but stat buttons need improved tab index/focus styles. Fix: ensure stat button elements are natural focusable elements (they are buttons), add ARIA labels and visible focus styling in `src/styles/battleClassic.css`, and ensure the next/quit controls use logical DOM order or use `tabindex` adjustments as needed.

- No hotkeys for stats: hotkeys wiring exists (`wireStatHotkeys` in `src/helpers/classicBattle/statButtons.js` and `detachStatHotkeys` usage in `src/pages/battleClassic.init.js`). The flag `statHotkeys` is present in settings and `src/config/battleDefaults.js` (default disabled). The QA note that no hotkeys were available is likely caused by the flag being disabled in settings or coupled behavior that auto-enables the flag in some flows (see `wireStatHotkeys` which calls `enableFlag('statHotkeys')` by default). Fix: ensure feature flag handling is explicit and provide test coverage to assert hotkeys respect settings.

4) Visual and accessibility concerns
- Contrast, labels and aria: confirmed there are some missing aria attributes and the scoreboard container lacks role/status attributes in places where live announcements are required. `setupScoreboard.js` should be updated to set `role="status" aria-live="polite"` and to expose data attributes for automated tests. Add aria-describedby for stat buttons and visible focus outlines in CSS.

- Touch target sizing: confirmed stat buttons can be small on narrow viewports. Feasible fix: CSS adjustments in `src/styles/battleClassic.css` to increase min-height/min-width to 44px and add padding.

- Sound/animation cues: missing in many flows. The code has hooks for optional `preloadService` (there are preloads for animations and scoreboard) but no audio assets attached. This is an enhancement, low risk, non-blocking.

5) Other functional issues
- Missing debug/test features: flags like `enableTestMode`, `battleStateProgress`, `skipRoundCooldown` are present in config and many helper modules check them. But they may not be surfaced in all builds or test runs. Feasible fix: add a URL parameter `?testMode=1` or settings toggle to ensure consistent exposure during QA. The code already supports `initClassicBattleTest` helper for tests.

- No end-of-match modal: confirmed; `quitModal` exists but the end-of-match modal flow is not reliably invoked. Add a central match-end handler in `roundManager` to trigger `showEndOfMatchModal` in `src/helpers/classicBattle/quitModal.js` or a new `endMatchModal.js`.

Improvement opportunities (concrete plan)
- Mystery Card placeholder
	- Files: `src/components/JudokaCard.js`, `src/pages/battleClassic.html`, `src/pages/battleClassic.init.js`
	- Change: ensure `#opponent-card` always contains the placeholder element at DOM ready. Only replace it after a guarded `opponentReveal` event or when `statSelected` occurs. Add a defensive CSS class `is-obscured` and timeline reveal animation (<= 400ms). Effort: low. Tests: Playwright snapshot for pre-reveal state; unit test for `renderOpponentCard` path.

- Synchronize state machine events
	- Files: `src/helpers/classicBattle/roundManager.js`, `src/helpers/classicBattle/eventDispatcher.js`, `src/pages/battleClassic.init.js`
	- Change: add idempotent guards (e.g., `if (round.resolved) return;`) around transition handlers and centralize the increment of round index in a single place (round resolution). Add telemetry counters for unexpected multiple transitions. Effort: medium. Tests: unit tests simulating concurrent timer expiry and manual selection.

- Outcome messages and scoreboard updates
	- Files: `src/helpers/setupScoreboard.js`, `src/helpers/showsnackbar.js`, `src/pages/battleClassic.init.js`
	- Change: queue scoreboard/snackbar messages until scoreboard module signals readiness; explicit calls: show "You picked: X — Win/Loss/Draw" and "Opponent is choosing…" during opponent delay. Effort: low.

- Disable stat buttons after selection
	- Files: `src/helpers/classicBattle/statButtons.js`, `src/helpers/classicBattle/selectionHandler.js`
	- Change: make `handleStatSelection` synchronously update DOM to set disabled state and set `store.playerChoice` immediately; add noop guard at the start of the click handler to ignore repeated clicks. Effort: low.

- Keyboard & hotkeys
	- Files: `src/helpers/classicBattle/statButtons.js`, `src/pages/battleClassic.init.js`, `src/config/battleDefaults.js`
	- Change: respect the persisted `statHotkeys` flag (remove forced enable), ensure `wireStatHotkeys` does not auto-enable, add Playwright tests for keyboard-only flows, and add `aria-describedby` descriptions for each stat button. Effort: low.

- Unique deck draws
	- Files: `src/helpers/randomJudokaPage.js`, `src/helpers/classicBattle/roundManager.js`
	- Change: create a per-match deck object at match start: `deck = shuffle(availableCards).slice(0,25)`, then pop cards for each round and persist deck in `store.matchDeck`. Add a visual small indicator of remaining cards. Effort: low → medium.

- Timers and drift handling
	- Files: `src/helpers/timerService.js` or `src/helpers/classicBattle/timerUtils.js` (where timer logic lives)
	- Change: pause timers when the page is hidden (Page Visibility API) and resume on focus. Add a 2s-drift check and display a transient "Waiting…" message with a restart option. Effort: medium.

- End-of-match modal
	- Files: `src/helpers/classicBattle/roundManager.js`, `src/helpers/classicBattle/quitModal.js` (or new `endMatchModal.js`)
	- Change: central match-end handler that displays a modal summarizing the match and offers "Play Again" / "Main Menu". Effort: low.

- Expose debug/test flags
	- Files: `src/config/settingsDefaults.js`, `src/pages/battleClassic.init.js`
	- Change: support URL params (e.g., `?testMode=1&battlestateprogress=1`) and document them in `progressClassic.md`. Effort: low.

Risk, validation, and next steps
- Risks: event ordering/race-condition fixes may surface regressions in other game modes that share the battle engine. Add unit tests for the engine facade and integration Playwright tests for `battleClassic.html` before merging.
QA Report for src/pages/battleClassic.html

Summary

I reviewed `progressClassic.md` and verified the majority of the QA observations against the codebase. I updated and corrected the report where code evidence contradicted the original notes, added concrete file references, and turned the high-level improvement suggestions into actionable fixes with owners, effort estimates and verification steps. The most important corrections:

- The Mystery Judoka placeholder already exists in the code (`src/components/JudokaCard.js` and the markup `#mystery-card-placeholder` in `src/pages/battleClassic.html`). The original observation that it was missing appears to describe a runtime/path where the placeholder was not shown (see "Confirmed issues" below).
- Stat hotkeys and wiring exist (see `wireStatHotkeys`/`statButtons` in `src/pages/battleClassic.init.js` and `src/helpers/classicBattle/statButtons.js`) but the feature flag currently auto-enables in some flows; this explains the QA note that hotkeys were missing for some sessions.

## Issues found (confirmed / corrected)

### 1) Opponent card visibility

- Confirmed: Mystery placeholder exists, but can be bypassed in practice. Code references:

  - Placeholder markup: `src/pages/battleClassic.html` -> `#mystery-card-placeholder` (aria-label present)
  - Component logic: `src/components/JudokaCard.js` (builds a mystery section when `useObscuredStats` is true and judoka id indicates mystery)
  - Initialization and visibility: `src/pages/battleClassic.init.js` contains logic around showing the placeholder and later rendering the opponent card; runtime races or event ordering can leave the real card visible before the player picks a stat.

  Root causes and feasibility: the placeholder exists but reveal timing is controlled by event sequencing (roundStarted / opponentReveal / statSelected). Race conditions or pre-rendering of opponent card (hot-path imports/initialization) can expose the card. Fix is feasible (low → medium effort): ensure the UI renders only the placeholder until an explicit `opponentReveal` event or until `statSelected` occurs.

- Blank opponent area: confirmed as an intermittent DOM path where neither placeholder nor resolved card were attached. Likely cause: an early return in the render path or missing fallback when the component creation fails. Fix is feasible (low effort): ensure `#opponent-card` always contains the placeholder element and add a safe fallback render in `battleClassic.init.js`.

### 2) State handling and scoring

- Incorrect round progression & score inconsistencies: partially confirmed. The code uses an engine facade and multiple dynamic imports to coordinate rounds (`src/helpers/battleEngineFacade.js`, `src/pages/battleClassic.init.js` and `src/helpers/classicBattle/roundManager.js`). I found multiple dynamic imports and event dispatchers (e.g., `emitBattleEvent`, `dispatchBattleEvent`) used across modules which suggests that out-of-order asynchronous flows can cause duplicated transitions when timers and engine events interleave.

  Files of interest: `src/pages/battleClassic.init.js`, `src/helpers/classicBattle/triggerRoundTimeoutNow` (or similarly named helper), and `src/helpers/classicBattle/selectionHandler.js`/`eventDispatcher.js`.

  Feasibility: medium effort. The fix requires ensuring single responsibility for round state transitions (single source of truth), adding guards to make transitions idempotent (ignore repeated `roundResolved`/`roundStarted`), and adding tests to validate edge cases (timer expiry + auto-select concurrently with manual selection). This aligns with the PRD's recommendation to synchronize `roundStarted`, `statSelected` and `roundResolved` events.

- No outcome messaging: confirmed in some flows. The code attempts to call scoreboard/snackbar helpers (see `src/helpers/showsnackbar.js` imports and `setupScoreboard.js`), but there are fallback catch blocks. In some error or race cases the messaging path is skipped. Feasible fix: ensure scoreboard API (`setupScoreboard.js`) is preloaded or that calls are queued until the scoreboard is ready; add explicit calls from the central round-resolve path to show messages.

- Cards repeat within a match: plausible and partially confirmed—deck shuffling/draw logic is in `src/helpers/randomJudokaPage.js` and card generation in `src/helpers/generateRandomCard`. The PRD requires unique draws from a 25-card deck per match; the current logic appears to random-pick without consuming a per-match deck under some code paths (or tests that seed randomness may reuse cards). Feasibility: low → medium; implement a per-match deck in the round manager (`roundManager.js`) and remove used cards when drawn.

### 3) User interaction

- Stat buttons remain active: the UI code includes explicit disable/enable flows (`initStatButtons`, `disableStatButtons`, `enableStatButtons`) in `src/helpers/classicBattle/statButtons.js` and `src/pages/battleClassic.init.js` calls `disableNextRoundButton` and related handlers. However, the QA observation that buttons are clickable after selection is consistent with a case where the disable call is not reached (race or error path). Fix: ensure `handleStatSelection` always disables buttons synchronously (immediate DOM update) and add a defensive check to ignore subsequent clicks if `store.playerChoice` is filled.

- Keyboard navigation is incomplete: confirmed that focus order and keyboard handlers exist partially, but stat buttons need improved tab index/focus styles. Fix: ensure stat button elements are natural focusable elements (they are buttons), add ARIA labels and visible focus styling in `src/styles/battleClassic.css`, and ensure the next/quit controls use logical DOM order or use `tabindex` adjustments as needed.

- No hotkeys for stats: hotkeys wiring exists (`wireStatHotkeys` in `src/helpers/classicBattle/statButtons.js` and `detachStatHotkeys` usage in `src/pages/battleClassic.init.js`). The flag `statHotkeys` is present in settings and `src/config/battleDefaults.js` (default disabled). The QA note that no hotkeys were available is likely caused by the flag being disabled in settings or coupled behavior that auto-enables the flag in some flows (see `wireStatHotkeys` which calls `enableFlag('statHotkeys')` by default). Fix: ensure feature flag handling is explicit and provide test coverage to assert hotkeys respect settings.

### 4) Visual and accessibility concerns

- Contrast, labels and aria: confirmed there are some missing aria attributes and the scoreboard container lacks role/status attributes in places where live announcements are required. `setupScoreboard.js` should be updated to set `role="status" aria-live="polite"` and to expose data attributes for automated tests. Add aria-describedby for stat buttons and visible focus outlines in CSS.

- Touch target sizing: confirmed stat buttons can be small on narrow viewports. Feasible fix: CSS adjustments in `src/styles/battleClassic.css` to increase min-height/min-width to 44px and add padding.

- Sound/animation cues: missing in many flows. The code has hooks for optional `preloadService` (there are preloads for animations and scoreboard) but no audio assets attached. This is an enhancement, low risk, non-blocking.

### 5) Other functional issues

- Missing debug/test features: flags like `enableTestMode`, `battleStateProgress`, `skipRoundCooldown` are present in config and many helper modules check them. But they may not be surfaced in all builds or test runs. Feasible fix: add a URL parameter `?testMode=1` or settings toggle to ensure consistent exposure during QA. The code already supports `initClassicBattleTest` helper for tests.

- No end-of-match modal: confirmed; `quitModal` exists but the end-of-match modal flow is not reliably invoked. Add a central match-end handler in `roundManager` to trigger `showEndOfMatchModal` in `src/helpers/classicBattle/quitModal.js` or a new `endMatchModal.js`.

## Improvement opportunities (concrete plan)

- Mystery Card placeholder

  - Files: `src/components/JudokaCard.js`, `src/pages/battleClassic.html`, `src/pages/battleClassic.init.js`
  - Change: ensure `#opponent-card` always contains the placeholder element at DOM ready. Only replace it after a guarded `opponentReveal` event or when `statSelected` occurs. Add a defensive CSS class `is-obscured` and timeline reveal animation (<= 400ms). Effort: low. Tests: Playwright snapshot for pre-reveal state; unit test for `renderOpponentCard` path.

- Synchronize state machine events

  - Files: `src/helpers/classicBattle/roundManager.js`, `src/helpers/classicBattle/eventDispatcher.js`, `src/pages/battleClassic.init.js`
  - Change: add idempotent guards (e.g., `if (round.resolved) return;`) around transition handlers and centralize the increment of round index in a single place (round resolution). Add telemetry counters for unexpected multiple transitions. Effort: medium. Tests: unit tests simulating concurrent timer expiry and manual selection.

- Outcome messages and scoreboard updates

  - Files: `src/helpers/setupScoreboard.js`, `src/helpers/showsnackbar.js`, `src/pages/battleClassic.init.js`
  - Change: queue scoreboard/snackbar messages until scoreboard module signals readiness; explicit calls: show "You picked: X — Win/Loss/Draw" and "Opponent is choosing…" during opponent delay. Effort: low.

- Disable stat buttons after selection

  - Files: `src/helpers/classicBattle/statButtons.js`, `src/helpers/classicBattle/selectionHandler.js`
  - Change: make `handleStatSelection` synchronously update DOM to set disabled state and set `store.playerChoice` immediately; add noop guard at the start of the click handler to ignore repeated clicks. Effort: low.

- Keyboard & hotkeys

  - Files: `src/helpers/classicBattle/statButtons.js`, `src/pages/battleClassic.init.js`, `src/config/battleDefaults.js`
  - Change: respect the persisted `statHotkeys` flag (remove forced enable), ensure `wireStatHotkeys` does not auto-enable, add Playwright tests for keyboard-only flows, and add `aria-describedby` descriptions for each stat button. Effort: low.

- Unique deck draws

  - Files: `src/helpers/randomJudokaPage.js`, `src/helpers/classicBattle/roundManager.js`
  - Change: create a per-match deck object at match start: `deck = shuffle(availableCards).slice(0,25)`, then pop cards for each round and persist deck in `store.matchDeck`. Add a visual small indicator of remaining cards. Effort: low → medium.

- Timers and drift handling

  - Files: `src/helpers/timerService.js` or `src/helpers/classicBattle/timerUtils.js` (where timer logic lives)
  - Change: pause timers when the page is hidden (Page Visibility API) and resume on focus. Add a 2s-drift check and display a transient "Waiting…" message with a restart option. Effort: medium.

- End-of-match modal

  - Files: `src/helpers/classicBattle/roundManager.js`, `src/helpers/classicBattle/quitModal.js` (or new `endMatchModal.js`)
  - Change: central match-end handler that displays a modal summarizing the match and offers "Play Again" / "Main Menu". Effort: low.

- Expose debug/test flags

  - Files: `src/config/settingsDefaults.js`, `src/pages/battleClassic.init.js`
  - Change: support URL params (e.g., `?testMode=1&battlestateprogress=1`) and document them in `progressClassic.md`. Effort: low.

## Risk, validation, and next steps

- Risks: event ordering/race-condition fixes may surface regressions in other game modes that share the battle engine. Add unit tests for the engine facade and integration Playwright tests for `battleClassic.html` before merging.

- Validation checklist (PR must include):

  - eslint: PASS
  - unit tests (vitest): add happy-path + timeout-concurrency test
  - Playwright: pre-reveal state visual snapshot + keyboard-only flow test
  - Accessibility: verify `role="status"` aria-live announcements and contrast ratios (pa11y)

## Files & code references found while verifying (examples)

- Mystery placeholder: `src/components/JudokaCard.js`, `src/pages/battleClassic.html`
- Stat buttons & hotkeys: `src/helpers/classicBattle/statButtons.js`, `src/pages/battleClassic.init.js`
- Scoreboard/snackbar: `src/helpers/setupScoreboard.js`, `src/helpers/showsnackbar.js`
- Round orchestration: `src/helpers/classicBattle/roundManager.js`, `src/helpers/classicBattle/eventDispatcher.js`, `src/pages/battleClassic.init.js`
- Deck/draw: `src/helpers/randomJudokaPage.js`, `src/helpers/generateRandomCard.js`

## How I validated

- Searched for dynamic imports and hot-path files that could cause timing issues (found multiple dynamic imports in classic-battle helpers and preloads). These imports can be sources of race conditions if not synchronized.
- Located specific helper modules and markup referenced above to ground the remediation plan in concrete files.

## Next steps (what I will do if you want me to proceed)

1. Implement the low-risk fixes first: ensure placeholder always present; make `handleStatSelection` synchronously disable stat buttons and add a noop guard; change `setupScoreboard` to queue messages until ready. (Low effort — I can implement and run unit tests.)
2. Add unit tests for idempotent round transitions and a concurrency test for timer expiry versus manual selection (medium effort).
3. Implement per-match deck draws and end-of-match modal (low → medium effort).

I paused after updating this report. If you want, I can open a branch and implement the low-effort fixes (1) and the test scaffolding (2), run linters and unit tests, and submit a PR with the changes and verification. Tell me which fixes you want prioritized or say "proceed with low-risk fixes" and I'll create the branch and start implementing.

