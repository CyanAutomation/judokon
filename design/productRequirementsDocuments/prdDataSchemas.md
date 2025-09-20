# Data Schemas PRD

## TL;DR

This PRD defines the canonical data shapes, validation rules, and lifecycle for the project's core domain objects (e.g., `judoka`, `card`, `navigationMap`, `settings`). It establishes where schemas live, how to change them, and the expected compatibility guarantees.

## Problem Statement / Why it matters

Inconsistent data shapes cause runtime errors, UI breakage, and brittle tests. Tests and integrations depend on stable schemas. We need a single source of truth describing canonical fields, validation, and deprecation policy.

## Goals / Success Metrics

- Provide machine-parseable canonical schemas for core objects.
- Define a clear migration and deprecation policy for schema changes.
- Ensure consumer libraries/tests validate input and fail fast when schemas change.

## User Stories

- As a backend/data author, I want to know the canonical structure of a `judoka` so I can produce valid exports.
- As a frontend engineer, I want typed/validated data so the UI fails early and gracefully.

## Prioritized Functional Requirements

P1 - Canonical Schemas: Publish canonical schemas for `judoka`, `card`, `navigationMap`, and `settings`.

Acceptance Criteria:

- Each schema exists under `src/data/schemas/` or `design/dataSchemas/` and includes field types and optionality.

## Canonical `judoka` schema (example)

Below is a minimal JSON Schema for the `judoka` object. This is a canonical example that must be reviewed and extended by the data owner.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.local/schemas/judoka.schema.json",
  "title": "Judoka",
  "type": "object",
  "required": ["id", "name", "stats"],
  "properties": {
    "id": { "type": "string", "description": "Stable unique id for the judoka" },
    "name": { "type": "string" },
    "country": { "type": "string" },
    "avatarUrl": { "type": "string", "format": "uri" },
    "stats": {
      "type": "object",
      "description": "Map of stat keys to numeric values",
      "additionalProperties": { "type": "number" }
    },
    "tags": { "type": "array", "items": { "type": "string" } },
    "releaseVersion": { "type": "string" }
  },
  "additionalProperties": false
}
```

Place this file at `design/dataSchemas/judoka.schema.json` (canonical source). A build step or copy may publish a curated set to `src/data/schemas/` for runtime/CI validation.

P1 - Validation Utilities: Provide validator utilities or schema references for runtime validation in dev/test.

Acceptance Criteria:

- A small example validator or JSON schema is present and referenced in this PRD.

### Validator guidance (example)

We recommend using a lightweight runtime validator (AJV) during development and CI to catch schema regressions early. Example usage (pseudo-code):

```js
import Ajv from 'ajv';
import judokaSchema from '../../design/dataSchemas/judoka.schema.json';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(judokaSchema);

function validateJudoka(payload) {

  const ok = validate(payload);
  if (!ok) throw new Error('Invalid judoka payload: ' + ajv.errorsText(validate.errors));
}
```

Acceptance Criteria (validator):

- A repository example exists showing how to validate a `judoka` payload using AJV or equivalent.
- CI job (or local script) can run a schema validation step against sample data and fail when validation errors exist.

P2 - Versioning & Deprecation Policy: Define minor/major change rules and how to announce/rollout changes.

Acceptance Criteria:

- Documented policy with examples (add optional field = minor; remove field = major + migration plan).

## Versioning and Change Policy (detailed)

Policy goals: make changes discoverable, testable, and minimally disruptive.

Change types:

- Patch: non-behavioral metadata changes (no schema change).
- Minor: additive changes that are backwards-compatible (adding an optional field, loosening validation where safe).
- Major: breaking changes (removing or renaming required fields, changing types) that require migration.

Required process for schema changes:

1. Update the relevant PRD (this document) with rationale, compatibility impact, and migration plan.

2. Add schema changes in a feature branch and include schema validation tests.

3. For major changes, provide a compatibility shim (e.g., transform older payloads at runtime or emit both event versions) and a migration script where needed.

4. Document the change in the project's changelog and notify stakeholders (tests, tools, and teams).

Acceptance Criteria (versioning):

- The PR that changes a schema must reference this PRD and include tests that demonstrate the impact (CI must run validation tests).
- Major changes must include a documented rollback/migration plan and a suggested deprecation period (e.g., 7 days) during which both old and new shapes are accepted.

P2 - Migration Guidance: How to perform compatible migrations, feature flags for rolling changes, and example rollback plan.

Acceptance Criteria:

- At least one migration example is included.

## Migration example (removing `legacyRank`)

Scenario: we need to remove an optional field `legacyRank` that some clients still produce.

Steps:

1. Mark `legacyRank` as deprecated in the canonical schema (add to `design/dataSchemas/judoka.schema.json` docs) and update PRD with rationale.
2. Implement a compatibility shim in the data ingestion layer that maps `legacyRank` → `metadata.legacyRank` or derives an equivalent if needed.
3. Add CI tests that validate both the pre-migration and post-migration payloads.
4. Deploy the shim and monitor errors/telemetry for 7 days.
5. After the deprecation window and stakeholder sign-off, remove `legacyRank` requirement from schema and publish major version bump.

Acceptance Criteria (migration):

- A step-by-step plan exists in the PR changing the schema and CI proves both shapes validate (shim active).
- Telemetry shows zero unhandled validation failures for 7 days before final removal.

## Non-Functional Requirements / Design Considerations

- Performance: Schema validation must be cheap; prefer build-time checks for production.
- Observability: Schema validation failures must be logged with clear payload and source.

## Governance / Ownership

- Each canonical schema MUST declare an owner (team or person) and a contact for migration / review decisions. Owners are responsible for keeping the PRD updated when making schema changes.

## Appendix

- Reference: `design/dataSchemas/README.md` and `src/data/judoka.json`.

## Dependencies and Open Questions

- Depends on `prdUpdateJudoka.md` for changes to the judoka data model.
- Open question: Do we adopt JSON Schema, TypeScript types, or both as canonical artifacts? Recommendation: keep both (JSON Schema for runtime validation, TypeScript for dev ergonomics).
