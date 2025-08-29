# Classic Battle — Implementation Plan (battleClassic.html)

## Summary

- Goal: Implement the Classic Battle game mode UI and wiring inside `src/pages/battleClassic.html` per `design/productRequirementsDocuments/prdBattleClassic.md`.
- Scope: Page structure, static imports, UI bindings, scoreboard integration, round flow, timer, controls, accessibility, and observability hooks. No server work.
- Constraint: Do not rely on `battleJudoka.html` specifics; build a self-sufficient page that reuses shared helpers/components.

## Implementation Plan

1. Page Skeleton & Styles

- Header: Include site header with a centered logo block and the scoreboard placeholders: `#round-message`, `#next-round-timer`, `#round-counter`, `#score-display` within a `.battle-header` grid.
- Main: `#battle-area` with two card containers (`#player-card`, `#opponent-card`) and a center column for stat buttons `#stat-buttons`.
- Controls: An `.action-buttons` row containing `#next-button`, `#quit-match-button`, and a help icon `#stat-help` (tooltip target).
- Styles (canonical for this page): link `../styles/fonts.css`, `../styles/base.css`, `../styles/layout.css`, `../styles/components.css`, `../styles/utilities.css`, `../styles/battle.css`.

2. Static Imports (hot path) vs Dynamic (optional)

- Static (hot path, per policy):
  - `src/helpers/classicBattle.js` (re-exports orchestrator, selection, UI helpers)
  - `src/helpers/setupScoreboard.js` (scoreboard wiring)
  - `src/components/Scoreboard.js` is used via `setupScoreboard`
  - `src/helpers/showSnackbar.js` (prompt + countdown surface)
  - `src/components/Button.js`, `src/components/Modal.js` (modal/buttons used immediately at start)
- Dynamic (optional, preload during idle):
  - Heavy, optional help/tooltip modules if not required on first paint
  - Any debug/test-only helpers guarded by feature flags
- Preload strategy: Use an idle callback (or a short timeout post-first-interaction) to `import()` optional modules so subsequent usage is hitch-free.

3. Initialization Flow (on DOMContentLoaded)

- Build the header DOM and call `setupScoreboard({ startCoolDown, pauseTimer, resumeTimer })` from the timer controller facade.
- Initialize Classic Battle bindings idempotently via `__ensureClassicBattleBindings()` to connect UI → engine → UI loop.
- Show “points to win” modal (5/10/15, default 10) using `createModal` and `createButton`.
  - Persist selection in a local storage key (e.g., `battle.pointsToWin`), default to 10 when missing.
  - After selection, start match by dispatching the bootstrap event to the orchestrator/controller.

4. Round Flow (per PRD)

- Start of round:
  - Draw top cards (shared random draw via `src/helpers/randomCard.js`).
  - Render player card immediately; render opponent card obscured (Mystery Card placeholder via `renderJudokaCard()` with `useObscuredStats`).
  - Enable stat buttons; update Scoreboard round counter and clear prior outcome.
  - Display snackbar: “Choose an attribute to challenge!”
- Selection phase (30s):
  - Use timer service through `setupScoreboard.startCountdown(...)` and timer facade to render `#next-round-timer` and snackbar countdown updates.
  - If time expires and `FF_AUTO_SELECT` is on (default), pick a random stat and show `showAutoSelect(<stat>)`.
  - On click, immediately stop timer, highlight chosen stat, and show snackbar `You Picked: <stat>`.
- Resolve round:
  - Short artificial delay to mimic opponent choose; then reveal opponent card stat and resolve via `roundResolver`/`getCardStatValue`.
  - Update score with `updateScore`, message with `showMessage`: “You win the round!”, “Opponent wins the round!”, or “Tie – no score!”.
- Between rounds:
  - Display cooldown countdown (`startCountdown`), enable `Next` to skip the remainder.
  - On `Next`, cancel cooldown and immediately start next round.
- End conditions:
  - First to selected win target (5/10/15; default 10) OR 25 rounds → show match over UI/score and disable interactions.

5. Controls & UI Semantics

