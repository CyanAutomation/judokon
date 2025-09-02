# Retro Theme Unification Plan

## Objective

- Replace the current “High Contrast” theme with the Battle CLI “Retro” visual style across the project.
- Rename the display mode option from “High Contrast” to “Retro” in UI and code.
- Preserve accessibility and existing functionality, with a safe migration path for any persisted settings.

## Current State (Inventory)

- Settings UI: `src/pages/settings.html` exposes three display modes (light, dark, high-contrast) as radio inputs.
- Theme application: `applyDisplayMode(mode)` in `src/helpers/displayMode.js` sets `body.dataset.theme` and a `*-mode` class; valid modes include `"light"|"dark"|"high-contrast"`.
- CSS variables: `src/styles/base.css` defines `[data-theme="high-contrast"]` overrides (yellow-on-black) used sitewide.
- Schema: `src/schemas/settings.schema.json` enumerates `"light", "dark", "high-contrast"` for `displayMode`.
- Battle CLI “Retro”: `src/pages/battleCLI.html` implements a terminal-like green-on-black look via `body.cli-retro`, toggled by a CLI-specific flag (`data-flag="cliRetro"`), with tests in `tests/pages/battleCLI.retroTheme.test.js`.
- Tests referencing high contrast: `tests/helpers/displayMode.test.js`, `tests/utils/testUtils.js` construct/use `high-contrast` ids/values.

## Strategy

1. Make “Retro” the third display mode (replace the `high-contrast` mode in code and UI with `retro`).
2. Globally adopt a “retro” palette by changing the high-contrast CSS variable block to the retro style, keyed by `[data-theme="retro"]`.
3. Maintain backward compatibility for persisted `"high-contrast"` values by aliasing/mapping them to `"retro"` at runtime (one release minimum).
4. Ensure the CLI respects the global “retro” theme without breaking its local toggle:
   - Update CLI CSS selectors so both `body.cli-retro` and `body[data-theme="retro"]` trigger the same visuals.
   - Keep the CLI’s `cliRetro` toggle behavior intact (local override), but it should no longer be the only way to get the retro look.
5. Update tests, schema, and documentation to reflect the `retro` mode name.

## Tasks & Milestones

1. Naming and UI

- Update label text and aria in `src/pages/settings.html` from “High Contrast” to “Retro”.
- Update the radio input id/value to `display-mode-retro` / `value="retro"`.

2. Theme Application & CSS

- In `src/helpers/displayMode.js`, replace valid modes with `["light", "dark", "retro"]`; keep alias support for `"high-contrast"` by mapping to `"retro"` (warn once).
- In `src/styles/base.css`, replace `[data-theme="high-contrast"]` with `[data-theme="retro"]` and swap to retro variables (green-on-black). Ensure WCAG 2.1 contrast ≥ 4.5:1 for text/controls.
- Add minimal focus/link color tokens to preserve accessibility across components.

3. CLI Integration

- In `src/pages/battleCLI.html` inline styles, widen retro selectors from `body.cli-retro` to `body.cli-retro, body[data-theme="retro"]` for all retro-specific rules.
- Do not remove the CLI toggle yet; allow both the global theme and the local toggle to activate the visuals.

4. Schema and Defaults

- Update `src/schemas/settings.schema.json` enum to include `"retro"` and remove `"high-contrast"`.
- Consider a short deprecation window: optionally accept both in schema for one release, but canonicalize to `retro` when writing/saving.

5. Backward Compatibility

- When initializing display mode, map stored `"high-contrast"` to `"retro"` (and optionally save back as `retro` on next write).
- Provide a console.info/warn message once (muted in tests) to aid troubleshooting if legacy values appear.

6. Tests & Tooling

- Update tests expecting `high-contrast` to use `retro`:
  - `tests/helpers/displayMode.test.js`
  - `tests/utils/testUtils.js`
- Keep `tests/pages/battleCLI.retroTheme.test.js` intact; add a small test asserting `body[data-theme="retro"]` also yields retro styles in CLI if feasible.
- Run and fix any breakages: `npx vitest run`, `npx playwright test`.

7. Documentation & Cleanup

