# PRD: Layout Engine

---

## TL;DR

Introduce a **layout engine** that applies predefined JSON layout files at runtime to any JU-DO-KON! battle mode.
Layouts define positions, sizes, and z-order of major UI regions (arena, scoreboard, hands, timer, etc.) using a grid-based coordinate system.
The engine ensures layouts are **deterministic, resolution-agnostic, and feature-flag aware**, allowing multiple battle modes to share or override layouts cleanly.

---

## Problem Statement

Currently, battle modes hard-code their DOM/CSS positioning. This makes it difficult to:

* Iterate on layouts across modes.
* Maintain consistency and reuse.
* Validate layout drift via ASCII/CI snapshots.

For example, the QA team recently struggled to detect layout regressions across modes due to missing CI snapshots and manual CSS overrides.

A runtime layout engine decouples **UI placement** from **UI logic**, allowing for faster experimentation and unified observability.

---

## Goals

* Support applying a JSON layout file at runtime across 100% of current battle modes.
* Standardise on a **grid system** (e.g., 60×24) with percent-based scaling.
* Apply layouts deterministically via `data-layout-id` anchors.
* Support **feature flag conditions** (e.g., “show scoreboard only if flag X enabled”).
* Enable round-trip export/import to ASCII for auditability.
* Fail gracefully if a layout is missing, invalid, or collides.
* Ensure layout application completes within 50ms average runtime.

---

## Non-Goals

* Does not design layouts interactively (that belongs to the Editor PRD).
* Does not cover responsive/mobile scaling beyond the grid abstraction.
* Does not prescribe visual styles (CSS themes remain separate).

---

## Personas

* **Developer:** Wants to commit layout JSONs and review ASCII diffs in PRs.
* **Designer:** Needs predictable application of visual layouts.
* **QA Agent:** Runs automated tests to detect layout drift.

---

## Functional Requirements

| ID    | Requirement                                                    | Priority | Notes                                   |
| ----- | -------------------------------------------------------------- | -------- | --------------------------------------- |
| LAY-1 | Apply a JSON layout file to `#battleRoot` at runtime.          | Must     | Entry point: `applyLayout()`.           |
| LAY-2 | Anchor elements by `[data-layout-id]`.                         | Must     | Consistent across battle modes.         |
| LAY-3 | Support grid definitions (`cols`, `rows`) and percent scaling. | Must     | Default 60×24.                          |
| LAY-4 | Apply rect (x,y,w,h) and z-order as inline styles.             | Must     |                                         |
| LAY-5 | Respect `visibleIf.featureFlag` conditions.                    | Must     | Integrates with existing feature flags. |
| LAY-6 | Allow fallback if layout is invalid.                           | Must     | Graceful degrade: no crash.             |
| LAY-7 | Export current DOM layout to ASCII + JSON.                     | Should   | For round-trip verification.            |
| LAY-8 | Validate JSON against schema.                                  | Should   | Using Ajv.                              |
| LAY-9 | Log applied layout + ASCII snapshot in debug panel.            | Could    | For observability.                      |

---

## Acceptance Criteria

* Given a valid JSON layout, when `applyLayout()` is called, **all components move to the defined positions** without breaking page functionality.
* Given a disabled feature flag, the corresponding component is **not rendered/moved**.
* Given an invalid layout, the engine **logs a warning and leaves default CSS intact**.
* ASCII output matches expected token map when compared in CI.
* Layout must be applied within **50ms** in 95% of cases.

---

## Constraints

* Layouts live in `src/layouts/*.layout.json`.
* Must run client-side only (no server).
* Must support all current battle modes (Classic, Quick, CLI).

---

## Edge Cases / Failure States

* **Missing Layout File**: Skip layout application and log warning.
* **Invalid JSON Structure**: Log detailed validation errors, do not apply.
* **Duplicate `data-layout-id`**: Log conflict and apply first defined rect.
* **Nonexistent DOM Anchors**: Log and skip.
* **Feature flag is undefined**: Treat as `false` and hide component.

---

## Design and UX Considerations

* Layout grid abstraction should visually align to a reference ASCII rendering.
* Example ASCII:

```
+------------------------------------------------------------+
|                       SCOREBOARD                           |
|                                                            |
| PLAYER HAND        ARENA VIEW         OPPONENT HAND       |
|                                                            |
|                       TIMER                               |
+------------------------------------------------------------+
```

* Ensure layout applies cleanly on different resolutions (e.g., 1080p, 1440p).
* Do not reposition elements during window resizes (non-responsive by design).
* Consider future expansion for mobile/tablet by extending the grid spec.

---

## Open Questions

* Should we allow multiple layouts per mode (variants)?
* Should layouts be cached in localStorage for hot-swapping during playtests?

---

## Tasks

- [ ] 1.0 Implement Layout Engine Core
  - [ ] 1.1 Create `applyLayout()` entry point.
  - [ ] 1.2 Parse and validate JSON layout file.
  - [ ] 1.3 Anchor elements using `[data-layout-id]`.
  - [ ] 1.4 Apply grid-based rects and z-index as inline styles.

- [ ] 2.0 Feature Flag Integration
  - [ ] 2.1 Parse `visibleIf.featureFlag` from layout JSON.
  - [ ] 2.2 Check runtime flag status and skip hidden elements.

- [ ] 3.0 ASCII & JSON Export Functionality
  - [ ] 3.1 Traverse current DOM layout.
  - [ ] 3.2 Export positions to JSON.
  - [ ] 3.3 Render ASCII grid for CI diffing.

- [ ] 4.0 Layout Validation and Fallback
  - [ ] 4.1 Validate layout schema using Ajv.
  - [ ] 4.2 Log warning and fallback gracefully if layout fails.

- [ ] 5.0 Debug Panel Logging
  - [ ] 5.1 Log layout application success/failure.
  - [ ] 5.2 Display ASCII snapshot in dev panel.