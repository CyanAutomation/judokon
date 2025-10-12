# QA Report: Feature Flags

**Date:** October 1, 2025
**Source file reviewed:** `src/pages/settings.html`

## Executive summary

This review re-validates the QA findings in `progressFlags.md`, corrects inaccurate statuses, and adds feasibility notes for the next engineering pass. Key takeaways:

- Most runtime flags (card inspector, viewport simulation, tooltip overlay, battle state badge, skip cooldown) behave as implemented; they primarily lack QA hooks and regression coverage.
- The `enableTestMode` banner target is still missing and `applyBattleFeatureFlags` is never defined, so the visibility cue for deterministic mode remains blocked.
- The battle state progress list already ships in `battleClassic.html` and renders when the flag is enabled; focus shifts to instrumentation and testing rather than markup.
- Switches such as `roundStore`, `opponentDelayMessage`, and the coupled `statHotkeys`/`cliShortcuts` pair still need product decisions or refactors to avoid confusing auto-enabling behavior.

Below I document each flag's status, my confidence in the QA observation (based on the original notes and common failure modes), and recommended next actions with feasibility estimates.

## Critical blocker

- `enableTestMode` is wired through the controller, debug panel, and determinism helpers, but the banner that QA expected never renders because `battleClassic.html` lacks a `#test-mode-banner` target and the imported `applyBattleFeatureFlags` helper is undefined (`src/helpers/classicBattle/controller.js:43-79`, `src/helpers/classicBattle/debugPanel.js:360-409`, `src/helpers/classicBattle/view.js:1-40`, `src/pages/battleClassic.html:42-66`). Adding that element (and supplying the helper) will unblock visibility checks.

## Flag status, confidence & feasibility

Notes: "Confidence" indicates how likely the reported behavior is accurate given the QA notes and typical code patterns (High / Medium / Low). "Effort" is a rough implementation estimate (Low / Medium / High).

- `enableTestMode`
  - Status: **Partially implemented** — the controller keeps deterministic mode in sync and the debug panel honours it, but there is no banner because the page never renders a `#test-mode-banner` node (`src/helpers/classicBattle/controller.js:43-79`, `src/helpers/classicBattle/debugPanel.js:360-409`, `src/pages/battleClassic.html:42-66`).
  - Confidence: High (behavior confirmed in unit tests and code inspection).
  - Effort to finish: Low → Medium (add the banner markup + styling, provide a small helper to toggle visibility, and surface `data-feature="test-mode"` hooks for QA).
  - Recommended action: Add the missing DOM element, implement `applyBattleFeatureFlags` (currently imported but absent) to toggle the banner, and add a Playwright check that the banner appears when the flag is enabled.

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
  - Status: **Working** — enabling the flag calls `setBattleStateBadgeEnabled`, which creates the badge and updates it via state transitions; the scaffold already contains the placeholder span (`src/helpers/classicBattle/uiHelpers.js:888-910`, `src/pages/battleClassic.html:42-66`).
  - Confidence: High.
  - Effort: Low (add coverage + data hooks).
  - Recommendation: Expose `data-feature-battle-state-badge` so QA can assert visibility, and add a unit test around `setBattleStateBadgeEnabled`.

- `battleStateProgress`
  - Status: **Implemented (needs QA hooks)** — `initBattleStateProgress` populates the existing `ul#battle-state-progress` scaffold and toggles classes via `updateActiveState` when the flag is enabled (`src/helpers/battleStateProgress.js:1-214`, `src/pages/battleClassic.html:94-101`).
  - Confidence: High (verified markup plus helper wiring).
  - Effort: Low → Medium (add data attributes, polish styling, expand coverage).
  - Recommendation: Surface `data-feature-battle-state-progress`, add unit/Playwright coverage for `renderStateList` and `updateActiveState`, and ensure the wrapper retains accessible labelling.

- `skipRoundCooldown`
  - Status: **Working** — UI service and timer service both consult the flag and short-circuit countdown timers when it is enabled (`src/helpers/classicBattle/uiService.js:186-226`, `src/helpers/classicBattle/timerService.js:461-510`, `src/helpers/classicBattle/uiHelpers.js:49-75`).
  - Confidence: High.
  - Effort: Low (add targeted E2E coverage).
  - Recommendation: Keep the implementation, add a unit test for the skip path, and surface a QA hook (`data-feature-skip-round-cooldown`) on the Next button.

