# Scoreboard Component Audit — Classic vs CLI

Date: 2025-09-11

## Summary

- Classic (src/pages/battleClassic.html) uses the shared Scoreboard component and adapter. It provides the standard DOM contract (`#round-message`, `#next-round-timer`, `#round-counter`, `#score-display`) in the header and initializes the component via `setupScoreboard` → `initScoreboard`. Classic wiring maps battle/orchestrator events to the Scoreboard API through `helpers/classicBattle/scoreboardAdapter.js` and other helpers.
- CLI (src/pages/battleCLI.html) renders a bespoke scoreboard-like UI (`#cli-round`, `#cli-countdown`, `#cli-score`) and does not initialize the shared Scoreboard. It updates its own elements directly inside `pages/battleCLI/init.js` handlers.
- PRD (design/productRequirementsDocuments/prdBattleScoreboard.md) requires a mode-agnostic, shared component that is styled/“skinned” per mode. Classic complies; CLI does not.

## Findings

### Classic (Compliant)
- DOM contract present in header:
  - `#round-message`, `#next-round-timer`, `#round-counter`, `#score-display` (src/pages/battleClassic.html)
- Initialization path:
  - `pages/battleClassic.init.js` → `helpers/setupScoreboard.js` → `components/Scoreboard.js:initScoreboard(...)`
- Event wiring:
  - `helpers/classicBattle/scoreboardAdapter.js` subscribes to `display.*` events and calls Scoreboard API
  - Additional forwarding in `helpers/classicBattle/uiService.js`
- Skinning:
  - Page includes `styles/battleClassic.css` plus shared styles; behavior is standardized, visuals are mode-specific

### CLI (Not compliant)
- DOM differs and omits standard Scoreboard nodes:
  - Uses `#cli-round`, `#cli-countdown`, `#cli-score`; only `#round-message` overlaps
- No Scoreboard init:
  - Does not import `helpers/setupScoreboard.js` or call `initScoreboard`
- Bespoke event handling:
  - `pages/battleCLI/init.js` handles `scoreboardShowMessage`, timers, scores on its own
- Styling is CLI-specific and not applied to the shared component

## Gap Analysis vs PRD

- PRD Entry Point: `helpers/battleScoreboard.js` consumes canonical events (`control.state.changed`, `round.started`, `round.timer.tick`, `round.evaluated`, `match.concluded`). The classic orchestrator emits these events, so the shared adapter can be used by CLI as well.
- Current CLI path does not initialize the shared Scoreboard or the PRD adapter.

## Proposal — Phased Alignment Plan (with Tests)

Goal: Bring CLI inline with the shared Scoreboard while avoiding regressions and preserving the terminal look via skinning.

### Phase 0 — Baseline & Guardrails
- Record current behavior in CLI:
  - Verify current scoreboard updates (`#cli-score`, `#cli-countdown`, `#round-message`) during a short match.
- Run the core validation suite:
  - `npx prettier . --check && npx eslint . && npm run check:jsdoc && npx vitest run && npx playwright test && npm run check:contrast`
  - Agent checks: `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle || true` and ensure no unsilenced `console.warn/error` in tests
- Outcome: Baseline green state + snapshots to compare post-change.

### Phase 1 — Introduce Standard Scoreboard DOM in CLI (No Behavior Change)
- Add the shared Scoreboard DOM structure to the CLI header without wiring:
  - Either statically add nodes with IDs `#round-message`, `#next-round-timer`, `#round-counter`, `#score-display` inside `<header id="cli-header">`, or programmatically call `createScoreboard(cliHeader)` from `components/Scoreboard.js`.
  - Keep existing CLI elements (`#cli-round`, `#cli-countdown`, `#cli-score`) for now.
- Apply CLI skin to the new nodes via CSS so they visually match the terminal theme (or remain hidden for the dual-write phase).
- Tests:
  - Unit: assert the new nodes exist in CLI markup after init.
  - Playwright: load CLI, assert presence and visibility states; verify existing CLI UI remains unchanged.
  - Re-run core validation suite.