- `Next` button: Enabled during cooldown; when selection or cooldown active, a press skips remaining time and advances.
- `Quit Match` button: Opens confirmation modal styled similar to Settings “Restore Defaults”; confirm ends match and records as player loss.
- `#stat-help` icon: Tooltip explaining stat-pick basics; auto-open once per device using storage helper to remember dismissal.
- Accessibility: Ensure WCAG contrast, touch targets ≥44px, proper aria-live for status regions, and keyboard navigation for stat buttons, Next, and Quit.

6. Scoreboard Integration

- Use `setupScoreboard` to initialize references.
- Update via: `showMessage`, `updateScore`, `updateRoundCounter`, and `startCountdown`.
- Timer drift: On drift >2s, display “Waiting…” then restart countdown using Scoreboard’s drift handler.

7. State, Feature Flags, Persistence

- Feature flags: Honor `FF_AUTO_SELECT` (default enabled) and `battleDebugPanel` if present.
- Persist “first visit” help-tooltip dismissal and user-selected points-to-win.
- Maintain `window.__classicBattleState`/`dataset.battleState` updates for test fixtures if already provided by helpers.

8. Error Handling & Edge Cases

- Dataset failures → Surface error in Scoreboard and show retry dialog (reload option) using shared helpers.
- AI selection failures → Fallback to random stat.
- Tooltips failing → Proceed without, log error.
- Navigating away mid-match or unexpected errors → Roll back to last completed round (leveraging existing orchestrator/test hooks if available).

9. Performance & Animation

- Use CSS transforms/opacity for card reveals and result transitions; respect reduced motion.
- Avoid dynamic imports in hot paths (stat click handlers, resolve loops, per-frame operations).
- Preload optional modules during idle to avoid input hitches.

10. Observability & Test Hooks

- Expose and wire `roundPromptPromise`, `countdownStartedPromise`, `roundResolvedPromise`, `roundTimeoutPromise`, and `statSelectionStalledPromise` from `classicBattle/promises.js` for tests.
- Ensure idempotent bindings via `__ensureClassicBattleBindings()` and `__resetClassicBattleBindings()`.
- Keep snackbar/`#round-message` cleared between tests per project conventions.

11. Testing & Programmatic Checks

- Add/align Playwright scenarios for:
  - Round state progress list and header orientation
  - Countdown rendering, skip via `Next`, auto-select stat path
  - End conditions (win, loss, tie, 25-round draw)
  - Quit flow and confirmation
- Run checks: `npx prettier . --check`, `npx eslint .`, `npx vitest run`, `npx playwright test`, `npm run check:contrast`.

## Milestone 1 — Page Scaffold

- Added `src/pages/battleClassic.html` mirroring the Classic Battle layout (header/scoreboard, battle area with stat buttons, controls, debug panel, bottom nav) and statically importing `../helpers/classicBattle/bootstrap.js`.
- Linked required styles: `fonts.css`, `base.css`, `layout.css`, `components.css`, `utilities.css`, `battle.css`.
- Sanity checks:
  - Prettier applied to the new file.
  - ESLint warning noted (HTML ignored by config), no JS issues introduced.
- Next: Update PRD URL, then add `battleDefaults.js` and begin wiring defaults.

## Approach Considerations

- Reuse shared helpers under `src/helpers/classicBattle/*` to avoid duplicating logic; the page script primarily wires DOM to the orchestrator and scoreboard.
- Follow the “Module Loading Policy”: keep stat selection, resolve logic, event dispatchers, and render loops statically imported; only dynamically import optional/help modules and preload during idle.
- Keep DOM and CSS tokens consistent with `battle.css` and button styles; ensure `-webkit-tap-highlight-color: transparent` behavior and reflow on stat select to clear Safari overlay.
- Timer handling relies on the timer service and Scoreboard’s countdown with drift detection; pause/resume on tab visibility changes via the timer facade.
- Ensure tooltips and help flows degrade gracefully.

## Open Questions

- PRD references URL `battleJudoka.html` but this plan targets `battleClassic.html`. Confirm that `battleClassic.html` is the intended canonical page for Classic Battle.
- Confirm the feature flag keys and defaults (e.g., `FF_AUTO_SELECT`, `battleDebugPanel`) and their storage location to ensure correct initialization on this page.
- Should the “points to win” choice persist globally across sessions/pages or be per-session on `battleClassic.html` only?
- Any additional telemetry or analytics events required on match start/end or quit?
- Should the help tooltip auto-open be gated behind a global “first-run” flag or be specific to Classic Battle only?

