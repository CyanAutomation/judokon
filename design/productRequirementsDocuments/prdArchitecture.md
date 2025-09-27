# Architecture PRD

## TL;DR

This PRD captures the authoritative architecture decisions and component contracts for JU-DO-KON!. It defines system boundaries, responsibilities, and stable public contracts used by other PRDs, tests, and integrations.

## Problem Statement / Why it matters

Architecture decisions are cross-cutting and affect multiple teams and features. Without a single source of truth, components drift, tests break, and integrations become brittle. This PRD centralizes those decisions so that changes are deliberate and traceable.

## Goals / Success Metrics

- Provide a concise map of core components and responsibilities.
- Define public contracts (APIs, events, data shapes) that are stable and versioned.
- Reduce integration regressions by 90% (measured by integration test failures tied to interface changes).

## Component Responsibilities

- Battle Engine (`src/helpers/BattleEngine.js` and `src/helpers/battleEngineFacade.js`): authoritative game logic (draws, scoring, resolution). Emits canonical events used by UI and tests.
- Classic Battle UI (`src/pages/battleJudoka.html`, `src/helpers/classicBattle.js`): rendering, stat buttons, timers; consumes Battle Engine events and emits UI events.
- CLI (`src/pages/battleCLI.html`): text-mode presentation layered above the same engine and state machine.
- Data Layer (`src/data/*`): static assets (judoka.json, card data) and any canonical schema artifacts.
- RAG/Vector Search (`src/helpers/vectorSearch` / `minilm` models): search and query expansion responsibilities.
- Test Orchestration / Fixtures (`playwright/`, `tests/`): helpers and promises used to detect engine/UI readiness.

## Public Contracts Inventory (starter)

This PRD must be populated and maintained with a canonical inventory. The table below is a starter subset; owners must keep it current.

Events:

- `battle:round-start` — emitter: Battle Engine; payload: `{ roundNumber: number, playerIds: [string, string] }` — consumers: UI, CLI, tests — owner: Battle Engine.
- `battle:stat-selected` — emitter: UI/CLI; payload: `{ playerId: string, statKey: string, timestamp: string }` — consumers: Engine, tests — owner: Classic Battle UI.
- `battle:round-resolved` — emitter: Battle Engine; payload: `{ winnerId?: string, tie: boolean, details: object }` — consumers: UI, scoreboard — owner: Battle Engine.

DOM IDs / Data Attributes (see `prdBattleMarkup.md` for the full list):

- `#round-message`, `#snackbar-container`, `#battle-state-badge`, `data-stat-key`, and recommended `data-test-id` attributes.

Data Schemas:

- `judoka` (see `prdDataSchemas.md`), `card`, `navigationMap`.

## Hot-path Import Policy

Hot-path modules (those executed in timing-sensitive loops, selection handlers, or render hot paths) MUST use static imports. Dynamic imports (`await import(...)`) are allowed only for optional, heavy, or feature-flag guarded modules and must be preloaded during idle time.

Starter hot-path list (owners must keep this list current):

- `src/helpers/classicBattle.js` (selection handling, timers)
- `src/helpers/battleEngineFacade.js`
- `src/helpers/BattleEngine.js`
- `src/helpers/showSnackbar.js` (if used in round flow)

Change to any hot-path module that introduces dynamic imports requires Architecture PRD sign-off and regression tests demonstrating no measurable impact on selection latency.

## Versioning and Change Process

Public contract changes MUST follow this minimal process:

1. Update relevant PRD with rationale and migration plan.

2. Create implementation PR referencing the PRD and include unit + integration tests proving compatibility or demonstrating migration.

3. Allow a one-week deprecation window for non-breaking changes; for breaking changes, publish a migration guide and increment the contract major version.

Versioning recommendation: use `major.minor` for contracts (e.g., event v1 → v2). When publishing an incompatible change, increment major and provide a compatibility bridge when feasible (e.g., emit both v1 and v2 events for a transition period).

## Non-Functional Requirements (NFR) Summary