- Update any references in docs mentioning “High Contrast” to “Retro” where user-facing (README, agent docs if applicable).
- Ensure JSDoc `@pseudocode` and summaries reflect the new mode.
- Validate styles with `npm run check:contrast` and format/lint.

## Acceptance Criteria

- Selecting “Retro” in Settings updates `body[data-theme="retro"]` and applies the green-on-black palette sitewide.
- Battle CLI renders in retro style when either the local “Retro” toggle is on or the global theme is set to retro.
- Persisted `high-contrast` values continue to work (mapped to retro) without crashing or visual regressions.
- All tests pass after updates; contrast checks meet WCAG 2.1 AA.
- No stray references to “High Contrast” remain in UI labels or code constants (except transitional alias handling).

## Open Questions (for your review)

- Aliasing approach: Question: Do you want a temporary alias (accept `"high-contrast"` but normalize to `"retro"`), or a hard cutover (reject legacy values)? Answer: It is fine for "retro" to have an alias as "high-contrast", but "retro should be the definitive and main term in the code and in the UI
- CLI toggle scope: Question: Keep the CLI-only `cliRetro` toggle as an override, or should the CLI page strictly follow the global theme? Answer: No, the toggle in battleCLI.html should be removed, and should be served by the main site-wide "retro" toggle
- Palette specificity: Question: The CLI retro palette is very terminal-like. Should we use the exact same green (`#8cff6b`) and borders sitewide, or keep a slightly adapted token set for non-CLI pages? Answer: Yes, the "retro" style should emulate a legacy terminal, and this should apply site-wide.

## Rollout Plan

- Phase 1: Implement code changes behind alias compatibility, update tests and schema.
- Phase 2: Validate in CI (unit + e2e), verify contrast and key pages (home, settings, classic battle).
- Phase 3: Optional cleanup: remove alias acceptance in a subsequent release after confirmation.

## Done When

- The “Retro” mode is available and selectable in Settings.
- The project no longer uses “High Contrast” as a mode name in UI or code, except for transitional alias.
- Retro visuals are consistent and accessible across pages, including CLI.
- All checks pass: lint, format, unit, e2e, contrast.

---

Milestone progress

- 2025-09-02 15:00 UTC — Completed: UI rename in `settings.html` (label, id, value). Updated `applyDisplayMode` to support `retro` and map legacy `high-contrast` to `retro`. Replaced CSS theme block in `base.css` to `[data-theme="retro"]` with retro palette. Extended CLI CSS so `body[data-theme="retro"]` also renders retro look. Updated `settings.schema.json` enum to accept `retro` (and legacy `high-contrast`). Adjusted unit tests (`displayMode.test.js`, `testUtils.js`) to use `retro`.

- Next: Update any remaining docs references if present; run format/lint/tests; address failures if any.

- 2025-09-02 15:15 UTC — Completed: Removed CLI page “Retro” toggle control and its runtime wiring (`initRetroToggle`). CLI now follows the global `body[data-theme="retro"]` (and retains `applyRetroTheme` for test helper parity only).

- 2025-09-02 15:20 UTC — Completed: Normalized legacy persisted settings by mapping `displayMode: "high-contrast"` to `"retro"` in `loadSettings.js`. Linted updated files and re-ran targeted unit tests (displayMode + CLI retro): green.

- 2025-09-02 15:28 UTC — Completed (Docs Sweep): Updated design docs to reflect Retro mode replacing High Contrast where it refers to the display mode option:
  - `design/codeStandards/settingsPageDesignGuidelines.md` (theme list)
  - `design/productRequirementsDocuments/prdSettingsMenu.md` (feature table, descriptions, wireframe)
  - `design/productRequirementsDocuments/prdBattleCLI.md` (note on Retro toggle removal/sitewide mode)
  - `design/productRequirementsDocuments/prdBattleScoreboard.md` (theme reference updated to `[data-theme="retro"]`)
  - `design/productRequirementsDocuments/prdPRDViewer.md` (accessibility note)

- 2025-09-02 15:34 UTC — Completed (General Docs): Updated `README.md` Settings API with a Display Modes section noting `Light`, `Dark`, and `Retro` (terminal-style) and the `data-theme` attribute, clarifying Retro replaces High Contrast.
