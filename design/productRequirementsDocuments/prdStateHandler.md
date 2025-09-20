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

## Canonical State Graph (names)

The canonical state machine for Classic Battle (starter):

- `idle` — waiting for match start
- `roundPrompt` — asking for points-to-win / round selection UI
- `countdown` — UI countdown before selection opens (optional)
- `waitingForSelection` — players can select stats
- `selectionLocked` — both selections received or auto-selected
- `resolving` — engine resolves the round
- `roundResolved` — results displayed, scoreboard updated
- `matchEnded` — match completion and cleanup

## Transitions (machine-readable table)

```json
[
  { "from": "idle", "to": "roundPrompt", "trigger": "startMatch" },
  { "from": "roundPrompt", "to": "countdown", "trigger": "confirmRounds" },
  { "from": "countdown", "to": "waitingForSelection", "trigger": "countdownFinished" },
  { "from": "waitingForSelection", "to": "selectionLocked", "trigger": "bothSelected|timeout" },
  { "from": "selectionLocked", "to": "resolving", "trigger": "resolve" },
  { "from": "resolving", "to": "roundResolved", "trigger": "resolved" },
  { "from": "roundResolved", "to": "waitingForSelection", "trigger": "nextRound|continue" },
  { "from": "roundResolved", "to": "matchEnded", "trigger": "matchComplete" }
]
```

## Default Timeout Policies (starter)

- `countdown`: 3s (configurable)
- `waitingForSelection`: 30s (P1) — if a player does not select within 30s, auto-select behavior applies (see below)
- `autoSelectDelay` (after selection stall detection): 100ms

Acceptance Criteria (timeouts):

- All time-sensitive states include documented defaults and are configurable via settings/feature flags for testMode/headless.

## Auto-select and Fallback Behavior

Auto-select rule: when a selection timeout occurs the system will choose a stat for the unresponsive player using the following priority:

1. If `autoSelectStrategy` is set to `highestStat`, choose highest stat key.

2. If `random`, choose a random valid stat.

- Missing orchestrator fallback: if the orchestrator is absent (e.g., certain CLI or test harness contexts), `handleStatSelection` must perform direct resolution paths and emit the same events as the orchestrator would.

Acceptance Criteria (fallbacks):

- Auto-select behavior is documented and deterministic in `testMode` (seeded RNG).
- Orchestrator-missing paths reproduce the same external events (same event names/payloads) so consumers are unaffected.

## Test Hooks / Observable Promises

The state machine exposes or coordinates the following test hooks (used by Playwright helpers and unit tests):

- `getRoundPromptPromise` — resolves when `roundPrompt` is active.
- `getCountdownStartedPromise` — resolves when `countdown` begins.
- `getRoundResolvedPromise` — resolves when `roundResolved` is entered.
- `getRoundTimeoutPromise` — resolves when `waitingForSelection` times out.
- `getStatSelectionStalledPromise` — resolves when a selection stall is detected (before auto-select).

Acceptance Criteria (test hooks):

- The list of promises and event names matches `design/testing/classicBattleTesting.md` and `docs/testing-modes.md`.
- Playwright fixtures and test helpers consume these promises to deterministically await state transitions.

## Recovery Paths and Error Handling

- Event emission failures: if an event cannot be emitted, the state machine retries emission twice with exponential backoff and logs the failure; tests must expect retry attempts.
- Unrecoverable errors during `resolving` should move the machine to `roundResolved` with `details.error` populated to allow UI to show an error and continue the match if possible.

Acceptance Criteria (recovery):

- Retry policy documented and example error payloads provided for consumers.

## Ownership and Change Process

- Owner: Battle Engine team (owner contact/alias should be added here).
- Any change to state names, transition triggers, or timeout semantics must be recorded in this PRD and include updated tests demonstrating behavior (happy + edge cases).

## Non-Functional Requirements / Design Considerations

- Determinism: State machine must behave identically in `testMode` with seeded RNG.
- Observability: State transitions should be emitted as events for tracing and test assertions.

## Dependencies and Open Questions

- Depends on `prdBattleEngine.md` for resolution logic.
- Open question: Should the orchestrator be split into a separate library for reuse in CLI/Headless contexts? Note: avoid dynamic imports in hot paths per architecture guidance.
