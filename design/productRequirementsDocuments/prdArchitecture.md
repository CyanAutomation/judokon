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

| Area | Target |
|------|--------|
| Determinism (testMode) | Engine decisions reproducible with seeded RNG |
| Selection latency | UI selection handlers respond within 16ms JS main-thread budget (no blocking) |
| Vector search | Local dev response <250ms; production targets differ by infra |
| Accessibility | Keyboard navigation for primary flows, ARIA labels for key controls |


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


## Appendix / Sources

- See `design/architecture.md`, `design/eventNamingAudit.md`, and `design/stateHandlerAudit.md` for background.
