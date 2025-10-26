# QA Report: Settings & Feature Flags

## Snapshot

- Flag regressions for Card Inspector, layout outlines, skip cooldown, battle state progress, opponent delay, settings accessibility, and CLI shortcut guidance all remain fixed with automated coverage in place.
- Performance impact from enabling the full debug flag stack is anecdotal; no telemetry or profiling guardrails are in place yet.

## Issue Status Matrix

| Bug                             | Status      | Current Notes                                                                                                           | Evidence                                                                                                                                                  |
| ------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card Inspector flag ineffective | ✅ Verified | JSON inspector panels attach and surface QA markers whenever `enableCardInspector` is active.                           | `tests/helpers/judokaCard.test.js:48`, `tests/helpers/judokaCard.test.js:85`, `playwright/battle-classic/feature-flags.spec.js:207`                       |
| Layout Debug Outlines persist   | ✅ Verified | Flag mutations apply immediately and persist across navigations through the shared display bootstrapper.                | `src/helpers/setupDisplaySettings.js:26`, `src/helpers/settingsPage.js:178`, `tests/helpers/layoutDebugPanel.test.js:9`                                   |
| Skip Round Cooldown ineffective | ✅ Verified | Hot-path handler short-circuits timers, updates DOM markers, and is covered by schedule/next-round unit tests.          | `src/helpers/classicBattle/uiHelpers.js:46`, `src/helpers/classicBattle/timerService.js:476`, `tests/helpers/classicBattle/scheduleNextRound.test.js:454` |
| Battle State Progress stuck     | ✅ Verified | Progress list renders, remaps interrupt states, and follows state transitions end-to-end.                               | `src/helpers/battleStateProgress.js:80`, `playwright/battle-classic/battle-state-progress.spec.js:1`, `tests/helpers/battleStateProgress.test.js:26`      |
| CLI Shortcuts no guidance       | ✅ Verified | Shortcuts panel remains hidden but footer now shows inline CLI command guidance whenever the flag is off.               | `src/pages/battleCLI/init.js:1758`, `tests/pages/battleCLI.onKeyDown.test.js:198`                                                                         |
| Opponent Delay only in CLI      | ✅ Verified | Delay hint dispatches for both Classic Battle and CLI flows.                                                            | `src/pages/battleClassic.init.js:701`, `src/helpers/classicBattle/uiEventHandlers.js:92`                                                                  |
| Auto-Select Progress stuck      | ✅ Verified | New Playwright coverage forces the timeout path and confirms the battle-state progress list advances after auto-select. | `src/helpers/testApi.js:1951`, `playwright/battle-classic/battle-state-progress.spec.js:212`                                                              |
| Settings Accessibility broken   | ✅ Verified | Toggles expose semantic labels, descriptions, and focus treatments throughout Settings and advanced flag renders.       | `src/pages/settings.html:130`, `src/helpers/settings/featureFlagSwitches.js:66`, `src/styles/settings.css:222`                                            |
| Debug Flags slow                | 🟠 Monitor  | Enabling every debug flag still forces synchronous DOM scans; no instrumentation exists to measure real impact.         | `src/helpers/layoutDebugPanel.js:1`, `src/helpers/settings/featureFlagSwitches.js:88`                                                                     |

## Verified Fixes

