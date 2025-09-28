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

- The list matches the helpers referenced in `design/testing/classicBattleTesting.md` and `prdTestMode.md#mode-interactions-and-automation-hooks`.

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

## RoundStore Centralization

RoundStore is the canonical state container for Classic Battle rounds. It consolidates round number, transition history, ready dispatch tracking, and consumer notifications so the state handler and UI share a single source of truth rather than stitching together engine reads and legacy events.

### API contract (authoritative surface)

```javascript
// Observable store imported from classicBattle helpers
import { roundStore } from "src/helpers/classicBattle/roundStore.js";

// Read current snapshot
const current = roundStore.getCurrentRound();

// Mutation entry points maintained by the state handler and orchestrator bridge
roundStore.setRoundNumber(roundNumber);
roundStore.setRoundState(nextState);
roundStore.setSelectedStat(statKey);
roundStore.setRoundOutcome(outcomePayload);

// Ready dispatch coordination
roundStore.isReadyDispatched();
roundStore.markReadyDispatched();
roundStore.resetReadyDispatch();

// Observation hooks for UI/analytics consumers
roundStore.onRoundNumberChange((newNumber, oldNumber) => {
  /* … */
});
roundStore.onRoundStateChange((newState, oldState) => {
  /* … */
});
roundStore.onStatSelected((stat) => {
  /* … */
});
roundStore.onRoundOutcome((outcome) => {
  /* … */
});

// Diagnostics
roundStore.getStateSnapshot();
roundStore.reset();
```

The state handler owns writes to the store (round numbers, transitions, ready flags) while feature consumers only subscribe or request read-only snapshots.

### Migration phases

1. **Phase 0 – Prototype (in flight):** Complete contract definition, spike integrations, and verify parity with existing debug helpers.
2. **Phase 1 – Feature-flagged writes:** Ship RoundStore behind a `roundStore.enabled` flag. The state handler and battle engine mirror all transitions into the store while legacy events remain the read path.
3. **Phase 2 – Consumer migration:** Gradually move scoreboard adapter, debug overlays, and Playwright helpers to read from RoundStore. Add assertions that compare store state with legacy events for early anomaly detection.
4. **Phase 3 – Event deprecation:** Promote RoundStore to the authoritative read model, remove redundant event listeners, and delete compatibility shims once monitoring shows no drift for two releases.

### Risks and mitigations

- **Double writes causing drift:** Gate store updates behind shared utilities so the state handler and engine call the same mutation helpers; add parity checks that fail fast when events disagree with store state.
- **Subscriber churn/perf regressions:** Provide batched notifications (`getStateSnapshot`) and encourage consumers to diff minimal fields to avoid redundant renders.
- **Feature flag rollout gaps:** Document rollout playbook (flag defaults, telemetry, rollback) alongside deployment checklists so QA can toggle without code changes.
- **Debug tooling desync:** Keep `battleDebug.logStateTransition` wired to the same RoundStore subscriptions so logs reflect store transitions rather than legacy events.

### Embedded integration example

The previous `design/roundStore/integrationExample.js` helper is represented here to guide migrations:

```javascript
roundStore.onRoundNumberChange((newNumber, oldNumber) => {
  scoreboard.updateRoundCounter(newNumber);
});

roundStore.onRoundStateChange((newState, oldState) => {
  battleDebug.logStateTransition(oldState, newState);
});

roundStore.setRoundState("cooldown");
roundStore.setSelectedStat("strength");
roundStore.setRoundOutcome("win");
```

This pattern keeps event emissions optional during migration while guaranteeing that UI and analytics modules observe consistent state via the store.

## Compliance Audit (2025-09-10)

The former `docs/technical/stateHandlerAudit.md` compliance report is now captured here to keep implementation status aligned with the product requirements.

- **States in contract**: 12
- **Total required onEnter actions**: 29
- **Implemented**: 20 (69%)
- **Missing**: 9 (31%)
- **Critical gaps**: 2 (Priority 1)

