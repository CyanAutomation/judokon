# ADR 0003: Random Card Service Extraction

## Status

Accepted

## Context

`randomJudokaPage.js` mixed data loading, history state, and DOM updates, making the helper hard to test and reuse.

## Decision

Extracted data preload and history management into `randomCardService.js`. The service returns plain data and exposes a history manager so page helpers handle all DOM rendering.

## Consequences

- Presentation logic is separated from data handling.
- The service functions are reusable across potential pages that need random card data.
- History behavior can be unit tested without touching the DOM.
