# QA Report: Feature Flags

**Date:** October 1, 2025
**Source file reviewed:** `src/pages/settings.html`

## Executive summary

This review re-validates the QA findings in `progressFlags.md`, corrects inaccurate statuses, and adds feasibility notes for the next engineering pass. Key takeaways:

- Card inspector, viewport simulation, tooltip overlay, and skip cooldown behave as implemented; the main gap is missing QA hooks and regression coverage.
- Classic Battle still bootstraps `battleClassic.init.js` (`src/pages/battleClassic.html:172`), so helpers like `applyBattleFeatureFlags` and `initBattleStateProgress` never run in production; the banner and progress UI remain dormant despite unit tests.
- The battle state badge and progress list modules exist but remain inactive until the Classic page migrates to the new controller/view bootstrap (`src/helpers/classicBattle/bootstrap.js`).
- Switches such as `roundStore`, `opponentDelayMessage`, and the coupled `statHotkeys`/`cliShortcuts` pair still need product decisions or refactors to avoid confusing auto-enabling behavior.

Below I document each flag's status, my confidence in the QA observation (based on the original notes and common failure modes), and recommended next actions with feasibility estimates.

## Recent task updates

- Pointed the Classic Battle page at `setupClassicBattlePage` (`src/pages/battleClassic.html:172` → `../helpers/classicBattle/bootstrap.js`), ensuring the controller/view bootstrap owns runtime wiring.
- Hydrated the stat button container with static markup (`src/pages/battleClassic.html:96-120`) so the new view layer can manage readiness without the legacy renderer.
- Ran targeted checks: `npx vitest run tests/classicBattle/bootstrap.test.js tests/helpers/classicBattle/applyBattleFeatureFlags.test.js` and `npx playwright test playwright/battle-classic/round-select.spec.js`.
- Implemented the opponent delay flag path so Classic Battle shows/defers the "Opponent is choosing…" snackbar based on the feature toggle with deterministic fallbacks (`src/pages/battleClassic.init.js:720-758`, `src/helpers/classicBattle/uiEventHandlers.js:1-118`, `src/helpers/classicBattle/selectionHandler.js:320-350`); validated via `npx vitest run tests/helpers/classicBattle/opponentDelay.test.js tests/components/opponentChoosing.spec.js`.
- Hid the legacy **Round Store** toggle from the Settings UI while retaining the backing data for engine consumers and schema validation (`src/data/settings.json:66-74`, `src/helpers/settings/featureFlagSwitches.js:70-115`, `src/schemas/settings.schema.json:38-73`), and exercised the settings flow with `npx playwright test playwright/settings.spec.js`.
- Decoupled stat hotkeys from the forced auto-enable path so UI and CLI respect persisted flag state (`src/helpers/classicBattle/statButtons.js:145-169`, `src/pages/battleCLI/init.js:1883-1902`), verified via `npx vitest run tests/helpers/classicBattle/statHotkeys.enabled.test.js tests/pages/battleCLI.selectedStat.test.js tests/pages/battleCLI.invalidNumber.test.js tests/pages/battleCLI.inputLatencyHardened.spec.js` and `npx playwright test playwright/stat-hotkeys.smoke.spec.js`.
- Added `data-feature-*` instrumentation for working flags (viewport simulation, tooltip overlay debug, skip round cooldown, battle state badge, and card inspector) plus focused regression coverage (`src/helpers/viewportDebug.js`, `src/helpers/tooltipOverlayDebug.js`, `src/helpers/classicBattle/uiHelpers.js`, `src/components/JudokaCard.js`, `src/helpers/cardUtils.js`, `src/helpers/inspector/createInspectorPanel.js`, `tests/helpers/debugClassToggles.test.js`, `tests/helpers/classicBattle/uiHelpers.featureFlags.test.js`, `tests/helpers/judokaCard.test.js`, `playwright/settings.spec.js`); validated with `npx vitest run tests/helpers/debugClassToggles.test.js tests/helpers/classicBattle/uiHelpers.featureFlags.test.js tests/helpers/judokaCard.test.js` and `npx playwright test playwright/settings.spec.js`.

