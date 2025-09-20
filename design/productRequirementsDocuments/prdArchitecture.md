# Architecture PRD

## TL;DR

This PRD captures the authoritative architecture decisions and component contracts for JU-DO-KON!. It defines system boundaries, responsibilities, and stable public contracts used by other PRDs, tests, and integrations.

## Problem Statement / Why it matters

Architecture decisions are cross-cutting and affect multiple teams and features. Without a single source of truth, components drift, tests break, and integrations become brittle. This PRD centralizes those decisions so that changes are deliberate and traceable.

## Goals / Success Metrics

- Provide a concise map of core components and responsibilities.
- Define public contracts (APIs, events, data shapes) that are stable and versioned.
- Reduce integration regressions by 90% (measured by integration test failures tied to interface changes).

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

## Appendix / Sources

- See `design/architecture.md`, `design/eventNamingAudit.md`, and `design/stateHandlerAudit.md` for background.
