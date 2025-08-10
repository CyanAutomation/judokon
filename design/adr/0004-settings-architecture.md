# ADR 0004: Modular Settings Architecture

## Status

Accepted

## Context

`settingsUtils.js` combined schema loading, localStorage persistence, and cached access. The single module hindered reuse and obscured the boundaries between concerns, making future maintenance harder.

## Decision

Split the logic into dedicated modules:

- `settingsSchema.js` – loads the JSON schema and default settings.
- `settingsStorage.js` – handles reading, writing, and updating settings with debounced persistence.
- `settingsCache.js` – provides synchronous access to the latest settings.

A reusable `debounce` utility now lives in `src/utils/`, replacing manual timers in `saveSettings`.

## Consequences

- Clear separation of schema, persistence, and cache responsibilities.
- Shared `debounce` utility promotes consistent timing logic.
- Other helpers import only what they need, reducing coupling.
