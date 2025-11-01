# PRD: Layout Editor

---

## TL;DR

A **browser-based layout editor** for JU-DO-KON! that allows users to **view, edit, and create** battle mode layouts.
Runs at `src/pages/layoutEditor.html`, loads existing `*.layout.json`, and provides a drag-and-drop canvas with a live battle preview.
Outputs JSON + ASCII that can be reapplied via the Layout Engine.

---

## Problem Statement

Developers currently edit layouts via CSS or JSON manually. This is error-prone, time-consuming, and hard to visualise.
We need a visual, in-project editor to accelerate iteration, enforce schema, and provide ASCII snapshots for agents/QA.

---

## Goals

* Provide an **interactive editor UI** with grid snapping and drag handles.
* Preview changes live in an iframe of the battle mode.
* Export JSON + ASCII for reuse in PRs.
* Import existing layouts (JSON or ASCII).
* Round-trip between layout files and DOM without losing fidelity.
* Store drafts in localStorage for safe iteration.

---

## Non-Goals

* Does not replace visual design (still relies on CSS themes).
* Does not handle advanced responsive/mobile layouts beyond the grid abstraction.
* Does not auto-generate rarity tier styling.

---

## Personas

* **Developer:** Wants to create/edit layouts quickly without guessing coordinates.
* **QA Agent:** Needs a reproducible ASCII snapshot for CI diffs.
* **Designer/Contributor:** Can propose new layouts without touching CSS/JS.

---

## Functional Requirements

| ID     | Requirement                                               | Priority | Notes                               |
| ------ | --------------------------------------------------------- | -------- | ----------------------------------- |
| LED-1  | Provide a canvas overlay showing component boxes.         | Must     | Snaps to grid.                      |
| LED-2  | Allow drag/resize, z-order changes, and property editing. | Must     |                                     |
| LED-3  | Load existing JSON layout into editor.                    | Must     |                                     |
| LED-4  | Export current layout as JSON file.                       | Must     | Download as `*.layout.json`.        |
| LED-5  | Export ASCII preview.                                     | Must     | With legend.                        |
| LED-6  | Import JSON or ASCII into editor.                         | Should   | Round-trip support.                 |
| LED-7  | Apply layout live to battle preview iframe.               | Should   | Uses Layout Engine.                 |
| LED-8  | Save draft layouts to localStorage.                       | Should   | Keyed by mode.                      |
| LED-9  | Toggle feature flags in editor.                           | Could    | For conditional visibility testing. |
| LED-10 | Keyboard shortcuts (nudge, snap toggle, duplicate).       | Could    | Productivity.                       |

---

## Acceptance Criteria

* Given a valid layout file, the editor **renders draggable boxes** corresponding to each component.
* When resizing/moving, the updated rect values are reflected in the exported JSON.
* Exported ASCII matches the live layout when re-applied with the Layout Engine.
* Importing an existing layout yields a visually identical arrangement in the editor.
* Applying to preview updates the battle iframe without reload.

---

## Constraints

* Must run client-side only (no backend).
* Must work with any battle mode (`battleClassic.html`, `battleQuick.html`, etc.) via iframe.
* Layout schema must match `PRD-Layout-Engine`.

---

## Open Questions

* Should the editor support multiple pages open side-by-side (compare Classic vs Quick)?
* Should we embed schema validation warnings directly in the UI?
* Should ASCII export be required in PR reviews, or optional?

---