| Area                   | Target                                                                        |
| ---------------------- | ----------------------------------------------------------------------------- |
| Determinism (testMode) | Engine decisions reproducible with seeded RNG                                 |
| Selection latency      | UI selection handlers respond within 16ms JS main-thread budget (no blocking) |
| Vector search          | Local dev response <250ms; production targets differ by infra                 |
| Accessibility          | Keyboard navigation for primary flows, ARIA labels for key controls           |

## User Stories

- As a developer, I want to know which module owns the battle state so I can make safe changes.
- As a tester, I want stable event names and DOM contracts so Playwright tests are reliable.

## Prioritized Functional Requirements

P1 - Component Boundary Diagram: Provide a high-level diagram listing components and responsibilities (Battle Engine, UI, RAG/VectorSearch, CLI, Data Layer).

Acceptance Criteria:

- A named diagram file exists and is referenced by this PRD.

P1 - Public Contracts Inventory: A list of public APIs, events, DOM IDs, and stable data shapes with owner and versioning policy.

Acceptance Criteria:

- Each entry lists owner module, schema/location, and change process.

P2 - Hot-path Import Policy: Document which modules must use static imports (hot paths) and which may use dynamic imports with preload.

Acceptance Criteria:

- Static/dynamic import guidance is present and references `src/helpers/classicBattle.js` and related hot-path files.

P2 - Non-functional requirements summary: Latency, determinism, and observability constraints for cross-cutting components.

Acceptance Criteria:

- A short NFR table with measurable targets exists.

## Non-Functional Requirements / Design Considerations

- Determinism: Battle engine decisions must be reproducible in test mode.
- Latency: Vector search responses should be < 250ms in local development (where applicable).
- Observability: Key actions should emit events for tracing and testing.

## Dependencies and Open Questions

- Depends on `prdBattleEngine.md` for engine internals.
- Open question: Versioning scheme for events and DOM contracts (major.minor?), propose v1 semantics.

## Appendix / Next actions

- Action: Owners of Battle Engine, Classic Battle UI, and Vector Search should populate the canonical inventory section in this PRD with full contract entries and reference schemas/diagrams.

### Appendix: Project Architecture Overview (assimilated from `design/architecture.md`)

This appendix preserves the implementation and agent-facing notes from the former `design/architecture.md` and the legacy `docs/technical/architecture.md` so that architecture guidance is centralized in this PRD.

#### Entry Points

- `game.js` — exports setup helpers and the `initGame` function used across surfaces. The module imports helpers to build the card carousel, fetch JSON data, render judoka cards, and wires navigation + feature-flag hooks. It triggers initial card setup, activates navigation affordances, and performs feature-flag checks.
- `gameBootstrap.js` — lightweight bootstrap that waits for `DOMContentLoaded` and then invokes `initGame` in production contexts.

#### helpers/

Reusable utilities are organized by concern (card building, data fetching, random card generation, navigation helpers). Prefer small, single-purpose functions. Frequently used helpers include:

- `generateRandomCard()` – selects a card entry using seeded randomness.
- `renderJudokaCard()` – injects card markup into the DOM with reveal animations.
- `navigationBar.js` – injects active game modes into the persistent nav bar.
- `setupBottomNavbar.js` – wires navigation into the DOM and returns cleanup utilities.

##### helpers/navigation

- `helpers/navigation/navigationService.js` centralizes validation and URL helpers (e.g., orientation-aware routing).
- `helpers/navigation/navigationUI.js` provides DOM builders like `buildMenu(gameModes, { orientation })` and `setupHamburger(breakpoint?)`, returning either the created menu element or cleanup functions for resize listeners.

##### helpers/vector search

Vector-search pages import DOM-free utilities from `helpers/api/vectorSearchPage.js` to manage match selection, tag formatting, and MiniLM extractor loading. Page scripts remain focused on wiring the DOM while the helper handles retrieval logic.

##### helpers/country service

`helpers/api/countryService.js` loads and caches `countryCodeMapping.json`, exposing `loadCountryMapping`, `getCountryName`, and `getFlagUrl`. UI modules such as `helpers/country/codes.js` and `helpers/country/list.js` consume these APIs so that country data flows from the data file through the service to rendered flag buttons.

#### Data

- `judoka.json`, `tooltips.json`, and `cards.json` are canonical static JSON sources for stats, tooltip text, and rarity tiers.

