# Project Architecture Overview

This document summarizes the main source folders and their responsibilities.

Throughout the project, keep modules simple. Favor small,
single-purpose functions over monolithic implementations.

## game.js

The entry point for the browser. It waits for `DOMContentLoaded` and wires up all game interactions. Helper functions are imported here to build the card carousel, fetch data, and render random judoka cards.

## helpers/

Reusable utilities organized by concern (card building, data fetching, random card generation, etc.). Each module is documented with JSDoc and `@pseudocode` blocks for clarity.
Key helpers include `generateRandomCard()` for choosing a card and `renderJudokaCard()` for injecting it into the DOM with an optional reveal animation.

`src/components/` holds reusable UI pieces. `Button.js` exposes a `createButton` helper that applies design tokens and can prepend an optional icon. Typical pages import this module along with the `setupButtonEffects` helper to keep button interactions consistent.

## page modules

HTML pages under `src/pages` each load a dedicated module located in
`src/helpers`. These modules (for example `randomJudokaPage.js` or
`settingsPage.js`) expose setup functions that attach event listeners and
initialize page-specific behavior.

## components/

Factory functions that create reusable UI elements. `Button.js` and
`ToggleSwitch.js` return styled controls. `Modal.js` builds an accessible dialog with focus trapping and open/close helpers. `StatsPanel.js` constructs
the `.card-stats` list for displaying attributes and can be reused anywhere
stats need to be shown. `Card.js` provides a reusable content panel styled with
the `.card` class. The `createModal()` factory returns `{ element, open, close }` and
automatically closes on backdrop clicks or when Escape is pressed while
keeping focus trapped inside the dialog. Pages create their content fragment,
pass it to `createModal()`, and call `open()` when needed. `StatsPanel.js`
constructs the `.card-stats` section used within judoka cards. `Card.js`
provides a reusable content panel styled with the `.card` class.

```javascript
import { createCard } from "./src/components/Card.js";
const card = createCard("<p>Hello</p>");
document.body.appendChild(card);
```

## data and schemas

Structured gameplay data lives in `src/data`. Matching JSON Schemas in `src/schemas` describe and validate these files. The `npm run validate:data` script uses Ajv to ensure data integrity.

## tests

Unit tests under `tests/` run in the Vitest `jsdom` environment. The `playwright/` directory contains end‑to‑end tests and screenshot comparisons to prevent UI regressions.
