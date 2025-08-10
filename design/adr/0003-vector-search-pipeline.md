# ADR 0003: Data-Driven Vector Search Pipeline

## Status

Accepted

## Context

The previous vector search helper used branching logic for embedding normalization and tag filtering inside `findMatches`. This made the flow rigid and difficult to extend.

## Decision

Introduce a data-driven pipeline where steps are defined as a sequence of operations (normalize, tag filter, score, limit). Each step receives and returns a state object, enabling early exits without nested branching. Embedding loading and scoring responsibilities were split into `loader.js` and `scorer.js` modules within `src/helpers/vectorSearch`.

## Consequences

- New processing steps can be added or reordered by adjusting the pipeline array.
- Loading and scoring can be tested and evolved independently.
- Tag filters that exclude all entries produce an empty result without special-case code.
