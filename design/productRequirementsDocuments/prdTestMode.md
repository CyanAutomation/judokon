# Test Mode PRD

## TL;DR

Test Mode is an internal, developer-facing mode for JU-DO-KON! that enables safe, deterministic testing of game features. It is not intended for regular players and is accessible only via a feature flag in the Settings menu. When enabled, Test Mode bypasses normal progression restrictions and ensures all randomization is reproducible for debugging and automated tests.

### Overview

Test Mode is a deterministic mode for JU-DO-KON! that enables predictable, repeatable game behavior for testing and debugging. When enabled, all randomization (e.g., card draws, stat selection) uses a seeded pseudo-random number generator, ensuring the same sequence of outcomes for a given seed. Test Mode is toggled via the Settings page and is visually indicated in the UI.

### Problem Statement

Test Mode is an internal mode for developers and QA engineers to safely test features, debug issues, and validate game logic. It is not exposed to regular players and is only accessible via a feature flag. Without Test Mode, it is difficult to reproduce bugs, verify fixes, or run automated tests without interference from normal progression or randomization.

### Goals / Success Metrics

- Enable deterministic, repeatable game sessions for debugging and automated tests
- Allow toggling Test Mode via the Settings UI
- Clearly indicate when Test Mode is active
- Ensure all randomization in supported game modes is controlled by the seeded generator

### User Stories

- As a developer, I want to enable Test Mode so that I can reproduce the same game flow for debugging.
- As a QA engineer, I want to run automated tests with predictable outcomes.
- As a user, I want to know when Test Mode is active so I am not confused by non-random behavior.

### Prioritized Functional Requirements

| Priority | Feature                        | Description                                                             |
| -------- | ------------------------------ | ----------------------------------------------------------------------- |
| P1       | Test Mode Toggle in Settings   | Add a switch in the Settings page to enable/disable Test Mode.          |
| P1       | Deterministic Random Generator | When Test Mode is enabled, all randomization uses a seeded generator.   |
| P1       | Test Mode Banner               | Display a visible banner or indicator when Test Mode is active.         |
| P2       | Seed Management                | Allow setting or displaying the current seed value for reproducibility. |
| P2       | Storage/Sync                   | Persist Test Mode state in settings and update UI on storage changes.   |

### Mode Interactions and Automation Hooks

#### Headless Mode Alignment

- When the developer `headless` switch is enabled alongside Test Mode, all animation and cooldown delays collapse to `0`, ensuring deterministic yet instantaneous battle loops for automation.
- The headless helper must remain externally togglable (`setHeadlessMode(true|false)`) so tooling can opt into fast-forward simulations without persisting the state across sessions.
- Headless execution must preserve feature behavior parity—only timing gates change.

#### Combined Usage Patterns

- Documented best practice is to enable both headless and Test Mode during automated battle simulations (e.g., `setHeadlessMode(true); setTestMode(true);`).
- Combined usage must keep RNG determinism intact even while timing delays are removed.
- The Settings UI and developer helpers should make the interaction between these switches explicit to avoid misconfiguration during CI or scripted runs.

#### Readiness Promises and Test Harness Hooks

- Expose and maintain window-scoped promises that signal readiness for Classic Battle (`battleReadyPromise`), stat button reactivation (`statButtonsReadyPromise`), and settings UI availability (`settingsReadyPromise`).
- Playwright fixtures rely on corresponding helpers (`waitForBattleReady`, `waitForSettingsReady`, `waitForBattleState`) to synchronize deterministic flows; the PRD treats these as part of the Test Mode contract.
- Timer management helpers (`timerUtils`, `autoSelectHandlers`, `pauseTimers`, `resumeTimers`) must continue to function when Test Mode is active so that pause/resume flows stay consistent across UI, CLI, and automated harnesses.
- Additional readiness promises in the runtime are standardized to give tests stable synchronization points. Each promise resolves when the UI or data pipeline has completed a meaningful bootstrapping phase, and many also emit DOM-facing signals (data attributes or events).

**Implemented readiness promises and intent**

- `browseJudokaReadyPromise`: Signals the Browse Judoka carousel has rendered (or a fallback state has been established) and the page is safe to query for card layout.
- `randomJudokaReadyPromise`: Signals Random Judoka page setup has finished (feature flags, data preload, draw button wiring) and the DOM is ready for test interactions.
- `homepageReadyPromise`: Signals the home grid has mounted and navigation tiles are available.
- `battleStateProgressReadyPromise`: Signals the battle-state progress list has been rendered (or skipped) so state tracking UI is stable for tests.
- `signatureMoveReadyPromise`: Signals the signature-move UI has completed initial rendering and can be interacted with.
- `roundOptionsReadyPromise`: Signals the Classic Battle UI has surfaced the selectable stat buttons for the current round.
- `nextRoundTimerReadyPromise`: Signals the Classic Battle round timer surface has been primed (including the scoreboard/CLI timer display).
- `quoteReadyPromise`: Signals the meditation quote markup has been rendered and the loader has been dismissed.
- `whenScoreboardReady()` (scoreboard readiness promise): Signals the Classic Battle scoreboard adapter has wired into `RoundStore`, so scoreboard updates are safe to await.

**Readiness signals and test harness usage**