### Phase 2 — Dual-Write: Wire Shared Scoreboard in CLI (Adapter + Helpers)
- Initialize the Scoreboard in CLI:
  - Import `setupScoreboard` in `pages/battleCLI.js` or `pages/battleCLI/init.js` and call `setupScoreboard({ pauseTimer, resumeTimer })` during page init.
  - Initialize PRD adapter: import `initBattleScoreboardAdapter()` from `helpers/battleScoreboard.js` once after orchestrator is up.
- Dual-write during transition:
  - Retain existing CLI handlers but augment them to also call shared Scoreboard helpers (e.g., `showMessage`, `updateTimer`, `updateScore`) until parity is verified.
- Tests:
  - Unit/integration: emit representative events (`round.started`, `round.timer.tick`, `round.evaluated`, `match.concluded`) and assert both:
    - Standard nodes update (`#round-message`, `#next-round-timer`, `#round-counter`, `#score-display`)
    - Legacy CLI nodes still correct (`#cli-round`, `#cli-countdown`, `#cli-score`)
  - Accessibility checks: confirm ARIA attributes on standard nodes.
  - Performance: ensure no dynamic imports introduced in hot paths (grep check). Re-run validation suite.

### Phase 3 — Switch Primary Rendering to Shared Scoreboard (Remove Duplication)
- Make the shared Scoreboard the source of truth in CLI:
  - Stop updating `#cli-score` and `#cli-countdown` directly; rely on Scoreboard API + adapter.
  - Update selectors in CLI tests to prefer standard IDs; keep a small shim if needed for UI text differences.
- Tests:
  - Playwright: run a match end-to-end and verify scoreboard state across phases (selection, evaluation, cooldown, match concluded).
  - Unit: assert `data-outcome` behavior via `ScoreboardView` root dataset to match PRD.
  - Re-run core validation suite.

### Phase 4 — Cleanup & Consolidation
- Remove bespoke scoreboard logic from `pages/battleCLI/init.js` and any redundant DOM.
- Keep CLI-specific styling applied to the standard nodes (skinning only).
- Prefer the PRD adapter `helpers/battleScoreboard.js` as the single scoreboard binding in both modes (deprecate mode-specific scoreboard adapters over time if appropriate).
- Tests:
  - Ensure no references remain to `#cli-score`/`#cli-countdown` in production code.
  - Final validation run (prettier, eslint, jsdoc, vitest, playwright, contrast) and agent checks.

## Concrete Change List (by phase)

- Phase 1
  - `src/pages/battleCLI.html`: add standard scoreboard nodes inside header or prepare a container for `createScoreboard(header)`
  - `src/styles/cli-immersive.css`: add styles targeting `#round-message`, `#next-round-timer`, `#round-counter`, `#score-display`

- Phase 2
  - `src/pages/battleCLI.js` / `src/pages/battleCLI/init.js`: import and call `setupScoreboard`; import and call `initBattleScoreboardAdapter`
  - Optional: augment CLI handlers to forward to Scoreboard helpers during dual-write

- Phase 3
  - `src/pages/battleCLI/init.js`: remove direct updates to `#cli-score`/`#cli-countdown`, switch to Scoreboard helpers
  - `tests/**/*`: update selectors to standard scoreboard IDs where applicable

- Phase 4
  - `src/pages/battleCLI.html` / `init.js`: remove deprecated CLI-only scoreboard elements and logic
  - `src/helpers/classicBattle/scoreboardAdapter.js`: consider deprecation in favor of PRD adapter (if/when Classic also switches)

## Test & Validation Checklist (each phase)

- Formatting/lint/docs:
  - `npx prettier . --check`
  - `npx eslint .`
  - `npm run check:jsdoc`

