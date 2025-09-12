JU-DO-KON! — battleCLI.html Audit and Plan

Scope: Review `src/pages/battleCLI.html` for structure, accessibility, semantics, testability, and alignment with repository standards. Provide corrections, improvements, and an implementation plan.

Summary
- The file is generally well‑structured and test‑friendly, with thoughtful ARIA usage, skip link, and clear DOM anchors for the battle flow and snackbar.
- Key risks: overuse of live regions, role mismatches (listbox/options and textbox), duplicated/conflicting CSS for `.cli-stat`, a large `min-height` on `.state-badge` that can bloat the header, and default theme classes that may fight feature flags.
- No dynamic imports here; scripts are static modules. Test hooks (`data-test`, stable IDs) are present.

Accuracy Check of Submitted Audit
- Note: `progress.md` only contained a placeholder (“TBC”), so there was nothing substantive to validate. This document provides a fresh, source‑based audit of `src/pages/battleCLI.html` for your review.

Findings
1) Accessibility and semantics
- Live regions: Multiple elements are `aria-live="polite"` (`#round-message`, `#cli-countdown`, `.cli-status` children, and hidden scoreboard nodes). This risks duplicate announcements. Recommendation: keep `#round-message` as the primary live region; set the rest to `aria-live="off"` or remove `aria-live` unless required.
- Prompt: `#cli-prompt` uses `role="textbox"` but is neither focusable nor an input. If it is only a non‑interactive terminal prompt line, change to a non‑interactive role (e.g., remove role or use `role="status"`) and add `aria-live="off"` to avoid redundant announcements.
- Listbox semantics: `#cli-stats` has `role="listbox"`, but its children (skeleton rows) are plain `div`s. Screen readers expect `role="option"` children. Recommendation: while skeletons are shown, either: (a) do not set `role=listbox` yet and set `aria-busy="true"`; or (b) mark skeletons `role="presentation"`. When actual options render, ensure each has `role="option"`, `aria-selected`, and proper labeling.
- Help panel toggle: The close button uses `aria-expanded="false"` and `aria-controls="cli-shortcuts-body"`, but this state is not toggled in markup. Ensure the JS click handler syncs `aria-expanded` with `hidden` on the panel body.
- Decorative CSS content: Several `::before` icons (e.g., in `#cli-countdown`, `#round-message`, scoreboard nodes). Some AT may announce generated content. Safer pattern: include meaningful labels in the element text or via `aria-label` and treat icons as decorative using markup rather than CSS content when possible.
- Seed input: Good use of `type="number"` and `inputmode`. Add `aria-describedby="seed-error"` so the error is associated, and consider `min`, `max`, and `step` constraints if appropriate.
- Terminal title bar: Consider `aria-hidden="true"` if purely decorative.

2) Visual/CSS issues
- Duplicate `.cli-stat` declarations: Defined twice with different padding and properties (early and later in the stylesheet), increasing cognitive load and risk of drift. Recommendation: consolidate into a single `.cli-stat` rule block.
- `.state-badge` has `min-height: 8rem` with a comment about reserving space for stat rows. This appears to be a misapplied rule; it will balloon header height if shown. Recommendation: remove that `min-height` from `.state-badge` (space is already reserved by `#cli-stats`).
- Unused CSS: Styles for `#start-match-button` are present, but no such element exists in the markup. Recommendation: remove or add the button; otherwise delete the dead CSS.
- Inline styles: Several inline style attributes (e.g., settings headers) are present. Recommendation: move these to CSS classes for consistency and easier maintenance/testing.

3) Theming/flags
- Body has `class="cli-retro cli-immersive"` by default, and the head script also toggles classes based on `userFlags`. This can create conflicts or make flags ineffective. Recommendation: remove the hard‑coded body classes and rely on flags (or set a single deliberate default and let flags override it deterministically).

4) Testability
- Good: stable IDs (`#cli-root`, `#cli-stats`, `#round-message`, `#snackbar-container`), `data-test` hooks, skeleton placeholders to stabilize layout, and hidden scoreboard nodes for future integration.
- Improve: when applying role changes (listbox/options), ensure tests assert via roles/names as well as IDs where relevant to improve resilience.

5) Standards alignment
- No dynamic imports in this page; scripts are static module tags.
- No unsilenced console in this file.
- Contrast appears strong across key elements, but a contrast run is advised after any color changes.

Concrete Recommendations
- Live regions: Keep `#round-message` as the primary `aria-live="polite"`. Remove or set others to `aria-live="off"` unless strictly needed.
- Prompt: Replace `role="textbox"` on `#cli-prompt` with a non‑interactive role (or none) and, if kept as an informational row, add `aria-live="off"`.
- Stats semantics: While skeletons are present, add `aria-busy="true"` on `#cli-stats` and mark skeletons `role="presentation"`. When real options render, ensure each option has `role="option"` and `aria-selected` state management.
- CSS cleanup: Remove duplicate `.cli-stat` block and unused `#start-match-button` styles. Remove `min-height: 8rem` from `.state-badge`.
- Theming: Remove default `cli-retro/cli-immersive` classes from `<body>` and rely on the feature flag initialization, or gate the default via a single source of truth (e.g., settingsDefaults).
- Seed input: Add `aria-describedby="seed-error"` and consider min/max/step.
- Decorative icons: Prefer markup‑based icons or ensure text labels convey meaning without relying on CSS `content`.
- Inline → CSS: Extract inline styles in settings/headers to CSS classes.

Proposed Implementation Plan
1) Accessibility pass
- Consolidate live regions; adjust roles for prompt and stats.
- Add `aria-busy` and `role="presentation"` for skeletons; ensure real options use `role="option"` with `aria-selected`.
- Wire the help panel toggle to update `aria-expanded` in sync with `hidden`.

2) CSS refactor
- Merge `.cli-stat` definitions; remove dead `#start-match-button`; remove `min-height` from `.state-badge`.
- Extract inline styles into CSS classes within `cli-immersive.css`/`components.css`.

3) Theming/flags
- Remove hard‑coded `cli-retro cli-immersive` on `<body>`; rely on `userFlags` or a single controlled default.

4) Inputs and labels
- Add `aria-describedby` for the seed input and consider numeric constraints.

5) Validation
- Run: `npm run check:contrast`, `npx prettier . --check`, `npx eslint .`, `npx vitest run`, `npx playwright test`.
- Agent‑specific checks: ensure no dynamic imports in hot paths and no unsilenced console in tests.

Notes/Assumptions
- This audit focuses on `src/pages/battleCLI.html` only; JavaScript handlers (e.g., role toggling, option rendering) are assumed to exist in `battleCLI.js`/`battleCLI.init.js`. If they don’t yet enforce the ARIA state changes described, we’ll add those in a follow‑up PR.
- If you intended a different file for the audit text, let me know and I’ll reconcile it; for now, this document supersedes the placeholder.

Next Step (awaiting your review)
- Confirm the recommendations you want implemented. I can then submit a focused patch adjusting roles/live regions, consolidating CSS, and removing unused code, followed by a quick validation run.
