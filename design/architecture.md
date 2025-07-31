# Project Architecture Overview

This document summarizes the main source folders and their responsibilities.

Throughout the project, keep modules simple. Favor small,
single-purpose functions over monolithic implementations.

## game.js

The entry point for the browser. It waits for `DOMContentLoaded` and wires up all game interactions. Helper functions are imported here to build the card carousel, fetch data, and render random judoka cards.

## helpers/

Reusable utilities organized by concern (card building, data fetching, random card generation, etc.). Each module is documented with JSDoc and `@pseudocode` blocks for clarity.
Key helpers include `generateRandomCard()` for choosing a card and `renderJudokaCard()` for injecting it into the DOM with an optional reveal animation.

`navigationBar.js` loads active game modes and injects them into the persistent bottom navigation bar defined in [prdNavigationBar.md](productRequirementsDocuments/prdNavigationBar.md). `setupBottomNavbar.js` calls this helper on DOM ready and wires up button effects so the bar is populated on every page.

`src/components/` holds reusable UI pieces. `Button.js` exposes a `createButton` helper that applies design tokens and can prepend an optional icon. Typical pages import this module along with the `setupButtonEffects` helper to keep button interactions consistent.

## page modules

HTML pages under `src/pages` each load a dedicated module located in
`src/helpers`. These modules (for example `randomJudokaPage.js` or
`settingsPage.js`) expose setup functions that attach event listeners and
initialize page-specific behavior. The change log view uses
`changeLogPage.js` to fetch `judoka.json`, sort by `lastUpdated`, and render the
20 most recent updates.

## PRD reader

`src/pages/prdViewer.html` uses the helper
`src/helpers/prdReaderPage.js` to display the Product Requirements
Documents. The Markdown files live in
`design/productRequirementsDocuments`. The helper fetches each file,
converts it with `markdownToHtml`—a wrapper around the minimal **Marked** parser (supporting headings, paragraphs, bold text, mixed ordered and unordered lists, tables, and horizontal rules rendered as `<br/><hr/><br/>` for extra spacing)—and injects the HTML into the `#prd-content` container. It also builds the sidebar list in `#prd-list` and loads the chosen document when an item is clicked. Arrow keys and swipe gestures cycle through the loaded documents, and the logo links back to `index.html`.

## components/

Factory functions that create reusable UI elements. `Button.js` and
`ToggleSwitch.js` return styled controls. `Modal.js` builds an accessible dialog with focus trapping and open/close helpers. `StatsPanel.js` constructs
the `.card-stats` list for displaying attributes and can be reused anywhere
stats need to be shown. `SidebarList.js` produces a selectable sidebar menu and
returns `{ element, select }` to control the highlighted item. `Card.js` provides
a reusable content panel styled with the `.card` class. The `createModal()` factory returns `{ element, open, close }` and
automatically closes on backdrop clicks or when Escape is pressed while
keeping focus trapped inside the dialog. Pages create their content fragment,
pass it to `createModal()`, and call `open()` when needed. `StatsPanel.js`
constructs the `.card-stats` section used within judoka cards. `Card.js`
provides a reusable content panel styled with the `.card` class.
`InfoBar.js` builds a real-time bar for classic battles. `classicBattle.js` updates it
each round via `startCountdown` and by passing the latest scores to `updateScore`
so players see messages, the countdown timer, and the current score. The
`#round-message` and `#next-round-timer` elements have `aria-live="polite"` so
screen readers announce updates, while `#score-display` uses `aria-live="off"` to
prevent repetitive announcements of the score.

After each round, `classicBattle.js` calls `battleEngine.getScores()` and forwards
the returned values to `InfoBar.updateScore`. The helper module `setupBattleInfoBar.js`
exposes this method for pages, keeping UI updates decoupled from engine logic.

```javascript
import { createCard } from "./src/components/Card.js";
const card = createCard("<p>Hello</p>");
document.body.appendChild(card);
```

## data and schemas

Structured gameplay data lives in `src/data`. Matching JSON Schemas in
`src/schemas` describe and validate these files. The file
`src/data/statNames.json` contains the canonical list of stats displayed across
the UI—changing a name here updates labels everywhere. The `npm run
validate:data` script uses Ajv to ensure data integrity.

## tooltip helper

`src/helpers/tooltip.js` displays contextual help when elements with
`data-tooltip-id` gain hover or focus. The helper loads text from
`src/data/tooltips.json` and positions a small popup near the target.
Entries in `tooltips.json` are grouped by category (for example `stat`
or `ui`), so IDs use dot notation. Initialize it after the DOM is ready
so tooltip listeners are attached.

```html
<span data-tooltip-id="draw-help">Draw a card</span>
<script type="module">
  import { onDomReady } from "../helpers/domReady.js";
  import { initTooltips } from "../helpers/tooltip.js";
  onDomReady(() => initTooltips());
</script>
```

A help icon on the Classic Battle page uses the same system:

```html
<button id="stat-help" class="info-button" data-tooltip-id="ui.selectStat">?</button>
```

## tests

Unit tests under `tests/` run in the Vitest `jsdom` environment. The `playwright/` directory contains end‑to‑end tests and screenshot comparisons to prevent UI regressions.