- Unit + Integration:
  - `npx vitest run`

- E2E:
  - `npx playwright test`

- Accessibility/contrast:
  - `npm run check:contrast`

- Data + RAG (if applicable):
  - `npm run validate:data`
  - `npm run rag:validate`

- Agent-specific checks:
  - `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null && echo "Found dynamic import in hot path" && exit 1 || true`
  - `grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js" 2>/dev/null && echo "Unsilenced console found" && exit 1 || true`

## Rollback Plan

- Phase toggles are additive and reversible. If any regression appears:
  - Disable dual-write and remove the Scoreboard init on CLI to return to the previous bespoke path.
  - Revert markup changes limited to the CLI header area.
  - Since Classic remains unchanged, overall game modes are not blocked by a CLI rollback.

## Risks & Notes

- Selector stability: updating test selectors to standard IDs should be staged to avoid breaking existing tests; maintain temporary dual assertions during Phase 2.
- Hot-path safety: avoid introducing dynamic imports in state, selection, render, or event-dispatch loops; use static imports for Scoreboard wiring in CLI.
- Parity: outcome persistence and timer cadence must match PRD expectations; rely on `helpers/battleScoreboard.js` to consume canonical events emitted by the orchestrator (`orchestrator.js`).

## Suggested Improvements to the Plan

The proposed plan is thorough and follows best practices for incremental refactoring. The following suggestions are offered to further enhance its robustness and maintainability.

### 1. Explicit Feature Flagging
The "Rollback Plan" mentions reversible toggles. This should be formalized into an explicit feature flag (e.g., `cliUseSharedScoreboard`) managed via URL parameter or `localStorage`. This would:
- **Simplify A/B testing:** Allow developers and testers to instantly switch between the legacy and new scoreboard implementations in the same environment.
- **Provide instant rollback:** If a problem is found post-deployment, the new implementation can be disabled without a code change or redeployment.
- **Improve clarity:** A named flag makes the transition state explicit in the code.

### 2. Visual Regression Testing
While the plan includes Playwright tests, it should explicitly call for **visual regression testing**.
- **Goal:** To ensure the "terminal look and feel" of the CLI is perfectly preserved after skinning the shared component.
- **Implementation:** Use Playwright's screenshot capabilities to capture baseline images in Phase 0 and compare them against screenshots from Phase 1 and Phase 3. This automatically catches subtle styling deviations (fonts, colors, layout, spacing) that functional tests would miss.

### 3. Developer-Facing Documentation (Code Comments)
During the transition (especially Phase 2: Dual-Write), the code will contain both old and new scoreboard logic.
- **Suggestion:** Add a prominent, temporary block comment in `src/pages/battleCLI/init.js`.
- **Content:** The comment should briefly explain why two scoreboard implementations coexist, state that this is part of a planned refactoring, and link to this `progress.md` document or the relevant issue tracker ticket. This will prevent developer confusion and accidental "cleanup" of the legacy code before the migration is complete.

### 4. Component-Level Tests for Skinning
The plan relies on "skinning" the shared `Scoreboard.js` component.
- **Suggestion:** Add component-level tests for `Scoreboard.js` itself (if not already present).
- **Goal:** These tests should verify that the component's logic and accessibility features remain intact when different CSS themes (skins) are applied. This proves the component is robustly "skinnable" and that the CLI theme doesn't inadvertently break it.

### 5. Telemetry for Discrepancy Monitoring (Industrial-Strength Option)
For a production-grade migration, it would be valuable to monitor for any differences between the two implementations during the dual-write phase.
- **Suggestion:** In Phase 2, add lightweight telemetry that logs a warning if the legacy UI and the new Scoreboard component would display different values (e.g., different scores or timer states).
- **Benefit:** This provides proactive, data-driven confirmation that the new implementation has reached full parity before the legacy code is removed. While potentially overkill for this project, it represents a gold standard for critical migrations.

