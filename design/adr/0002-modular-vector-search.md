# ADR 0002: Modular Vector Search Page Helpers

## Status

Accepted

## Context

`vectorSearchPage.js` previously contained query setup and result rendering, leading to a large, tightly coupled helper.

## Decision

Extracted `prepareSearchUi`, `getSelectedTags`, and `renderResults` into standalone modules under `src/helpers/vectorSearchPage/`. Introduced a configuration object for score classes to remove branching logic in the results table.

## Consequences

- Smaller helpers are easier to test and reuse.
- Score thresholds can be adjusted without modifying core logic.
- Future vector search enhancements can follow this modular structure.