## Refinements From Review

- Focus trapping in modals: Use `src/components/Modal.js` which already traps focus, supports Escape/backdrop close, and restores focus to the trigger. Ensure all entry modals (points-to-win, quit-confirm) are instantiated with labelledBy/describedBy and that their initial focus targets are the primary action buttons.
- Visibility change handling: Rely on existing visibility handlers in `classicBattle/orchestrator.js` and `timerUtils.createCountdownTimer({ pauseOnHidden: true })`. Ensure the round timer and cooldown timers pause on `document.hidden === true` and resume accurately. Add a quick sanity check in the page bootstrap to set `pauseOnHidden: true` for timers or use the facade that already does this.
- Network/data-loading indicators and timeouts: Use `src/components/Spinner.js` while loading judoka data. Show spinner after a short delay (token `SPINNER_DELAY_MS`). If fetch exceeds a timeout (e.g., 8–10s), surface an error via Scoreboard and a modal with “Retry” (reload or re-fetch) and “Cancel” (abort to home). Reuse `dataUtils.fetchJson` fallback behavior; log errors via the project’s debug logger.
- Localization keys for strings: Define a keys list for user-facing text used by Classic Battle (scoreboard messages, snackbars, modal titles/buttons, tooltips). Route string lookup through a thin `t(key, params)` adapter (backed by a static English map initially). Avoid inlining literals in the page script; use keys to ease future i18n. Implemented in `src/helpers/i18n.js`; integrated into selection prompt and "You Picked" snackbar.

## Proposed APIs (concise)

- setupScoreboard.startCountdown2(durationMs, { onTick(msLeft), onComplete(), id? }) => { cancel() }
  - Reason: Non-blocking, millisecond-based countdown for snackbar + header with deterministic cancel, distinct from existing seconds API. Wraps current scoreboard/timer facilities without breaking callers.

- classicBattle.init({ rootEl, scoreboardFacade, pointsToWin, featureFlags }) => testAPI
  - Reason: Single entry to wire DOM, scoreboard, feature flags, and start the orchestrator. Returns a `testAPI` exposing debug hooks and promises for deterministic tests.

- storage.wrap(key, { fallback: 'session' }) => { get(), set(val), remove() }
  - Reason: Namespaced, safe JSON storage wrapper over `getItem/setItem/removeItem` with a well-scoped key and optional in-memory/session fallback when `localStorage` is unavailable.

## Low-Risk, High-Value Extras (plan to include)

- src/config/battleDefaults.js: Centralize defaults (e.g., `pointsToWin: 10`, `featureFlags: { autoSelect: true, battleDebugPanel: false }`) for page bootstrap and tests.
- Orchestrator testAPI export: Extend existing classic battle exports to expose a small `testAPI` (e.g., `getMachine()`, `waitFor(state)`, `forceSkip()`) for deterministic testing without reaching into internals.
- seedRandom helper: Add `src/helpers/seedRandom.js` with deterministic PRNG (e.g., mulberry32) and wire under a test flag to produce repeatable draws in tests.
- Unit test scaffolding: Add vitest scaffolds for timer pause/resume and auto-select paths (expiry → `roundTimeout`, auto-select snackbar/message, AI delay reveal). Keep them minimal and parallel current test patterns.

## Milestone 4 — A11y and Hotkeys

- Added hidden stat descriptions and `aria-describedby` to each stat button (via `applyStatLabels()`), using i18n keys like `stat.desc.power`.
- Added optional keyboard shortcuts (keys 1..5) behind feature flag `statHotkeys` to trigger stat selection; disabled by default.
- Standardized feature-flag naming in docs/plan: prefer camelCase keys (e.g., `autoSelect`, `statHotkeys`) instead of `FF_*` forms; align with `featureFlags` in settings.

## Milestone 5 — Minimal Tests Added

