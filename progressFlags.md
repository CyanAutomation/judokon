# QA Report: Settings & Feature Flags

## Snapshot
- Flag regressions for Card Inspector, layout outlines, skip cooldown, battle state progress, opponent delay, and settings accessibility all remain fixed based on current code and automated coverage.
- Two UX gaps still need attention: CLI shortcuts offer no visible guidance when disabled, and the battle-state progress list lacks an automated check that covers auto-select expiry.
- Performance impact from enabling the full debug flag stack is anecdotal; no telemetry or profiling guardrails are in place yet.

## Issue Status Matrix
| Bug | Status | Current Notes | Evidence |
| --- | --- | --- | --- |
| Card Inspector flag ineffective | ✅ Verified | JSON inspector panels attach and surface QA markers whenever `enableCardInspector` is active. | `tests/helpers/judokaCard.test.js:48`, `tests/helpers/judokaCard.test.js:85`, `playwright/battle-classic/feature-flags.spec.js:207` |
| Layout Debug Outlines persist | ✅ Verified | Flag mutations apply immediately and persist across navigations through the shared display bootstrapper. | `src/helpers/setupDisplaySettings.js:26`, `src/helpers/settingsPage.js:178`, `tests/helpers/layoutDebugPanel.test.js:9` |
| Skip Round Cooldown ineffective | ✅ Verified | Hot-path handler short-circuits timers, updates DOM markers, and is covered by schedule/next-round unit tests. | `src/helpers/classicBattle/uiHelpers.js:46`, `src/helpers/classicBattle/timerService.js:476`, `tests/helpers/classicBattle/scheduleNextRound.test.js:454` |
| Battle State Progress stuck | ✅ Verified | Progress list renders, remaps interrupt states, and follows state transitions end-to-end. | `src/helpers/battleStateProgress.js:80`, `playwright/battle-classic/battle-state-progress.spec.js:1`, `tests/helpers/battleStateProgress.test.js:26` |
| CLI Shortcuts no guidance | 🟡 Needs UX copy | Feature flag hides the shortcuts panel without providing visible fallback messaging; only the screen-reader alert updates. | `src/pages/battleCLI/init.js:1760`, `src/pages/battleCLI.html:200` |
| Opponent Delay only in CLI | ✅ Verified | Delay hint dispatches for both Classic Battle and CLI flows. | `src/pages/battleClassic.init.js:701`, `src/helpers/classicBattle/uiEventHandlers.js:92` |
| Auto-Select Progress stuck | 🟡 Needs targeted test | Auto-select logic fires and updates scores, but progress timeline lacks coverage for timeout-driven state changes. | `tests/helpers/classicBattle/statSelectionTiming.test.js:1`, `playwright/battle-classic/battle-state-progress.spec.js:74` |
| Settings Accessibility broken | ✅ Verified | Toggles expose semantic labels, descriptions, and focus treatments throughout Settings and advanced flag renders. | `src/pages/settings.html:130`, `src/helpers/settings/featureFlagSwitches.js:66`, `src/styles/settings.css:222` |
| Debug Flags slow | 🟠 Monitor | Enabling every debug flag still forces synchronous DOM scans; no instrumentation exists to measure real impact. | `src/helpers/layoutDebugPanel.js:1`, `src/helpers/settings/featureFlagSwitches.js:88` |

## Verified Fixes
- **Card Inspector** – Toggling `enableCardInspector` now stamps `data-feature-card-inspector` markers and mounts the inspector panel for each card container; both unit (`tests/helpers/judokaCard.test.js:48`) and Playwright coverage confirm the override wiring (`playwright/battle-classic/feature-flags.spec.js:207`).
- **Layout Debug Outlines** – `setupDisplaySettings` reapplies the flag on load (`src/helpers/setupDisplaySettings.js:26`) and the toggle helper adds/removes outlines as tested in `tests/helpers/layoutDebugPanel.test.js:9`.
- **Skip Round Cooldown** – `skipRoundCooldownIfEnabled` skips the inter-round timer and mirrors DOM state (`src/helpers/classicBattle/uiHelpers.js:46`), while timer-service tests ensure the fast path stays deterministic (`tests/helpers/classicBattle/scheduleNextRound.test.js:454`).
- **Battle State Progress** – The progress list now renders, marks readiness, and remaps interrupts (`src/helpers/battleStateProgress.js:80`); Playwright scenarios cover live state transitions (`playwright/battle-classic/battle-state-progress.spec.js:51`).
- **Settings Accessibility** – General toggles and feature-flag switches emit `<label>` + `aria-describedby` pairs (`src/pages/settings.html:130`, `src/helpers/settings/featureFlagSwitches.js:66`), and focus styles are defined in `src/styles/settings.css:222`.
- **Opponent Delay Messaging** – Classic Battle reuses the same delay copy that was previously CLI-only (`src/pages/battleClassic.init.js:701`), with shared UI handlers (`src/helpers/classicBattle/uiEventHandlers.js:92`).