- **Card Inspector** – Toggling `enableCardInspector` now stamps `data-feature-card-inspector` markers and mounts the inspector panel for each card container; both unit (`tests/helpers/judokaCard.test.js:48`) and Playwright coverage confirm the override wiring (`playwright/battle-classic/feature-flags.spec.js:207`).
- **Layout Debug Outlines** – `setupDisplaySettings` reapplies the flag on load (`src/helpers/setupDisplaySettings.js:26`) and the toggle helper adds/removes outlines as tested in `tests/helpers/layoutDebugPanel.test.js:9`.
- **Skip Round Cooldown** – `skipRoundCooldownIfEnabled` skips the inter-round timer and mirrors DOM state (`src/helpers/classicBattle/uiHelpers.js:46`), while timer-service tests ensure the fast path stays deterministic (`tests/helpers/classicBattle/scheduleNextRound.test.js:454`).
- **Battle State Progress** – The progress list now renders, marks readiness, and remaps interrupts (`src/helpers/battleStateProgress.js:80`); Playwright scenarios cover live state transitions (`playwright/battle-classic/battle-state-progress.spec.js:51`).
- **Auto-Select Progress** – Timeout-driven auto-select now routes through the test API helper, and the progress list is covered by a dedicated Playwright scenario (`src/helpers/testApi.js:1951`, `playwright/helpers/autoSelectHelper.js:1`, `playwright/battle-classic/battle-state-progress.spec.js:212`).
- **Settings Accessibility** – General toggles and feature-flag switches emit `<label>` + `aria-describedby` pairs (`src/pages/settings.html:130`, `src/helpers/settings/featureFlagSwitches.js:66`), and focus styles are defined in `src/styles/settings.css:222`.
- **Opponent Delay Messaging** – Classic Battle reuses the same delay copy that was previously CLI-only (`src/pages/battleClassic.init.js:701`), with shared UI handlers (`src/helpers/classicBattle/uiEventHandlers.js:92`).
- **CLI Shortcuts Guidance** – When `cliShortcuts` is disabled, a footer fallback keeps keyboard tips visible and aligned with the new live-region copy (`src/pages/battleCLI/init.js:1720`, `src/pages/battleCLI.html:200`), with coverage in `tests/pages/battleCLI.onKeyDown.test.js:198` and `playwright/cli-layout.spec.js`.
- **Test Mode Banner Visibility** – Hidden state now collapses the banner when `enableTestMode` is off by adding explicit `[hidden]` overrides with `!important` in the shared styles (`src/styles/battleClassic.css:210`, `src/styles/battle.css:113`), verified by `playwright/battle-classic/feature-flags.spec.js`.

## Items Requiring Follow-Up

### Debug Flags Performance (🟠)

- **Gap**: Enabling every debug flag keeps `toggleLayoutDebugPanel` and `toggleTooltipOverlayDebug` in the critical path without any throttling or profiling.
- **Progress (2025-10-26)**: Added a `DEBUG_PERF` guard to debug flag instrumentation so toggles record buffered durations and optionally log to the console when profiling is enabled (`src/helpers/debugFlagPerformance.js`).
- **Next steps**:
  1. Evaluate moving heavy selectors to idle callbacks or requestAnimationFrame batches.
  2. Consider flag-level rate limiting so toggling multiple debug options does not repeatedly rescan the DOM.

## Observations & Questions

- **Hidden `roundStore` Flag** – Still present as `hidden: true` in `src/data/settings.json`; confirm whether it should remain hidden or be retired.
- **Terminology Drift** – UI labels use “Battle State Progress” while docs mention “Battle State Indicator”; align naming across tooltips, docs, and DOM.

## Opportunities for Improvement

1. **Debug Flag Telemetry** – Capture lightweight profiling while toggling debug flags to quantify the reported slowdown.
2. **Flag Metadata Layer** – Group flags by category/owner in `src/data/settings.json` and render headings + badges within `renderFeatureFlagSwitches` to reduce scrolling fatigue.
3. **Flag Help Microcopy** – Add an inline help icon that pulls from `tooltips.json` so players can read a concise description without external docs.
4. **Role-Based Views** – Honor a persisted role (player/developer/admin) and hide debug-only flags for non-engineering roles to keep Settings approachable.

## Verification Checklist

- `npx vitest run tests/helpers/testApi.test.js`
- `npx vitest run tests/pages/battleCLI.onKeyDown.test.js`
- `npx playwright test playwright/battle-classic/battle-state-progress.spec.js`
- `npx playwright test playwright/cli-layout.spec.js`
- 2025-10-26 – `npx vitest run tests/helpers/debugFlagPerformance.test.js` ✅
- 2025-10-26 – `npx playwright test playwright/battle-classic/feature-flags.spec.js --grep "test mode banner hides when flag disabled"` ✅

## References

- `src/helpers/battleStateProgress.js:80`
- `playwright/battle-classic/battle-state-progress.spec.js:51`
- `src/helpers/testApi.js:1951`
- `playwright/helpers/autoSelectHelper.js:1`
- `playwright/battle-classic/battle-state-progress.spec.js:212`
- `src/helpers/classicBattle/uiHelpers.js:46`
- `src/helpers/classicBattle/timerService.js:476`
- `src/pages/settings.html:130`
- `src/helpers/settings/featureFlagSwitches.js:66`
- `src/styles/settings.css:222`
- `src/pages/battleCLI/init.js:1758`
- `src/pages/battleCLI.html:200`
