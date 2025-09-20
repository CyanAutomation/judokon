# Data Schemas PRD

## TL;DR

This PRD defines the canonical data shapes, validation rules, and lifecycle for the projects core domain objects (e.g., judoka, cards, navigation maps, settings). It establishes where schemas live, how to change them, and the expected compatibility guarantees.

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


P1 - Validation Utilities: Provide validator utilities or schema references for runtime validation in dev/test.

Acceptance Criteria:

- A small example validator or JSON schema is present and referenced in this PRD.


P2 - Versioning & Deprecation Policy: Define minor/major change rules and how to announce/rollout changes.

Acceptance Criteria:

- Documented policy with examples (add optional field = minor; remove field = major + migration plan).


P2 - Migration Guidance: How to perform compatible migrations, feature flags for rolling changes, and example rollback plan.

Acceptance Criteria:

- At least one migration example is included.

## Non-Functional Requirements / Design Considerations

- Performance: Schema validation must be cheap; prefer build-time checks for production.
- Observability: Schema validation failures must be logged with clear payload and source.

## Dependencies and Open Questions

- Depends on `prdUpdateJudoka.md` for changes to the judoka data model.
- Open question: Do we adopt JSON Schema, TypeScript types, or both as canonical artifacts? Recommendation: keep both (JSON Schema for runtime validation, TypeScript for dev ergonomics).

## Appendix

- Reference: `design/dataSchemas/README.md` and `src/data/judoka.json`.
