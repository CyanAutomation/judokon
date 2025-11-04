## Task 1.1 – Create `applyLayout()` Entry Point

- Introduced `src/helpers/layoutEngine/applyLayout.js` with helpers for root resolution, feature-flag handling, and telemetry return.
- Added `src/helpers/layoutEngine/index.js` re-export and new Vitest coverage (`tests/helpers/layoutEngine/applyLayout.test.js`).
- Implemented initial validation, region positioning, and visibility toggling aligned with PRD feasibility recommendations.

**Outcome:** Layout engine core entry point created with `%`-based positioning and feature-flag aware region gating. Missing anchors and invalid layout payloads now surface structured telemetry and logger hooks.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`

## Task 1.2 – Implement `loadLayout()` Backed by Static Registry & Inline Fallback

- Added `src/helpers/layoutEngine/loadLayout.js` to resolve layouts from the generated registry or inline JSON fallback, with validation reuse and structured telemetry.
- Created `src/helpers/layoutEngine/layoutRegistry.js` registry placeholder plus re-exports in `src/helpers/layoutEngine/index.js`.
- Extended `applyLayout` to export the shared `validateLayoutDefinition`.
- Authored focused Vitest coverage (`tests/helpers/layoutEngine/loadLayout.test.js`) for registry hits, fallback resolution, and error aggregation.

**Outcome:** Layout retrieval now prioritises static registry modules while safely falling back to inline scripts, surfacing validation issues without crashing the boot path.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js tests/helpers/layoutEngine/loadLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`

## Task 3.1 – Publish Layout Schema & Generated Typings

- Added `design/specs/layoutSchema.v1.json` defining the canonical grid/region schema (bounds, rect requirements, feature-flag metadata).
- Generated shared typings in `src/layouts/types.d.ts` for editor tooling and future codegen.
- Hardened `validateLayoutDefinition` with region id dedupe, rect/bounds checks, and feature-flag validation; introduced focused Vitest coverage in `tests/helpers/layoutEngine/validateLayoutDefinition.test.js`.

**Outcome:** Layout shape is now formally documented and enforced, aligning runtime validation with the published schema to prevent out-of-bounds regions or malformed metadata.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js tests/helpers/layoutEngine/loadLayout.test.js tests/helpers/layoutEngine/validateLayoutDefinition.test.js`; `npx playwright test playwright/cli-layout.spec.js`
