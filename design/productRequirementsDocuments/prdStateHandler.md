# State Handler PRD

## TL;DR

Defines the canonical state machine used by Classic Battle and other orchestrated flows: states, allowed transitions, timeouts, fallbacks, and test hooks. This is the single source of truth for orchestrator behavior.

## Problem Statement / Why it matters

State logic defines game flow and timing. Tests, CLI, and UI rely on predictable states and clear transitions. Ambiguity leads to race conditions, flaky tests, and UX inconsistencies.

## Goals / Success Metrics

- Publish the full state graph and allowed transitions.
- Define timeout semantics and fallback behaviors for stalled inputs.
- Provide test hooks/promises used by Playwright and unit tests.

## User Stories

- As a QA engineer, I want exact state names and transition triggers so I can assert on them in tests.
- As a developer, I want clear fallback rules when timers elapse so the UI remains responsive.

## Prioritized Functional Requirements

P1 - State Graph: Publish the full state graph with names (e.g., idle, roundPrompt, countdown, waitingForSelection, resolving, roundResolved).

Acceptance Criteria:

- A diagram and a machine-readable list of states and transitions are included.

P1 - Timeout Policies: Define timeout durations for selection, countdown, and other time-sensitive states and specify auto-select behavior.

Acceptance Criteria:

- Each time-sensitive state includes a default timeout and the auto-select/fallback behavior.

P2 - Test Hooks: Document promises/event names exposed for tests (e.g., `getRoundPromptPromise`, `getCountdownStartedPromise`, `getRoundResolvedPromise`, `getRoundTimeoutPromise`, `getStatSelectionStalledPromise`).

Acceptance Criteria:

- The list matches the helpers referenced in `design/testing/classicBattleTesting.md` and `docs/testing-modes.md`.

P2 - Recovery Paths: Define how the state machine recovers from failed transitions (e.g., missing orchestrator, event failures).

Acceptance Criteria:

- Recovery behaviors are documented and include example error flows.

## Non-Functional Requirements / Design Considerations

- Determinism: State machine must behave identically in `testMode` with seeded RNG.
- Observability: State transitions should be emitted as events for tracing and test assertions.

## Dependencies and Open Questions

- Depends on `prdBattleEngine.md` for resolution logic.
- Open question: Should the orchestrator be split into a separate library for reuse in CLI/Headless contexts? Note: avoid dynamic imports in hot paths per architecture guidance.
