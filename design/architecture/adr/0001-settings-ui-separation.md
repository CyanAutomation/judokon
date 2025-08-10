# ADR 0001: Separate Settings Data Loading from UI Rendering

## Status

Accepted

## Context

The original `settingsPage.js` mixed responsibilities: loading settings data, handling storage updates, and manipulating the DOM. This coupling made testing difficult and obscured the boundary between data logic and UI rendering.

## Decision

- Move storage helpers `makeHandleUpdate` and `addNavResetButton` into `src/helpers/settings/` for reuse and clearer scope.
- Introduce `renderSettingsUI(settings, gameModes, tooltipMap)` that takes plain data and returns DOM, isolating rendering from data retrieval.
- Page bootstrap (`initializeSettingsPage`) now loads data and delegates DOM work to `renderSettingsUI`.

## Consequences

- Settings UI can be rendered in tests with simple data objects.
- Storage helpers are easier to maintain and reuse across modules.
- Clearer separation of concerns improves scalability of the settings system.
