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

A runtime layout engine decouples **UI placement** from **UI logic**, allowing for faster experimentation and unified observability.

---

## Goals

* Support applying a JSON layout file at runtime.
* Standardise on a **grid system** (e.g., 60×24) with percent-based scaling.
* Apply layouts deterministically via `data-layout-id` anchors.
* Support **feature flag conditions** (e.g., “show scoreboard only if flag X enabled”).
* Enable round-trip export/import to ASCII for auditability.
* Fail gracefully if a layout is missing, invalid, or collides.

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

---

## Constraints

* Layouts live in `src/layouts/*.layout.json`.
* Must run client-side only (no server).
* Must support all current battle modes (Classic, Quick, CLI).

---

## Open Questions

* Should we allow multiple layouts per mode (variants)?
* Should layouts be cached in localStorage for hot-swapping during playtests?

---
