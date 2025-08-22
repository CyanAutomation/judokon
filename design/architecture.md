# 🧱 Project Architecture Overview

This document summarizes the main source folders and their responsibilities.

Throughout the project, keep modules simple. Favor small, single-purpose functions over monolithic implementations.

---

## 📌 Entry Points

### `game.js`

The main entry point for the browser. It waits for `DOMContentLoaded` and wires up all game interactions.

- Imports helper functions to:
  - Build the card carousel
  - Fetch JSON data
  - Render judoka cards
- Triggers:
  - Initial card setup
  - Navigation hooks
  - Feature flag checks

---

## 🧰 helpers/

Reusable utilities organized by concern (card building, data fetching, random card generation, etc.). Each module is documented with JSDoc and `@pseudocode` blocks.

Key helpers include:

- `generateRandomCard()` – Randomly selects a card entry
- `renderJudokaCard()` – Injects the card into the DOM, supports reveal animations
- `navigationBar.js` – Injects active game modes into the persistent nav bar
- `setupBottomNavbar.js` – Wires the nav bar into the DOM

### Engine vs UI layers

Core battle logic lives in `helpers/battleEngine.js` with no DOM access. UI scripts gather values from the page and delegate to this engine through the facade in `helpers/api/battleUI.js`, which exposes pure helpers like `chooseOpponentStat()` and `evaluateRound()`. Files such as `classicBattle.js` keep DOM manipulation localized and pass raw numbers into the facade, maintaining a clear separation between presentation and game mechanics.

### helpers/navigation

Use `helpers/navigation/navigationService.js` for validation and URL helpers and `helpers/navigation/navigationUI.js` to build orientation-specific menus and responsive hamburger toggles.

```js
import { buildMenu, setupHamburger } from "../helpers/navigation/navigationUI.js";
```

- `buildMenu(gameModes, { orientation })` returns the created menu element.
- `setupHamburger(breakpoint?)` inserts a toggle button and returns a cleanup function for the resize listener.

### helpers/vector search

Vector-search pages import DOM-free utilities from `helpers/api/vectorSearchPage.js` for match selection, tag formatting, and loading the MiniLM extractor. This keeps page scripts focused on wiring the DOM.

### helpers/country service

`helpers/api/countryService.js` centralizes country code lookups and flag URL generation. It loads `countryCodeMapping.json` with caching and persists the mapping through `storage.js`. UI modules like `helpers/country/codes.js` and `helpers/country/list.js` call `loadCountryMapping`, `getCountryName`, and `getFlagUrl` so country data flows from the data file through the service into the rendered flag buttons.

---

## 📦 data/

Static JSON used throughout the game:

- `judoka.json` – Master list of judoka and their stats
- `tooltips.json` – All tooltip keys, text, and display logic
- `cards.json` – Defines rarity tier rules and UI elements

---

## 🧠 Components

UI rendering logic lives in `/components/` and is built to be:

- Lightweight and DOM-driven
- Expose internal state via `data-*` attributes
- Instrumented for AI testability

Key modules:

- `Card.js` – Generates a complete card HTML structure with attached metadata
- `TooltipManager.js` – Injects tooltip spans into DOM elements
- `StatsPanel.js` – Renders interactive game stat comparisons

---

## 🧠 AI Agent Design Considerations

JU-DO-KON! is intentionally built to support AI agents in development, testing, and contribution tasks.

Design principles include:

- 🏷️ **State exposure**: Internal game state is mirrored using `data-*` attributes  
  e.g., `data-stat="power"` or `data-feature="debugMode"`
- 🧪 **Toggleable debug panels**: Visual overlays for layout validation or test coverage
- 🔗 **Stable ID/class naming**: Predictable DOM structure for reliable querying
- 🧩 **Modular JS & HTML**: Encourages safe extension and reuse of logic
- 🧭 **Observable hashes & query params**: Modes like `#mobile` or `?debug=true` can activate UI states

AI agents are encouraged to parse, test, and modify the system using these architectural supports.

---

## 🧩 Annotated Key Components for Agents

```markdown
### Component: TooltipManager

- Loads: `/data/tooltips.json`
- Injects tooltips into: `.tooltip[data-tooltip-id]`
- Used by: card panels, game instructions, stat explanations

### Component: CardRenderer

- Reads data from: `/data/judoka.json`
- Adds: `data-stat-*` attributes for each stat category
- Observed by: AI agents comparing or extracting stat values

### Component: FeatureFlagController

- Renders flags from: `/src/pages/settings.html`
- Writes active flags to DOM via: `data-feature-*`
- Supports agent testing for: UI variants, experimental features

### Component: LayoutDebugPanel

- Controlled by: Settings toggle (`data-feature="layoutDebug"`)
- Adds outlines to all visible DOM elements for inspection
```

---

## 🔍 Observable Features for Agent Testing

| Feature            | Observable Element    | Description                                             |
| ------------------ | --------------------- | ------------------------------------------------------- |
| Feature Flags      | `data-feature-*`      | Each flag in the Settings panel updates this attribute  |
| Layout Debug Panel | `data-debug="layout"` | Injects red outlines around DOM components              |
| Viewport Simulator | `#mobile` URL hash    | Simulates mobile layout at 375px width                  |
| Card Stats         | `data-stat="grip"`    | Embedded in rendered card DOM                           |
| Tooltip Coverage   | `data-tooltip-id`     | Indicates linked tooltip key, used to validate coverage |

---

## 📚 Files and Interfaces AI Agents Should Know

| Path                                   | Purpose                                        |
| -------------------------------------- | ---------------------------------------------- |
| `/src/pages/settings.html`             | UI to toggle feature flags and debug tools     |
| `/data/judoka.json`                    | Master stat source for all cards               |
| `/data/tooltips.json`                  | Text keys used in tooltips                     |
| `/components/Card.js`                  | Card rendering logic                           |
| `/components/TooltipManager.js`        | Adds data-tooltip-id spans                     |
| `/components/FeatureFlagController.js` | Activates features via the DOM                 |
| `/game.js`                             | Entry point that wires modules together        |
| `/helpers/`                            | Modular logic (e.g. card building, navigation) |

---

## 📎 Related Docs for AI Agents

- `AGENTS.md`: Agent prompts, goals, and best practices
- `CONTRIBUTING.md`: Commit/PR rules for agents
- `README.md`: Overall project layout