#### Components

UI rendering logic under `/components/` is intentionally lightweight, DOM-driven, and exposes state through `data-*` attributes for observability. Key modules include:

- `Card.js` – generates complete card HTML with attached metadata.
- `TooltipManager.js` – injects tooltip spans into DOM elements.
- `StatsPanel.js` – renders interactive stat comparisons for the classic battle.

#### AI Agent Design Considerations

JU-DO-KON! is built to support AI agents in development, testing, and contribution tasks. Architecture guardrails include:

- 🏷️ **State exposure** via `data-*` attributes such as `data-stat="power"` or `data-feature="debugMode"`.
- 🧪 **Toggleable debug panels** including a battle debug overlay with copy-to-clipboard support.
- 🔗 **Stable ID/class naming** for deterministic DOM queries.
- 🧩 **Modular JS & HTML** enabling targeted edits and reuse.
- 🧭 **Observable hashes & query params** like `#mobile` or `?debug=true` to activate UI variants.

#### Annotated Key Components for Agents

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

#### Observable Features for Agent Testing

| Feature            | Observable Element    | Description                                             |
| ------------------ | --------------------- | ------------------------------------------------------- |
| Feature Flags      | `data-feature-*`      | Each flag in the Settings panel updates this attribute  |
| Layout Debug Panel | `data-debug="layout"` | Injects red outlines around DOM components              |
| Viewport Simulator | `#mobile` URL hash    | Simulates mobile layout at 375px width                  |
| Card Stats         | `data-stat="grip"`    | Embedded in rendered card DOM                           |
| Tooltip Coverage   | `data-tooltip-id`     | Indicates linked tooltip key, used to validate coverage |

#### Files and Interfaces AI Agents Should Know

| Path                                   | Purpose                                        |
| -------------------------------------- | ---------------------------------------------- |
| `/src/pages/settings.html`             | UI to toggle feature flags and debug tools     |
| `/data/judoka.json`                    | Master stat source for all cards               |
| `/data/tooltips.json`                  | Tooltip text keys and display logic            |
| `/data/cards.json`                     | Rarity tiers and card presentation rules       |
| `/components/Card.js`                  | Card rendering logic                           |
| `/components/TooltipManager.js`        | Adds `data-tooltip-id` spans                    |
| `/components/FeatureFlagController.js` | Activates features via the DOM                 |
| `/game.js`                             | Entry point that wires modules together        |
| `/helpers/`                            | Modular logic (card building, navigation, etc.)|

#### Battle State Events

- The Classic Battle orchestrator emits state transitions through `emitBattleEvent('battleStateChange', detail)` where `detail` is `{ from: string|null, to: string, event?: string|null }`.
- Consumers subscribe with `onBattleEvent('battleStateChange', handler)` and may also inspect `document.body.dataset.battleState` for compatibility/debugging.
- Transition hooks leverage helpers such as `emitDiagnostics`, `emitReadiness`, and `emitStateChange` and share an `{ event: outcome }` map for interrupt handling.

#### Classic Battle State Manager

- Core progression: `waitingForMatchStart` → `matchStart` → `cooldown` → `roundStart` → `waitingForPlayerAction` → `roundDecision` → `roundOver` → `matchDecision` → `matchOver`.
- Interrupt paths dispatch to `interruptRound` or `interruptMatch` to restart rounds, return to lobby, abort matches, or run admin-only `roundModification` flows before resuming.
- `roundManager.startRound(store)` draws cards and initializes round UI, while `roundManager.startCooldown(store)` computes cooldowns and coordinates the Next button enablement.
- When cooldown expires (or the player clicks Next), the orchestrator dispatches `ready` to trigger the following round.

#### Classic Battle Event Bus

- JU-DO-KON! uses a lightweight internal event bus (`classicBattle/battleEvents.js`) as the single source for battle events. DOM events are no longer dispatched.
- Publish events with `emitBattleEvent(type, detail)` and subscribe with `onBattleEvent(type, handler)`; the battle machine instance remains private to `orchestrator.js`, with getters exposed only for tests.

These callouts consolidate the previously scattered helper tables and observable feature lists directly within the Architecture PRD.
