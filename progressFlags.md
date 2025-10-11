# QA Report: Feature Flags

**Date:** October 1, 2025
**Source file reviewed:** `src/pages/settings.html`

## Executive summary

This review updates the QA findings in the original `progressFlags.md`, improves formatting, and adds a practical assessment of accuracy and feasibility for the proposed fixes. Key takeaways:

- Many advanced feature flags are currently unimplemented or don't produce the expected UI/behavior.
- A broken Classic Battle page (`battleClassic.html`) is a critical blocker for verifying several UI-facing flags.
- The recommended fixes in the original report are valid but need to be expanded with small, testable steps, owner suggestions, and risk/effort estimates.

Below I document each flag's status, my confidence in the QA observation (based on the original notes and common failure modes), and recommended next actions with feasibility estimates.

## Critical blocker

## Flag status, confidence & feasibility

Notes: "Confidence" indicates how likely the reported behavior is accurate given the QA notes and typical code patterns (High / Medium / Low). "Effort" is a rough implementation estimate (Low / Medium / High).

- `enableTestMode`
  - Status: Unimplemented
  - Confidence: Medium — behavior described (no banner) is consistent with an unwired flag
  - Effort to implement: Medium (wire flag to UI, add banner and optional developer tools)
  - Recommended action: If flag should show a banner + developer-only features, implement a single entrypoint (feature flag manager) and a visible banner component guarded by an accessible data attribute.

- `enableCardInspector`
  - Status: Not working / not visible
  - Confidence: Medium
  - Effort: Low → Medium (add collapsible panel + wiring; tests)
  - Recommendation: Implement behind a dev-only feature guard, add `data-feature-card-inspector` on the toggle and `data-hook-card-inspector` on the panel.

- `viewportSimulation`
  - Status: Unimplemented
  - Confidence: Medium
  - Effort: Medium (UI + simulator logic or client-side CSS toggles)
  - Recommendation: If minimal, implement a CSS container that simulates device sizes and a visible device selector in the UI.

- `tooltipOverlayDebug`
  - Status: Not working
  - Confidence: Medium
  - Effort: Low (debug outline CSS + hover instrumentation)
  - Recommendation: Add a lightweight CSS outline on tooltip hover when enabled; use `prefers-reduced-motion`/performance guard.

- `battleStateBadge`
  - Status: Unimplemented
  - Confidence: High
  - Effort: Low (badge component + simple wiring to battle state)
  - Recommendation: Render an unobtrusive badge in the header that reads from the battle state store; add `data-feature-battle-state-badge`.

- `battleStateProgress`
  - Status: Not working
  - Confidence: Medium
  - Effort: Medium (UI + state sequence rendering)
  - Recommendation: Add a non-critical progress strip component with unit and visual tests.

- `skipRoundCooldown`
  - Status: Not working
  - Confidence: Medium
  - Effort: Medium (engine flag to bypass cooldown timer in round flow)
  - Recommendation: Implement in battle engine hot path with static import; guard with flag read during initialization to avoid dynamic import in hot code path.

- `roundStore`
  - Status: No observable effect / unclear purpose
  - Confidence: Low — unclear intention
  - Effort: Medium (requires spec + implementation)
  - Recommendation: Clarify desired behavior (persist rounds across reload? replay rounds?). Add schema to settings metadata and an integration test.

- `opponentDelayMessage`
  - Status: Unable to verify (CLI lacks UI; Classic blocked)
  - Confidence: Medium
  - Effort: Low (expose UI element if desired, or clarify intended platform)
  - Recommendation: Decide whether this is CLI-only or UI; if UI, implement placeholder element and tests.

- `statHotkeys` & `cliShortcuts`
  - Status: Interaction issue — coupling observed
  - Confidence: High (explicit coupling noted)
  - Effort: Low → Medium (decouple or re-document + combine into single flag)
  - Recommendation: Either fully decouple: `statHotkeys` should independently register key handlers when enabled; or consolidate into one `enableHotkeys` with sub-flags in UI.

## Feasibility analysis of the original fix plan

- "Decouple Hotkeys" — Feasible and low risk. This is a focused refactor: isolate hotkey registration and feature-flag checks. Add automated tests for keyboard interactions. Effort: Low.

- UI/UX improvements (grouping flags, feedback, accessibility) — Feasible; mostly UI work and content updates. Effort: Low → Medium depending on accessibility remediation needed.

- "Add Flag Metadata" and `data-feature-*` hooks — Feasible and high value for QA and tests. Effort: Low.

## Concrete prioritized implementation plan (short, testable steps)

2. Minimal fix for Classic Battle hot path. (owner: core eng) — Effort: Medium — Priority: P0
   - Inspect initialization path (static imports only in hot paths). Look for recent changes to any battle initialization code and re-introduce a safe guard or early return.
   - Add a regression test (unit + integration).

3. Decouple or consolidate hotkeys. (owner: UX/core eng) — Effort: Low — Priority: P1
   - Extract hotkey registration into its own module. If `statHotkeys` requires `cliShortcuts`, display helper text or combine into one flag.

4. Add `data-feature-*` hooks and settings metadata. (owner: infra/devtools) — Effort: Low — Priority: P1
   - Update settings JSON schema to include `description`, `stability`, `owner`, `lastUpdated`.
   - Add `data-feature-<name>` attributes to toggles and `data-hook-<name>` to UI elements they control.

5. Implement small, visible debug components behind flags (banner, inspector, tooltip outlines). (owner: feature owner) — Effort: Low → Medium — Priority: P2

## Tests & verification matrix

- Add unit tests for:
  - Hotkey registration and key handling (happy path + when flag disabled).
  - Battle engine skip cooldown (unit test toggling flag and advancing fake timers).
  - Badge and progress components render when flags enabled.

- Add integration/Playwright tests for:
  - Classic Battle end-to-end to ensure match flow works and Next button is enabled.
  - Settings toggles emit correct events and update the UI (assert on `data-feature-*` attributes).

## Accessibility and rollout suggestions

- Disable or mark as "Coming soon" any flags that are not implemented to avoid user confusion.
- Add ARIA labels to toggles, ensure keyboard operability, and add visible focus indicators.
- Prefer progressive rollout: behind a developer-only bucket first, then beta testers, then general availability.

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
   - **Issue:** The links at the bottom of the page are presented in a single-column list, which is an inefficient use of space on wider screens.
   - **Suggestion:** In `src/styles/layout.css`, convert the `.settings-links-list` into a responsive grid. Use `display: grid;` and `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));` to create a flexible grid that adapts to the available screen width, presenting the links in multiple columns on larger screens.

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