## Critical blocker

- **Resolved:** Classic Battle now boots via `setupClassicBattlePage`, so `applyBattleFeatureFlags` and `initBattleStateProgress` run in production (`src/pages/battleClassic.html:172`, `src/helpers/classicBattle/bootstrap.js:32-104`).

## Flag status, confidence & feasibility

Notes: "Confidence" indicates how likely the reported behavior is accurate given the QA notes and typical code patterns (High / Medium / Low). "Effort" is a rough implementation estimate (Low / Medium / High).

- `enableTestMode`
  - Status: **Working** — the controller/view bootstrap now initializes Classic Battle, so `applyBattleFeatureFlags` toggles `data-test-mode` markers and the banner when the flag is on (`src/pages/battleClassic.html:172`, `src/helpers/classicBattle/bootstrap.js:32-104`, `src/helpers/classicBattle/view.js:24-38`).
  - Confidence: High (verified via `npx vitest run tests/classicBattle/bootstrap.test.js` and Playwright round-select journeys).
  - Effort: Low (follow-up work is documentation and extended E2E coverage).
  - Recommendation: Document deterministic seed copying in QA guides and add a dedicated Playwright assertion for the banner.

- `enableCardInspector`
  - Status: **Working** — card draws read the flag before rendering, and `JudokaCard` appends the inspector `<details>` when `enableInspector` is true (`src/helpers/classicBattle/cardSelection.js:447-509`, `src/components/JudokaCard.js:205-214`, `src/helpers/inspector/createInspectorPanel.js:1-56`).
  - Confidence: High (code path exercised in Vitest, inspector panel present when cards are redrawn).
  - Effort: Low (add data hooks and documentation so QA can locate the panel; optionally re-render the current card when the flag flips).
  - Recommendation: Keep the feature, add `data-feature-card-inspector` to the wrapper for automation, and document that toggling the flag requires a fresh card draw.

- `viewportSimulation`
  - Status: **Working** — settings toggles call `toggleViewportSimulation`, which persists class state and updates instantly, with CSS already constraining the layout (`src/helpers/setupDisplaySettings.js:1-33`, `src/helpers/viewportDebug.js:17-22`, `src/styles/settings.css:188-204`).
  - Confidence: High.
  - Effort: Low (QA coverage + optional presets).
  - Recommendation: Add a Playwright smoke test that asserts the `.simulate-viewport` class is applied and that layout width is reduced to the expected 375 px.

- `tooltipOverlayDebug`
  - Status: **Working** — toggles call `toggleTooltipOverlayDebug`, which sets a body class consumed by existing tooltip CSS (`src/helpers/settings/featureFlagSwitches.js:26-55`, `src/helpers/tooltipOverlayDebug.js:17-34`, `src/styles/tooltip.css:26-31`).
  - Confidence: High.
  - Effort: Low (QA automation only).
  - Recommendation: Add an integration test that asserts tooltip targets gain the outline when the flag is on.

- `battleStateBadge`
  - Status: **Working** — `ClassicBattleView` listens for `featureFlagsChange` and calls `setBattleStateBadgeEnabled`, so flipping the flag now shows/hides the badge in both runtime and tests (`src/helpers/classicBattle/view.js:24-40`, `src/helpers/classicBattle/uiHelpers.js:932-959`).
  - Confidence: High.
  - Effort: Low (add QA data hooks and unit coverage for the helper).
  - Recommendation: Surface a `data-feature-battle-state-badge` attribute and expand unit tests around `setBattleStateBadgeEnabled`.

- `battleStateProgress`
  - Status: **Implemented (QA instrumented)** — `setupUIBindings` now runs in production and calls `initBattleStateProgress`, so enabling the flag renders the progress list with `data-feature-battle-state-*` hooks (`src/helpers/classicBattle/setupUIBindings.js:28-52`, `src/helpers/battleStateProgress.js:1-214`).
  - Confidence: High (covered by existing unit + Playwright round-select specs).
  - Effort: Low (extend documentation for QA and broaden Playwright coverage).
  - Recommendation: Add broader E2E assertions that the active state tracks round transitions.

