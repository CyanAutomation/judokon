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

Based on a Playwright audit of the settings page layout and CSS analysis, the following opportunities for improvement have been identified:

- **Enhanced Visual Hierarchy and Grouping:**
  - Add icons or visual indicators to fieldset legends to make sections more distinguishable (e.g., display icon for Display Settings, gear for General Settings).
  - Implement subtle background variations or borders between fieldsets to improve section separation without cluttering the interface.
  - Consider collapsible sections for Advanced Settings to reduce visual overload, with a toggle to expand/collapse.

- **Responsive Design Refinements:**
  - Add intermediate breakpoints (e.g., 1024px, 768px) for better tablet experience, adjusting switch sizes and spacing accordingly.
  - Optimize the links grid: consider a 2-column layout on medium screens before collapsing to single column on mobile.
  - Improve touch targets on mobile by ensuring switches and buttons maintain adequate size across all screen sizes.

- **Switch and Control Styling Improvements:**
  - Reduce switch width on smaller screens (current 80px is wide; consider 60px on mobile) while maintaining accessibility.
  - Add hover states and animations to switches for better interactivity feedback.
  - Ensure consistent spacing and alignment between switches, labels, and descriptions across all settings items.

- **Form Layout and Readability:**
  - Improve description text styling: consider larger font size or better contrast for setting descriptions to enhance readability.
  - Add visual grouping for related settings (e.g., audio-related toggles together) within fieldsets.
  - Implement a search or filter functionality for the Advanced Settings section to help users find specific flags quickly.

- **Display Mode Selection Enhancement:**
  - Add preview thumbnails or color swatches next to radio buttons to show what each theme looks like.
  - Implement smooth transitions when switching display modes to demonstrate the change immediately.

- **Links Section Optimization:**
  - Make the links more prominent with better styling (e.g., card-like appearance with hover effects).
  - Add descriptions or icons to link items to provide context about what each page contains.
  - Consider organizing links into categories if more are added in the future.

- **Accessibility and Focus Management:**
  - Ensure all interactive elements have proper focus indicators that work well with the custom switch styling.
  - Add keyboard navigation improvements, such as arrow key navigation through radio groups and better tab order.
  - Verify screen reader compatibility for the custom switches and ensure ARIA labels are comprehensive.

- **Performance and Loading:**
  - Optimize CSS for faster rendering by reducing complex selectors and leveraging efficient layout methods.
  - Consider lazy-loading non-critical sections or implementing virtual scrolling if the settings list grows significantly.

- **User Experience Enhancements:**
  - Add a "Save Changes" indicator or unsaved changes warning to prevent accidental loss of settings.
  - Implement a settings summary or preview mode to show the impact of changes before applying.
  - Add tooltips or help text for complex settings, especially in the Advanced Settings section.

- **Theming and Consistency:**
  - Ensure all settings components properly inherit theme variables for consistent appearance across light/dark/retro modes.
  - Add theme-specific styling variations where appropriate (e.g., retro mode could have more terminal-like switches).
