# PRD: Layout Engine

---

## TL;DR

Introduce a **layout engine** that applies predefined **JavaScript-based layout modules** (ESM) at runtime to any JU-DO-KON! battle mode.  
Each layout defines the positions, sizes, and z-order of major UI regions (arena, scoreboard, hands, timer, etc.) using a **grid-based coordinate system**.  

The engine ensures layouts are **deterministic, resolution-agnostic, and feature-flag aware**, while remaining fully compatible with **static hosting on GitHub Pages** (no bundler or build pipeline required).  

Layouts are loaded synchronously as ESM modules, with a guaranteed **inline JSON fallback** embedded in the page to prevent flicker or failure on load.

---

## Problem Statement

Previously, battle modes hard-coded their DOM/CSS positioning. This caused:

- Difficulty iterating on layouts across modes.
- Inconsistent positioning and drift between releases.
- Manual CSS overrides and missing CI layout snapshots.

Early drafts proposed loading external JSON files at runtime, but this introduces timing, caching, and reliability issues on a static site.  
Instead, layouts will now be distributed as **ES module exports** for deterministic loading, combined with an **inline default layout** that guarantees startup even if a module fails to load.

This approach removes race conditions, avoids stale caches on GitHub Pages, and provides clean observability for QA and CI.

---

## Goals

- Apply layout definitions from **`.layout.js` ESM modules**, not runtime JSON fetches.  
- Maintain support for **grid definitions** (e.g. 60×24) with percent-based scaling.  
- Apply layouts deterministically via `[data-layout-id]` anchors.  
- Respect **feature-flag conditions** (e.g., “show scoreboard only if flag X enabled”).  
- Support ASCII export/import for CI verification.  
- Fail gracefully if a layout is missing, invalid, or collides.  
- Complete layout application within **50 ms average runtime**.  
- Ensure layouts remain deterministic and testable with **Vitest** and **Playwright**.

---

## Non-Goals

- No interactive layout editing (see Layout Editor PRD).  
- No responsive/mobile scaling beyond grid abstraction.  
- No visual design specification (CSS theming remains separate).  

---

## Personas

- **Developer:** Commits `.layout.js` files and reviews ASCII diffs in PRs.  
- **Designer:** Defines predictable visual placements.  
- **QA Agent:** Uses ASCII export to verify layout consistency across builds.

---

## Functional Requirements

| ID    | Requirement                                                     | Priority | Notes |
|-------|-----------------------------------------------------------------|-----------|-------|
| LAY-1 | Apply a **JavaScript ESM layout module** to `#battleRoot`.      | Must | Entry point: `applyLayout()`. |
| LAY-2 | Anchor elements by `[data-layout-id]`.                          | Must | Consistent across battle modes. |
| LAY-3 | Support grid definitions (`cols`, `rows`) and percent scaling.  | Must | Default 60×24 grid. |
| LAY-4 | Apply rect (x, y, w, h) and z-order as inline styles.           | Must | |
| LAY-5 | Respect `visibleIf.featureFlag` conditions.                     | Must | Integrates with feature flag module. |
| LAY-6 | Provide **inline default fallback** when layout fails to load.  | Must | Guarantees deterministic boot. |
| LAY-7 | Export current DOM layout to ASCII + JSON.                      | Should | For CI and auditability. |
| LAY-8 | Validate layout shape and version at runtime.                   | Should | Lightweight schema check (no Ajv dependency). |
| LAY-9 | Log applied layout + ASCII snapshot in debug panel.             | Could | For observability and testing. |

---

## Acceptance Criteria

- Given a valid `.layout.js` module, calling `applyLayout()` **positions all components correctly** within 50 ms average runtime.  
- If a feature flag is disabled, its region **is not rendered**.  
- If a layout import fails or is invalid, the **inline default JSON layout** applies automatically.  
- ASCII output matches the expected token map for CI comparison.  
- No visible flicker occurs between page load and layout application.  

---

## Constraints

- Layouts live under `src/layouts/*.layout.js`.  
- Must operate entirely client-side on GitHub Pages (no server fetch).  
- Support all active battle modes: Classic, Quick, CLI.  
- Use **ES module imports** (`import layout from '/layouts/classic.layout.js'`) with optional `?layout=` URL parameter for testing.  

---

## Edge Cases / Failure States

- **Missing Module File:** Fallback to inline default layout; log warning.  
- **Invalid Module Structure:** Log error and use inline default.  
- **Duplicate `data-layout-id`:** Log conflict, apply first rect only.  
- **Missing DOM Anchor:** Log and skip.  
- **Undefined Feature Flag:** Treat as `false` and hide component.  

---

## Design and UX Considerations

- The grid abstraction must visually align to a reference ASCII rendering.  
- Example ASCII:

+————————————————————+
|                       SCOREBOARD                           |
|                                                            |
| PLAYER HAND        ARENA VIEW         OPPONENT HAND        |
|                                                            |
|                           TIMER                            |
+————————————————————+

- Layout application should happen in one animation frame (`requestAnimationFrame`) after DOM ready.  
- Page should start with `#battleRoot { visibility: hidden; }` until layout successfully applies.  
- Non-responsive by design; future mobile layouts will use separate modules.  

---

## Implementation Notes

- Inline default layout stored in `<script type="application/json" id="layout-default">…</script>`.  
- Engine attempts to `import()` the mode’s `.layout.js` file; if unavailable, parses inline JSON fallback.  
- After successful application, sets `data-layout-id` on `#battleRoot` and reveals it (`visibility: visible`).  
- Expose helper `loadLayout(modeId)` returning `{ id, grid, regions }`.  
- Lightweight validation ensures `grid.cols`, `grid.rows`, and `regions` exist.  

---

## Testing Strategy

### Vitest
- Unit-test `applyLayout()` as a pure function (DOM transform only).  
- Mock dynamic imports to simulate valid/invalid modules.  
- Validate fallback logic and feature-flag handling.  

### Playwright
- Verify that page loads hidden → layout applied → visible (no flicker).  
- Test layout switching via `?layout=` param.  
- Simulate failed imports to confirm inline default usage.  
- Snapshot ASCII export in CI to detect drift.  

---

## Open Questions

- Should the engine support live re-loading of layout modules via a debug toggle (for design playtests)?  
- Should ASCII exports include feature-flag visibility markers?  

---

## Tasks

- [ ] 1.0 Implement Layout Engine Core  
  - [ ] 1.1 Create `applyLayout()` entry point.  
  - [ ] 1.2 Implement `loadLayout()` to import `.layout.js` or use inline fallback.  
  - [ ] 1.3 Anchor elements using `[data-layout-id]`.  
  - [ ] 1.4 Apply grid rects and z-index as inline styles.  

- [ ] 2.0 Feature Flag Integration  
  - [ ] 2.1 Parse `visibleIf.featureFlag` from layout object.  
  - [ ] 2.2 Check runtime flags and toggle visibility.  

- [ ] 3.0 ASCII + JSON Export  
  - [ ] 3.1 Traverse current DOM layout.  
  - [ ] 3.2 Export positions to JSON and ASCII for CI diffing.  

- [ ] 4.0 Validation & Fallback  
  - [ ] 4.1 Validate shape/version of layout.  
  - [ ] 4.2 Log warning and apply inline default if invalid.  

- [ ] 5.0 Debug Panel  
  - [ ] 5.1 Log layout application success/failure.  
  - [ ] 5.2 Display ASCII snapshot and applied layout ID.  
