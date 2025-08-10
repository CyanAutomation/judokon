# ADR 0004: Tooltip Viewer Componentization

## Status

Accepted

## Context

`tooltipViewerPage.js` mixed tooltip list rendering, JSON parse helpers and DOM
logic for expanding the preview. This made the helper large and difficult to
test in isolation.

## Decision

Moved JSON parsing and list rendering into `src/helpers/tooltipViewer/` and
introduced a reusable `PreviewToggle` component to manage preview expansion.
`tooltipViewerPage.js` now composes these utilities instead of holding the
implementation details.

## Consequences

- Tooltip viewer logic is smaller and more modular.
- Preview expansion behaviour can be reused elsewhere.
- JSON parsing helpers are available for unit testing.
