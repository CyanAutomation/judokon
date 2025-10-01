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

### Classic Battle page is unplayable

- Issue: Navigating to `battleClassic.html` produces a page where the primary "Next"/progress controls are disabled and a match cannot be started.
- Impact: High — blocks verification of UI flags (for example `opponentDelayMessage`, `battleStateBadge`, `battleStateProgress`, `skipRoundCooldown`) and prevents UI-level QA for classic mode.
- Confidence: High (explicit manual reproduction in QA notes).
- Short-term mitigation: Add a failing test that reproduces the broken flow to capture the bug and prevent regressions once fixed.

## Flag status, confidence & feasibility

Notes: "Confidence" indicates how likely the reported behavior is accurate given the QA notes and typical code patterns (High / Medium / Low). "Effort" is a rough implementation estimate (Low / Medium / High).

- `enableTestMode`
    - Status: Unimplemented
    - Confidence: Medium — behavior described (no banner) is consistent with an unwired flag
    - Effort to implement: Medium (wire flag to UI, add banner and optional developer tools)
    - Recommended action: If flag should show a banner + northern dev-only features, implement a single entrypoint (feature flag manager) and a visible banner component guarded by an accessible data attribute.

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

- "Fix Classic Battle" — Feasible and high priority. Root cause could be a regression in event wiring, DOM queries, or a runtime error during initialization. Start by reproducing in a failing unit/integration test and instrumenting console errors. Effort: Medium.

- "Decouple Hotkeys" — Feasible and low risk. This is a focused refactor: isolate hotkey registration and feature-flag checks. Add automated tests for keyboard interactions. Effort: Low.

- UI/UX improvements (grouping flags, feedback, accessibility) — Feasible; mostly UI work and content updates. Effort: Low → Medium depending on accessibility remediation needed.

- "Add Flag Metadata" and `data-feature-*` hooks — Feasible and high value for QA and tests. Effort: Low.

## Concrete prioritized implementation plan (short, testable steps)

1. Capture the Classic Battle failure in an automated test and add withMutedConsole helper to collect errors. (owner: QA/dev) — Effort: Medium — Priority: P0
     - Add a Playwright or vitest integration test that opens `battleClassic.html`, attempts to start a match, and asserts the Next button becomes enabled.
     - Collect console errors and stack traces; add to the bug report.

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

- Fixing Classic Battle is low-risk to the broader codebase if changes are limited to initialization guards and static imports. However, ensure regression tests exist before merging.
- Adding UI features should include feature-flag gating so they can be turned off quickly.

## Next steps (what I can do if you want me to proceed)

1. Reproduce and add an automated test for the Classic Battle bug (I can create the Playwright or vitest test and the failing reproduction).  
2. Implement the hotkey decoupling and a small PR that exposes `data-feature-*` attributes.  
3. Implement low-risk UI stubs for `enableTestMode`, `enableCardInspector`, and `tooltipOverlayDebug` to make flags testable.

If you'd like I can start with step 1 (add the failing test and capture console errors) — tell me whether you prefer Vitest or Playwright for the initial repro and I'll proceed.

---

### Requirements coverage

- Review and assessment of the QA report: Done (accuracy/confidence noted per flag).  
- Feasibility analysis of the fix plan: Done (effort estimates + prioritized steps).  
- Good Markdown formatting and revision: Done (this file).  

Please review and tell me which next step you'd like me to take; I can open PRs with the tests and fixes as described.