- `roundStore`
  - Status: **Unused** — the store is always instantiated and no code branches on `isEnabled("roundStore")`; the flag only changes the label to “Round Store (Experimental)” (`src/helpers/classicBattle/roundStore.js:1-214`, `src/helpers/settings/featureFlagSwitches.js:59-76`).
  - Confidence: High.
  - Effort: Medium (decide on behavior or retire the toggle).
  - Recommendation: Either gate the store behind the flag (and define persistence semantics) or hide the switch until a use-case exists.

- `opponentDelayMessage`
  - Status: **Not implemented** — only the docstring references the flag; `bindUIHelperEventHandlers` is a stub and `prepareUiBeforeSelection` always shows the snackbar regardless of feature state (`src/helpers/classicBattle/uiHelpers.js:959-978`, `src/pages/battleClassic.init.js:719-737`).
  - Confidence: High.
  - Effort: Low → Medium (implement the delayed snackbar or remove the switch).
  - Recommendation: Either wire the flag through `bindUIHelperEventHandlersDynamic` (using `getOpponentDelay`/timeouts) or remove it from the settings page to avoid confusion.

- `statHotkeys` & `cliShortcuts`
  - Status: **Coupled** — enabling stat hotkeys immediately persists the flag via `enableFlag("statHotkeys")`, so users cannot keep it disabled, while CLI shortcuts have separate logic and only gate non-`q` keys (`src/helpers/classicBattle/statButtons.js:145-172`, `src/pages/battleCLI/events.js:48-111`).
  - Confidence: High.
  - Effort: Low → Medium (stop auto-enabling and clarify configuration model).
  - Recommendation: Remove the forced `enableFlag` call, ensure hotkeys respect the stored value, and document that CLI shortcuts remain independent (or merge the two toggles into a single “Enable hotkeys” flag with sub-options).

## Feasibility analysis of the remediation plan

1. **Surface the test mode banner** — Add the `#test-mode-banner` markup, implement `applyBattleFeatureFlags`, and cover the controller/view wiring with regression tests. This is mostly HTML/CSS plus a helper, so risk stays low.
2. **Instrument battle state progress** — Add QA-facing data attributes, ensure styling matches the existing controls layout, and exercise `renderStateList`/`updateActiveState` in tests so the flag remains verifiable.
3. **Tidy unused or misleading flags** — Either wire `roundStore` and `opponentDelayMessage` to real behavior or hide them until a product requirement exists. This is mostly product/UX alignment work with a small amount of code churn.
4. **Improve observability** — Add `data-feature-*` hooks and Playwright/Vitest coverage for the working flags (`viewportSimulation`, `tooltipOverlayDebug`, `battleStateBadge`, `skipRoundCooldown`, `enableCardInspector`) so QA automation can rely on them.
5. **Decouple hotkeys** — Removing the `enableFlag("statHotkeys")` auto-toggle and documenting CLI shortcuts is a small refactor with low regression risk.

## Concrete prioritized implementation plan (short, testable steps)

1. Surface the test mode banner (owner: core eng) — Effort: Low — Priority: P0
   - Add `#test-mode-banner`, implement the missing `applyBattleFeatureFlags` helper, and verify the banner toggles when `enableTestMode` is flipped.
2. Instrument the battle state progress feature (owner: core eng) — Effort: Low → Medium — Priority: P1
   - Expose `data-feature-battle-state-progress`, ensure styling fits within the controls column, and cover `renderStateList`/`updateActiveState` with unit + Playwright checks.
3. Resolve legacy/unused flags (owner: product + UX) — Effort: Medium — Priority: P1
   - Decide whether `roundStore` and `opponentDelayMessage` stay; implement or retire accordingly, and update settings copy.
4. Decouple hotkeys (owner: UX/core eng) — Effort: Low — Priority: P1
   - Remove the forced `enableFlag` call, ensure both UI and CLI respect stored values, and add regression tests.
5. Add data hooks + tests for the other working flags (owner: dev tooling) — Effort: Low — Priority: P2
   - Tag rendered elements with `data-feature-*`, add Vitest/Playwright checks, and document QA entry points.

## Tests & verification matrix

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