- `skipRoundCooldown`
  - Status: **Working** — UI service and timer service both consult the flag and short-circuit countdown timers when it is enabled (`src/helpers/classicBattle/uiService.js:186-226`, `src/helpers/classicBattle/timerService.js:461-510`, `src/helpers/classicBattle/uiHelpers.js:49-75`).
  - Confidence: High.
  - Effort: Low (add targeted E2E coverage).
  - Recommendation: Keep the implementation, add a unit test for the skip path, and surface a QA hook (`data-feature-skip-round-cooldown`) on the Next button.

- `roundStore`
  - Status: **Hidden in UI** — the engine still instantiates the store, but the Settings toggle is suppressed to avoid advertising unfinished behavior (`src/data/settings.json:66-74`, `src/helpers/settings/featureFlagSwitches.js:70-115`).
  - Confidence: Medium (UI verification via Playwright, engine path unchanged).
  - Effort: Low (future work is product alignment before re-exposing the control).
  - Recommendation: Keep the toggle hidden until persistence semantics are defined; update copy + tests when product green-lights the feature.

- `opponentDelayMessage`
  - Status: **Working (flag-gated)** — stat selection now respects the flag, deferring the "Opponent is choosing…" snackbar via configurable delays with a deterministic fallback hook (`src/pages/battleClassic.init.js:720-758`, `src/helpers/classicBattle/uiEventHandlers.js:1-118`, `src/helpers/classicBattle/selectionHandler.js:320-350`).
  - Confidence: High (covered by targeted Vitest component tests).
  - Effort: Low (follow-up is documentation and possibly orchestrator E2E coverage once battle-classic specs are stable).
  - Recommendation: Expose the delay override settings in QA docs and consider an orchestrator Playwright probe once existing smoke tests are green again.

- `statHotkeys` & `cliShortcuts`
  - Status: **Decoupled** — `wireStatHotkeys` now respects `isEnabled("statHotkeys")` without mutating persistence, and the CLI handler returns `"ignored"` when the flag is off so disabled users are not nagged (`src/helpers/classicBattle/statButtons.js:145-169`, `src/pages/battleCLI/init.js:1883-1902`).
  - Confidence: High (covered by refreshed Vitest and Playwright runs above).
  - Effort: Low (remaining follow-up is documentation to clarify that CLI shortcuts stay independent).
  - Recommendation: Update settings/help copy to explain the two toggles; no additional engineering action unless UX wants to consolidate them.

## Feasibility analysis of the remediation plan

1. **Surface the test mode banner** — Completed/verified; follow-up coverage is tracked in the implementation plan.
2. **Instrument battle state progress** — **Completed/verified** via new data attributes, targeted unit coverage, and Playwright validation.
3. **Tidy unused or misleading flags** — **Completed** by wiring `opponentDelayMessage` through the battle flow and hiding the dormant `roundStore` toggle until product requirements land.
4. **Improve observability** — **Completed** via new `data-feature-*` hooks and focused Vitest/Playwright coverage for the working flags (`viewportSimulation`, `tooltipOverlayDebug`, `battleStateBadge`, `skipRoundCooldown`, `enableCardInspector`), enabling QA automation to assert live state.
5. **Decouple hotkeys** — **Completed** by removing the `enableFlag("statHotkeys")` auto-toggle, routing CLI digits through the flag, and backfilling regression coverage.

## Concrete prioritized implementation plan (short, testable steps)

1. Surface the test mode banner (owner: core eng) — Effort: Medium — Priority: P0 **(Completed)**
   - Classic Battle now boots via `setupClassicBattlePage`; the banner toggles as expected and targeted Playwright coverage observes the hook.
2. Instrument the battle state progress feature (owner: core eng) — Effort: Medium — Priority: P1 **(Completed)**
   - `initBattleStateProgress` executes in production, preserving QA data attributes; follow-on work is documentation and broader E2E coverage.