| State                    | Type    | Required Actions                                                                     | Status                         | Missing Actions                                     | Priority Notes                                                                      | Handler                          |
| ------------------------ | ------- | ------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------- |
| `waitingForMatchStart`   | initial | render:matchLobby<br>reset:scoresAndUI                                               | ✅ Fully compliant (2/2)       | —                                                   | —                                                                                   | `waitingForMatchStartEnter.js`   |
| `matchStart`             | normal  | init:matchContext<br>store:winTargetSelection<br>reset:scores<br>set:firstPlayerUser | ✅ Fully compliant (4/4)       | —                                                   | —                                                                                   | `matchStartEnter.js`             |
| `cooldown`               | normal  | timer:startShortCountdown<br>announce:nextRoundInUI                                  | ❌ Missing (0/2)               | timer:startShortCountdown<br>announce:nextRoundInUI | 🚨 Priority 1 (timer:startShortCountdown)<br>🚨 Priority 1 (announce:nextRoundInUI) | `cooldownEnter.js`               |
| `roundStart`             | normal  | draw:randomJudokaBothSides<br>reveal:roundCards<br>set:activePlayerUser              | ✅ Fully compliant (3/3)       | —                                                   | —                                                                                   | `roundStartEnter.js`             |
| `waitingForPlayerAction` | normal  | prompt:chooseStat<br>timer:startStatSelection<br>a11y:exposeTimerStatus              | ✅ Fully compliant (3/3)       | —                                                   | —                                                                                   | `waitingForPlayerActionEnter.js` |
| `roundDecision`          | normal  | compare:selectedStat<br>compute:roundOutcome<br>announce:roundOutcome                | ⚠️ Partially implemented (1/3) | compare:selectedStat<br>compute:roundOutcome        | 🚨 Priority 1 (compare:selectedStat)<br>ℹ️ Priority 3 (compute:roundOutcome)        | `roundDecisionEnter.js`          |
| `roundOver`              | normal  | update:score<br>update:UIRoundSummary                                                | ❌ Missing (0/2)               | update:score<br>update:UIRoundSummary               | ⚠️ Priority 2 (both)                                                                | `roundOverEnter.js`              |
| `matchDecision`          | normal  | compute:matchOutcome<br>render:matchSummary                                          | ❌ Missing (0/2)               | compute:matchOutcome<br>render:matchSummary         | ⚠️ Priority 2 (render:matchSummary)<br>ℹ️ Priority 3 (compute:matchOutcome)         | `matchDecisionEnter.js`          |
| `matchOver`              | final   | show:matchResultScreen                                                               | ❌ Missing (0/1)               | show:matchResultScreen                              | ⚠️ Priority 2                                                                       | `matchOverEnter.js`              |
| `interruptRound`         | normal  | timer:clearIfRunning<br>rollback:roundContextIfNeeded<br>log:analyticsInterruptRound | ✅ Fully compliant (3/3)       | —                                                   | —                                                                                   | `interruptRoundEnter.js`         |
| `roundModification`      | normal  | open:roundModificationPanel                                                          | ✅ Fully compliant (1/1)       | —                                                   | —                                                                                   | `roundModificationEnter.js`      |
| `interruptMatch`         | normal  | timer:clearIfRunning<br>teardown:matchContext<br>log:analyticsInterruptMatch         | ✅ Fully compliant (3/3)       | —                                                   | —                                                                                   | `interruptMatchEnter.js`         |

### Missing action follow-ups

- **Critical (Priority 1)**:
  - Implement `timer:startShortCountdown` (cooldown) — integrate with the shared timer utilities (`timerService`) so the countdown emits tick events that can be consumed by UI handlers.
  - Implement `announce:nextRoundInUI` (cooldown) — surface countdown updates through the snackbar / match header so players receive immediate feedback during cooldown.
  - Implement `compare:selectedStat` (roundDecision) — ensure the handler performs stat comparison, determines the winning side, and sets the payload consumed by `announce:roundOutcome`.
- **Important (Priority 2)**: Persist score/summary updates after each round, render the final match result screen, and ensure the match summary view renders on match end.
- **Nice-to-have (Priority 3)**: Complete computed outcome helpers (`compute:roundOutcome`, `compute:matchOutcome`) to align analytics with UI messaging.

### Recommended next steps

1. Address Priority 1 gaps before shipping related UI/engine changes.
2. Verify whether missing actions exist but were not detected by the audit by re-running `node scripts/auditStateHandlers.mjs` and manually inspecting the referenced handler files; if implementations exist, update the audit heuristics or document alternative patterns in this PRD.
3. Backfill unit and integration tests for any newly implemented handlers and re-run the Classic Battle end-to-end suite.

## Test Hooks / Observable Promises

The state machine exposes or coordinates the following test hooks (used by Playwright helpers and unit tests):

- `getRoundPromptPromise` — resolves when `roundPrompt` is active.
- `getCountdownStartedPromise` — resolves when `countdown` begins.
- `getRoundResolvedPromise` — resolves when `roundResolved` is entered.
- `getRoundTimeoutPromise` — resolves when `waitingForSelection` times out.
- `getStatSelectionStalledPromise` — resolves when a selection stall is detected (before auto-select).

Acceptance Criteria (test hooks):

- The list of promises and event names matches `design/testing/classicBattleTesting.md` and `prdTestMode.md#mode-interactions-and-automation-hooks`.
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
