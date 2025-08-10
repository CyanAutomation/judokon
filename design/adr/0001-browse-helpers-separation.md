# ADR 0001: Separate Browse Judoka Helpers

## Status

Accepted

## Context

`setupCountryToggle`, `setupCountryFilter`, and the keyboard navigation logic were previously implemented inline in `browseJudokaPage.js`. The shared state (`countriesLoaded` and `allJudoka`) made these helpers harder to test and reuse.

## Decision

Extracted the helpers into dedicated modules under `src/helpers/browse/` and changed data loading to return values instead of mutating outer scope variables.

## Consequences

- Modules can be tested in isolation.
- State is derived from return values or DOM, avoiding hidden globals.
- Future browse-related helpers should follow the same separation pattern.