| Helper/module | Promise or hook | Where it resolves | How tests should await | DOM side effects (data/event) |
| --- | --- | --- | --- | --- |
| `src/helpers/browseJudokaPage.js` | `browseJudokaReadyPromise` | `BrowsePageRuntime.markReady()` after carousel render, error fallback, or missing container short-circuit. | `await window.browseJudokaReadyPromise` (or import the promise in unit tests). | `data-browse-judoka-ready="true"` on `<body>`, `document` dispatches `browse-judoka-ready`. |
| `src/helpers/randomJudokaPage.js` | `randomJudokaReadyPromise` | After `onDomReady()` → `initRandomJudokaPage()` completes. Uses `signalRandomJudokaReady()`. | `await window.randomJudokaReadyPromise` (or module export); Playwright can `page.waitForFunction(() => document.body.dataset.randomJudokaReady === "true")`. | `data-random-judoka-ready="true"` on `<body>`, `document` dispatches `random-judoka-ready`. |
| `src/helpers/homePage.js` | `homepageReadyPromise` | `resolveHomepageReady()` once `.game-mode-grid` exists (immediate or via `MutationObserver`). | `await window.homepageReadyPromise`; Playwright can wait on `[data-home-ready="true"]`. | `data-home-ready="true"` on `<body>`, `document` dispatches `home-ready`. |
| `src/helpers/battleStateProgress.js` | `battleStateProgressReadyPromise` | `initBattleStateProgress()` after rendering, skipping, or feature flag exit; also resolved when DOM is unavailable. | `await window.battleStateProgressReadyPromise` before reading `#battle-state-progress` content. | `#battle-state-progress` gets `data-feature-battle-state-ready`, `data-feature-battle-state-count`, `data-feature-battle-state-progress` + `ready` class. |
| `src/helpers/signatureMove.js` | `signatureMoveReadyPromise` | `markSignatureMoveReady()` after signature move UI boot completes. | `await signatureMoveReadyPromise` (module export). | `data-signature-move-ready="true"` on `<body>`, `document` dispatches `signature-move-ready`. |
| `src/helpers/classicBattle/promises.js` (+ `classicBattle/testHooks.js`) | `roundOptionsReadyPromise`, `nextRoundTimerReadyPromise` | `setupPromise()` resolves when the `roundOptionsReady` or `nextRoundTimerReady` battle events fire. Test hooks provide the same window-scoped promises on the global event target. | `await window.roundOptionsReadyPromise` / `await window.nextRoundTimerReadyPromise` (or use the getter helpers in the promises module when available). | No data attributes; uses battle events `roundOptionsReady` / `nextRoundTimerReady`. |
| `src/helpers/quotes/quoteRenderer.js` | `quoteReadyPromise` | `notifyQuoteReady()` after `displayFable()` renders content, hides the loader, and exposes the quote block. | `await window.quoteReadyPromise` (test API surfaces this promise). | `window` dispatches `quote:ready`; quote loader is hidden and quote block is revealed. |
| `src/helpers/classicBattle/scoreboardAdapter.js` | `whenScoreboardReady()` | `initScoreboardAdapter()` assigns the ready promise to `roundStore.wireIntoScoreboardAdapter()` (currently resolves immediately after wiring). | `await whenScoreboardReady()` before asserting scoreboard round counters or score updates. | No data attributes; readiness is about adapter wiring rather than DOM mutations. |

**Related feature PRDs to cross-link when documenting readiness signals**

- `design/productRequirementsDocuments/prdBrowseJudoka.md`
- `design/productRequirementsDocuments/prdRandomJudoka.md`
- `design/productRequirementsDocuments/prdHomePageNavigation.md`
- `design/productRequirementsDocuments/prdBattleScoreboard.md`
- `design/productRequirementsDocuments/prdMeditationScreen.md`

#### Feature Flag Notes

- The `enableTestMode` feature flag controls visibility of developer affordances such as the battle debug panel (live match data, copy-to-clipboard state snapshot).
- Additional feature flags (e.g., `statHotkeys`) that enhance testing ergonomics should reference this PRD and document dependencies on Test Mode being active.
- Any new testing-focused UI surface must include gating guidance in this section before rollout.

### Debug Flag Profiling System & HUD

The debug flag profiling system surfaces performance metrics for feature-flag evaluation and renders a lightweight HUD for reviewing recent alerts. This capability is strictly developer-facing and should remain behind explicit debug activation flags.

#### Activation Flags

Enable profiling through any of the following switches:

- `window.__PROFILE_DEBUG_FLAGS__`
- `window.__DEBUG_PERF__`
- Environment variables: `DEBUG_FLAG_PERF`, `DEBUG_PERF`

#### Metrics + Retention Requirements

- Metrics buffer size: `50`
- Alert threshold: `16ms`
- History retention: `100` entries

#### HUD UI Controls

The HUD must provide:

- Close button (dismiss the HUD)
- Clear button (reset history + alerts)
- Copy alerts button (copy alert history to clipboard)

#### Accessibility Requirements

The alert log must be exposed as a live region:

- `role="log"`
- `aria-live="polite"`

#### Implementation Anchors

Reference implementations:

- `src/helpers/debugFlagPerformance.js`
- `src/helpers/debugFlagHud.js`

### Acceptance Criteria

- Test Mode can be enabled/disabled via the Settings page toggle (feature flag only).
- When enabled, all randomization in Classic Battle uses the seeded generator.
- A visible banner or indicator appears when Test Mode is active.
- Test Mode bypasses normal progression restrictions (e.g., unlocks all cards, disables win/loss gating, allows direct access to all game modes for testing).
- Test Mode state persists across page reloads and updates in real time if changed in another tab.
- (P2) The current seed value can be queried by helpers or displayed in the UI.
- Disabling Test Mode restores normal randomization.

### Non-Functional Requirements / Design Considerations

- Test Mode must not affect normal gameplay when disabled.
- Banner/indicator must be accessible and clearly visible.
- All code must be covered by unit and UI tests.
- No performance degradation in normal or test mode.

### Dependencies and Open Questions

- Depends on settings storage and feature flag infrastructure.
- Relies on all randomization in supported modes being routed through the seeded generator.
- (Open) UI for setting custom seed value is not yet implemented.
