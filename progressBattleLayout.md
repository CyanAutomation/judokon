## Task 1.1 – Create `applyLayout()` Entry Point

- Introduced `src/helpers/layoutEngine/applyLayout.js` with helpers for root resolution, feature-flag handling, and telemetry return.
- Added `src/helpers/layoutEngine/index.js` re-export and new Vitest coverage (`tests/helpers/layoutEngine/applyLayout.test.js`).
- Implemented initial validation, region positioning, and visibility toggling aligned with PRD feasibility recommendations.

**Outcome:** Layout engine core entry point created with `%`-based positioning and feature-flag aware region gating. Missing anchors and invalid layout payloads now surface structured telemetry and logger hooks.

**Tests:** `npx vitest run tests/helpers/layoutEngine/applyLayout.test.js`; `npx playwright test playwright/cli-layout.spec.js`