3. Resolve legacy/unused flags (owner: product + UX) — Effort: Medium — Priority: P1 **(Completed)**
   - Hid the `roundStore` toggle and wired `opponentDelayMessage` through the Classic Battle flow pending product follow-up.
4. Decouple hotkeys (owner: UX/core eng) — Effort: Low — Priority: P1 **(Completed)**
   - Removed the forced `enableFlag` call, ensured both UI and CLI respect stored values, and added regression tests.
5. Add data hooks + tests for the other working flags (owner: dev tooling) — Effort: Low — Priority: P2 **(Completed)**
   - Tagged runtime affordances (`viewportSimulation`, `tooltipOverlayDebug`, `battleStateBadge`, `skipRoundCooldown`, `enableCardInspector`) with `data-feature-*` markers, extended Vitest coverage, and taught the Playwright settings spec to ignore hidden toggles.

## Tests & verification matrix

Once Classic Battle is wired to the new bootstrap, the following coverage should guard regressions:

- **Unit tests**
  - `battleStateProgress` list rendering + active state mapping (`renderStateList`, `updateActiveState`).
  - `skipRoundCooldownIfEnabled` happy/disabled paths and timer service auto-skip.
  - `setBattleStateBadgeEnabled` DOM insertion/removal logic.
  - Stat hotkey wiring with the forced enable removed.

- **Playwright / integration**
  - Toggle `enableTestMode` → assert banner presence, debug panel visibility, and deterministic seed copy.
  - Toggle `battleStateProgress` → assert list renders and active class follows state transitions.
  - Toggle `viewportSimulation` + `tooltipOverlayDebug` → assert `.simulate-viewport` width and tooltip outlines via `data-feature-*` hooks.
  - Toggle `skipRoundCooldown` → ensure countdown is bypassed, while manual Next still advances.

## Accessibility and rollout suggestions

- Hide or label as “Coming soon” any switches that still lack functionality (`opponentDelayMessage`, `roundStore`) until the UX is finalized.
- When adding the test mode banner, include ARIA roles/labels so screen readers announce the state change; confirm the existing battle state progress list retains `role="status"`, `aria-live="polite"`, and `aria-current` toggling.
- Keep focus management intact when banners/lists appear; add regression tests that ensure keyboard flow and visible focus outlines remain consistent.

## Risk and rollback

- Adding UI features should include feature-flag gating so they can be turned off quickly.

---

### Requirements coverage

- Review and assessment of the QA report: Done (accuracy/confidence noted per flag).
- Feasibility analysis of the fix plan: Done (effort estimates + prioritized steps).
- Good Markdown formatting and revision: Done (this file).

---

## Layout and Styling Opportunities

Based on a review of the settings page (`src/pages/settings.html`) and its associated styles, the following opportunities have been identified to improve the layout, styling, and user experience. The suggestions are organized into a phased implementation plan.

### Phase 1: Foundational UI/UX Improvements

This phase focuses on high-impact changes to improve the core layout, readability, and accessibility of the settings page.

1. **Visual Hierarchy and Grouping:**
   - **Issue:** The settings page is a long, single-column list of options, which can be overwhelming for users. The separation between sections is not very strong.
   - **Suggestion:** In `src/styles/layout.css`, introduce distinct visual styling for each `<fieldset>` element. This can be achieved by adding a subtle `border` and a `background-color` to each fieldset to visually group related settings. Additionally, increase the `font-size` and `font-weight` of the `<legend>` elements to make section titles more prominent.

2. **Responsive Layout for Links:**
   - **Issue:** `.settings-links-list` already uses a three-column CSS grid, but the fixed `repeat(3, 1fr)` template leaves awkward spacing on medium viewports before collapsing to a single column.
   - **Suggestion:** In `src/styles/settings.css`, switch the grid definition to something like `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));` so the links reflow smoothly across small, medium, and large screens without manual breakpoints.

