## Task 1.1 – Create `applyLayout()` Entry Point

- Introduced `src/helpers/layoutEngine/applyLayout.js` with helpers for root resolution, feature-flag handling, and telemetry return.
- Added `src/helpers/layoutEngine/index.js` re-export and new Vitest coverage (`tests/helpers/layoutEngine/applyLayout.test.js`).
- Implemented initial validation, region positioning, and visibility toggling aligned with PRD feasibility recommendations.

**Outcome:** Layout engine core entry point created with `%`-based positioning and feature-flag aware region gating. Missing anchors and invalid layout payloads now surface structured telemetry and logger hooks.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`

## Task 2.1 – Feature Flag Visibility Telemetry

- Extended `applyLayout` visibility evaluation to capture `visibleIf.featureFlag` decisions, recording whether each flag resolved true/false and which regions were skipped because of a disabled flag.
- Added telemetry surfaces (`featureFlagDecisions`, `skippedByFeatureFlag`) so debug tooling and downstream tests can assert per-region gating without scraping DOM state.
- Updated unit coverage to assert both enabled/disabled flag paths populate the new telemetry, keeping previous layout assertions intact.

**Outcome:** Feature flag integration now emits deterministic telemetry describing which regions were evaluated, their associated flag ids, and whether they rendered, satisfying the PRD requirement for observable flag-driven visibility.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`

## Task 2.2 – Check Runtime Flags & Toggle Visibility

- Wired `applyLayout` to the shared feature flag service (`featureFlags.isEnabled`) so layouts automatically respect the live runtime flag state without requiring callers to pass their own resolver.
- Added guard-rail telemetry (`featureFlagDecisions`, `skippedByFeatureFlag`) to surface which regions were hidden due to disabled flags, and expanded unit coverage to spy on the shared resolver ensuring default behavior uses it.
- Maintained animation-frame batching so flag-driven visibility changes sit within the same single-frame mutation queue established earlier.

**Outcome:** Layout regions now honor the canonical feature flag state by default, guaranteeing runtime parity with the broader app while preserving deterministic telemetry for skipped sections.

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

## Task 1.3 – Anchor Elements Using `[data-layout-id]`

- Added anchor indexing inside `applyLayout` so regions resolve `[data-layout-id]` targets once, track duplicates, and detect DOM nodes missing from the layout payload.
- Introduced telemetry for `conflictingAnchors` and `orphanedAnchors`, logging when multiple nodes share a region id or when anchors exist without a matching region; missing anchors continue to be surfaced.
- Extended unit coverage to assert duplicate handling (only the first anchor mutates) and orphan detection warnings.

**Outcome:** Layout application is now deterministic about which DOM node each region controls while surfacing stray or misconfigured anchors through structured telemetry for downstream tooling.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`

## Task 1.4 – Apply Grid Rects & Z-Index in a Single Animation Frame

- Reworked `applyLayout` to batch all DOM mutations (root annotations, visibility toggles, inline rect/z-index writes) into a single animation-frame queue with a configurable scheduler fallback for deterministic tests.
- Added mutation queue helpers plus an option to override the animation frame provider, ensuring production uses `requestAnimationFrame` while Vitest can assert both immediate and deferred flushes.
- Extended unit coverage to confirm deferred mutations do not run until the provided animation frame callback executes and updated scaffolding to stub `requestAnimationFrame` for deterministic assertions.

**Outcome:** Layout application now matches the PRD requirement of applying region bounds/z-order within a single animation frame, minimizing layout thrash while keeping telemetry synchronous and test-friendly.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`
