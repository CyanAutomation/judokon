# Tests

_Last reviewed: 2026-02-13_

## Scope
Unit and integration test suites plus shared test harness/utilities.

## Audience
Contributors adding or validating automated tests.

## Key Commands
- `npx vitest run tests/<path-or-file>.test.js` — run targeted tests for changed scope.
- `npx vitest run` — run the full unit/integration suite when scope is cross-cutting.
- `npm run test:battles:classic` — run classic battle test subset.

## Canonical Docs
- See canonical testing architecture: [`docs/TESTING_ARCHITECTURE.md`](../docs/TESTING_ARCHITECTURE.md).
- See detailed harness playbooks: [`docs/testing/`](../docs/testing/).
- See canonical testing policy + command matrix: [`prdTestingStandards.md`](../design/productRequirementsDocuments/prdTestingStandards.md).
- See contributor-level quality gate requirements: [`CONTRIBUTING.md`](../CONTRIBUTING.md).

For local helper details, see canonical docs above.