3. **Switch Control Sizing:**
   - **Issue:** The toggle switches are currently a fixed width, which can appear too large on smaller screens.
   - **Suggestion:** In `src/styles/settings.css`, adjust the width of the `.switch` class to be responsive. Use a smaller base width and consider using `max-width` to ensure the switches scale appropriately on different devices.

### Phase 2: Enhanced Interactivity and Theming

This phase focuses on making the settings page more interactive and visually engaging, while also improving theme consistency.

1. **Interactive Switch States:**
   - **Issue:** The toggle switches lack visual feedback on hover, making them feel static.
   - **Suggestion:** In `src/styles/settings.css`, add a `:hover` state to the `.switch` class. This could involve a subtle change in `background-color` or a `box-shadow` to provide clear visual feedback when a user interacts with the switch.

2. **Display Mode Previews:**
   - **Issue:** The display mode selection is presented as a simple list of radio buttons, with no indication of what each theme looks like.
   - **Suggestion:** In `src/pages/settings.html`, enhance the display mode selector by adding a small visual preview next to each option. This could be a color swatch or a miniature screenshot that demonstrates the light, dark, and retro themes, making the selection process more intuitive.

3. **Theme-Specific Styles:**
   - **Issue:** While the app supports theming, some components on the settings page may not fully adapt to the different themes.
   - **Suggestion:** Conduct a thorough review of the settings page in all three display modes (light, dark, and retro). Identify any elements that do not correctly inherit theme variables and update their styles in `src/styles/settings.css` to ensure a consistent and polished appearance across all themes.

### Phase 3: Advanced Features and Future-Proofing

This phase introduces more advanced functionality and long-term improvements to enhance the user experience and maintainability of the settings page.

1. **Collapsible Sections:**
   - **Issue:** As more settings are added, the page will become increasingly long and difficult to navigate.
   - **Suggestion:** In `src/pages/settings.html` and `src/helpers/settingsPage.js`, implement collapsible sections for the fieldsets. By wrapping each section in a `<details>` element, the content can be hidden by default and expanded by the user, reducing initial visual clutter and making it easier to find specific settings.

2. **Unsaved Changes Indicator:**
   - **Issue:** The settings are saved automatically, but there is no visual indication that a change has been made and saved, which could be confusing for users.
   - **Suggestion:** In `src/helpers/settingsPage.js`, implement a "Saved!" indicator that briefly appears after a setting is changed. This provides immediate feedback to the user, confirming that their action was successful. This can be implemented by adding a temporary class to the relevant setting item and styling it in the CSS.

3. **Search/Filter for Advanced Settings:**
   - **Issue:** The "Advanced Settings" section is likely to grow, making it difficult to find specific feature flags.
   - **Suggestion:** Implement a client-side search/filter functionality for the advanced settings. Add an `<input type="search">` element to the top of the section and use JavaScript in `src/helpers/settingsPage.js` to dynamically show or hide settings based on the user's input. This will significantly improve the usability of this section as more flags are added.

## Additional engineering opportunities

- Migrate the Classic Battle page to `setupClassicBattlePage` so the controller/view stack owns flag wiring, banner updates, and state progress (`src/helpers/classicBattle/bootstrap.js`, `src/pages/battleClassic.html:172`).
- If migration must be incremental, register `featureFlagsEmitter` listeners inside `src/pages/battleClassic.init.js` to call `applyBattleFeatureFlags` and `setBattleStateBadgeEnabled` until the new bootstrap lands.
- Add QA data hooks for `skipRoundCooldown` (Next button) and the inspector panel to align with the instrumentation plan once the wiring is active (`src/helpers/classicBattle/uiHelpers.js`, `src/components/JudokaCard.js`).
- Replace noisy `console.debug` statements in `setBattleStateBadgeEnabled` with the existing log gating helpers or remove them before shipping to production (`src/helpers/classicBattle/uiHelpers.js:932-959`).
- Investigate why `playwright/battle-classic/smoke.spec.js` times out after the migration (stat buttons are enabled but the match does not conclude within the current loop).