## Items Requiring Follow-Up
### CLI Shortcuts No Guidance (🟡)
- **Gap**: When `cliShortcuts` is false the panel is hidden (`src/pages/battleCLI.html:200`), leaving keyboard users without on-screen instructions; the live-region message set in `SHORTCUT_HINT_MESSAGES` (`src/pages/battleCLI/init.js:1760`) is not visible.
- **Next steps**:
  1. Inject a bottom-line hint via `showBottomLine` when shortcuts are disabled.
  2. Mirror the hint in the prompt placeholder (`#cli-prompt`) for discoverability.
  3. Add Playwright coverage that toggles the flag and asserts the fallback copy.

### Auto-Select Progress Coverage (🟡)
- **Gap**: Auto-select flows update the score and snackbar (`tests/helpers/classicBattle/statSelectionTiming.test.js:24`), but no automated check confirms the battle-state progress list advances after the timer expires.
- **Next steps**:
  1. Extend `playwright/battle-classic/battle-state-progress.spec.js` with a scenario that lets the stat timer lapse and verifies `data-feature-battle-state-active`.
  2. Expose a test hook to shorten the auto-select timeout so the run stays fast.
  3. Capture a regression screenshot / snapshot to guard the timeline layout.

### Debug Flags Performance (🟠)
- **Gap**: Enabling every debug flag keeps `toggleLayoutDebugPanel` and `toggleTooltipOverlayDebug` in the critical path without any throttling or profiling.
- **Next steps**:
  1. Add lightweight performance logging behind a `DEBUG_PERF` guard to measure render cost.
  2. Evaluate moving heavy selectors to idle callbacks or requestAnimationFrame batches.
  3. Consider flag-level rate limiting so toggling multiple debug options does not repeatedly rescan the DOM.

## Observations & Questions
- **Hidden `roundStore` Flag** – Still present as `hidden: true` in `src/data/settings.json`; confirm whether it should remain hidden or be retired.
- **Terminology Drift** – UI labels use “Battle State Progress” while docs mention “Battle State Indicator”; align naming across tooltips, docs, and DOM.

## Opportunities for Improvement
1. **CLI Shortcuts Fallback Copy** – Surface a visible hint (chips or footer copy) when the shortcuts flag is disabled so players know to type commands.
2. **Auto-Select Timeline Test Hook** – Provide a dedicated fixture that forces auto-select expiry within Playwright to harden the state-progress coverage.
3. **Flag Metadata Layer** – Group flags by category/owner in `src/data/settings.json` and render headings + badges within `renderFeatureFlagSwitches` to reduce scrolling fatigue.
4. **Flag Help Microcopy** – Add an inline help icon that pulls from `tooltips.json` so players can read a concise description without external docs.
5. **Role-Based Views** – Honor a persisted role (player/developer/admin) and hide debug-only flags for non-engineering roles to keep Settings approachable.

## Verification Checklist
- `npm run validate:data`
- `npx eslint .`
- `npx vitest run`
- `playwright/battle-classic/battle-state-progress.spec.js`
- Targeted CLI shortcut test covering the disabled state once implemented

## References
- `src/helpers/battleStateProgress.js:80`
- `playwright/battle-classic/battle-state-progress.spec.js:51`
- `src/helpers/classicBattle/uiHelpers.js:46`
- `src/helpers/classicBattle/timerService.js:476`
- `src/pages/settings.html:130`
- `src/helpers/settings/featureFlagSwitches.js:66`
- `src/styles/settings.css:222`
- `src/pages/battleCLI/init.js:1760`
- `src/pages/battleCLI.html:200`