- `tests/helpers/autoSelectStat.min.test.js`: Verifies `autoSelectStat` announces via `showAutoSelect` and calls the provided `onSelect` with `delayOpponentMessage: true`.
- `tests/helpers/classicBattleBindings.idempotent.test.js`: Ensures `__ensureClassicBattleBindings()` can be called multiple times without throwing.

## Milestone 6 — Defaults Wired via Modal/Bootstrap

- Updated `src/helpers/classicBattle/roundSelectModal.js` to use:
  - `DEFAULT_POINTS_TO_WIN` and `POINTS_TO_WIN_OPTIONS` from `src/config/battleDefaults.js`.
  - Persist and read the user’s selection via `storage.wrap('battle.pointsToWin')`.
- Behavior:
  - On first visit (no stored value), show modal; selection is saved for next time.
  - When `autostart=1` or Test Mode enabled, use `DEFAULT_POINTS_TO_WIN` without showing the modal.
  - On subsequent visits with a saved value (5, 10, 15), skip the modal and start immediately.
- Added tests:
  - `tests/helpers/roundSelectModal.storage.test.js` validates using stored points and skipping the modal.

## Milestone 2 — Defaults Config

- Added `src/config/battleDefaults.js` exporting `POINTS_TO_WIN_OPTIONS`, `DEFAULT_POINTS_TO_WIN`, and `FEATURE_FLAGS` with reasonable defaults aligning to PRD (auto-select enabled by default).
- No functional wiring yet; will integrate during bootstrap and modal work.

## Milestone 3 — Storage + RNG Utilities

- Added `storage.wrap(key, { fallback: 'session' })` to `src/helpers/storage.js`, providing `{ get, set, remove }` with safe JSON handling and in-memory fallback.
- Added `src/helpers/seedRandom.js` with `mulberry32(seed)` and `seededInt(seed, min, max)` for deterministic randomness under test flags.
- Sanity: No breaking changes to existing storage API.

## Milestone 7 — Idle Preload & A11y Smoketest

- Added requestIdleCallback preloader in `src/helpers/classicBattle/bootstrap.js` to dynamically import `../tooltip.js` and `./setupTestHelpers.js` after initial init to reduce jank on first use.
- Added `tests/pages/battleClassic.a11y.smoke.test.js` to assert key ARIA regions exist and stat buttons expose `aria-label` or `aria-describedby`.
- Centralized storage keys in `src/config/storageKeys.js` and updated modal wiring.
- Documented `?autostart=1` query param as a supported way to skip the modal during dev/tests.

## Notes on Feature Flags

- Canonical keys (camelCase): `autoSelect`, `battleDebugPanel`, `enableTestMode`, `battleStateBadge`, `statHotkeys`.
- Older docs may reference `FF_*` names; prefer the keys above.

## Observability

- Added `src/helpers/telemetry.js` with `logEvent(name, payload)`. Currently dispatches a window event and logs to console. Used to record `battle.start` with `{ pointsToWin, source }` (modal/storage).

## Milestone 8 — i18n coverage + visibility tests

- Extended i18n usage:
  - Opponent-choosing snackbar now uses `t('ui.opponentChoosing')` in both static and dynamic handlers.
  - Round select modal title uses `t('modal.roundSelect.title')`.
  - Quit modal title/description/buttons use `t('modal.quit.*')` keys.
- Added small visibilitychange test: `tests/helpers/visibilityTimer.test.js` verifies `createCountdownTimer` pauses when `document.hidden` is true and resumes on visible.

## Milestone 9 — Neutral opponent wait + UI surface test

- Extracted a neutral DOM helper `src/helpers/opponentCardWait.js` exporting `waitForOpponentCard(timeoutMs?, observe?)`.
- Updated Classic Battle bootstrap to import from the neutral helper: `src/helpers/classicBattle/bootstrap.js` now imports `../opponentCardWait.js`.
- Preserved backward compatibility: `src/helpers/battleJudokaPage.js` now re-exports `waitForOpponentCard` from the neutral helper so existing mocks/tests continue to work.
- Added UI assertion test `tests/helpers/classicBattle/outcomeVsComparison.test.js` to verify:
  - Outcome text renders in `#round-message` via `showRoundOutcome()`.
  - Stat comparison renders in `#round-result` via `showStatComparison()` (mocking reduced motion for synchronous behavior).
