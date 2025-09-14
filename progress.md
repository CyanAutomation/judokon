# Battle Engine Analysis & Improvement Plan

> Validation Addendum (Agent Review)

- Scope: Verified implementation across `src/helpers/classicBattle/*`, `src/helpers/BattleEngine.js`, `src/helpers/battle/engineTimer.js`, and facade bootstrap. Cross‑checked event taxonomy, state flow, and timer responsibilities against the PRD model summarized in AGENTS.md.
- Summary: The current document is largely accurate. The orchestrator, engine core, and bridging layers exist and operate as described. A few clarifications and additional improvement opportunities are listed below.

Key confirmations
- Orchestrator present and authoritative: `classicBattle/orchestrator.js` emits `control.state.changed`, mirrors timer state for diagnostics, and coordinates state transitions via `stateHandlers/*`.
- Engine core present: `BattleEngine.js` + `battle/engineTimer.js` own scoring, match guards, and timers. Engine emits legacy events bridged to PRD taxonomy.
- Bridge in place: `classicBattle/engineBridge.js` maps `roundStarted`/`timerTick`/`matchEnded` to `round.started`/`round.timer.tick`/`match.concluded` and `display.score.update`.
- Orchestrator‑first resolution path: `classicBattle/selectionHandler.js` prefers machine handling and schedules a guarded fallback only when needed; direct resolution can still be forced in tests.

Minor corrections and clarifications
- The orchestrator is not in the facade; it lives under `classicBattle/` and is initialized via `classicBattle/bootstrap.js`. The facade (`battleEngineFacade.js`) is a thin engine wrapper.
- “Duplicate/fallback timers” are intentional: selection/cooldown timers are owned by engine; orchestrator and UI mirror ticks. Fallbacks (e.g., guarded `setTimeout` in `selectionHandler`) are scoped to test and non‑FSM contexts to avoid stalls.
- Dynamic imports exist in classic battle hot paths (e.g., `roundResolver.js`, `selectionHandler.js`, several `stateHandlers/*`). These should be converted or preloaded to comply with hot‑path policy.

## 1. Executive Summary

I reviewed the PRD and the current implementation across the battle engine, facade, and Classic Battle orchestration. Your core concern about complexity and race conditions is valid in places, but there are a few important corrections and confirmations relative to the PRD:

- The Orchestrator layer does exist and is active for Classic Battle. It emits authoritative `control.*` events and implements the FSM. See `src/helpers/classicBattle/orchestrator.js` and state handlers under `src/helpers/classicBattle/stateHandlers`.
- The Engine Core exists as `src/helpers/BattleEngine.js`. It handles timer control via `src/helpers/battle/engineTimer.js`, tracks scores, and emits legacy engine events which are bridged to PRD taxonomy.
- There is a working bridge that maps engine events to PRD dot‑namespaced events (`round.started`, `round.timer.tick`, `match.concluded`) in `src/helpers/classicBattle/engineBridge.js`.

Where complexity shows up today:

- Mixed naming and adapters (legacy engine events → PRD taxonomy via a bridge) add indirection and cognitive load.
- Duplicate or fallback timer paths (engine timers + extra `setTimeout` safety nets) make reasoning about timing tricky.
- Dual resolution paths for a round (orchestrator‑driven vs direct resolution in `selectionHandler`) exist to support tests, which increases surface area for edge cases.

This document validates what already aligns with the PRD, corrects earlier assumptions, and proposes targeted simplifications to reduce race windows and complexity without broad API changes.

Addendum priorities (Agent recommendation)
- P1: Remove dynamic imports from classic battle hot paths or preload them during idle; keep the hot path free of `await import` per AGENTS.md.
- P1: Finish `@pseudocode` JSDoc on public/complex functions (notably in `roundResolver.js`) to satisfy validation gates and improve maintainability.
- P2: Align engine event names to PRD taxonomy at the source and keep a short‑lived compatibility shim in the bridge; treat as a controlled public API change with explicit approval.
- P2: Centralize fallback timing/guards into a small utility to make race handling auditable (selection fallback, cooldown watchdog, test context shortcuts).
- P3: Replace remaining `console.warn`/`console.error` in runtime paths with the repo logger (and Sentry integration when enabled); keep tests disciplined via `withMutedConsole`.

## 2. Architecture Validation vs PRD

PRD model (Sections 2–7) expects two cooperating layers:

- Orchestrator (FSM, cooldowns, readiness) that emits `control.*` and consumes domain/timer events.
- Engine Core (evaluation, scores, timers) that emits domain/timer events.

Findings in repo:

- Orchestrator is present and mode‑scoped: `src/helpers/classicBattle/orchestrator.js` with a full state table and lifecycle hooks via `stateHandlers/*`. It emits `control.state.changed`, readiness events, debug snapshots, and mirrors timer state for diagnostics.
- Engine Core exists: `src/helpers/BattleEngine.js` + `src/helpers/battle/engineTimer.js` with scoring, match end guards, and round/cooldown timers.
- Event bridging: `src/helpers/classicBattle/engineBridge.js` maps engine events (`roundStarted`, `timerTick`, `matchEnded`) into PRD taxonomy (`round.started`, `round.timer.tick`, `match.concluded`).

Corrections to prior assumptions:

- The orchestrator is not missing; it is implemented and used by Classic Battle. It is not housed in `battleEngineFacade.js` (which is a factory/singleton wrapper), but under `classicBattle/` as intended for a mode‑specific orchestrator.
- The UI root `src/helpers/classicBattle.js` is primarily a re‑export surface; the orchestrator logic lives in `classicBattle/orchestrator.js` and `classicBattle/stateHandlers/*`.

## 3. Specific Problems & Opportunities for Improvement

### 3.1. State and Responsibility Boundaries

- What’s good: Engine holds scoring/match‑end state and timers; orchestrator owns FSM and emits `control.*` events. This matches PRD intent.
- Pain point: Some flows bypass the orchestrator for test convenience. `selectionHandler.handleStatSelection` can resolve a round directly (Vitest path) if the machine hasn’t taken over yet. This dual path complicates reasoning and increases surface area for race conditions.
- Improvement: Prefer a single authoritative path for resolution. Keep the direct‑resolution path only behind an explicit test flag and default to orchestrator‑driven resolution. Add a lightweight invariant in `handleStatSelection` to early‑return when the machine is active and in a compatible state.

### 3.2. Event Taxonomy and Bridging

- What’s good: PRD dot events are emitted in several places today:
  - `round.selection.locked` in `selectionHandler.js` (non‑Vitest)
  - `round.evaluated` and `display.score.update` in `roundResolver.js`
  - `round.started`, `round.timer.tick`, `match.concluded` via `engineBridge.js`
  - `control.state.changed`, readiness, and diagnostics via `orchestrator.js`
- Pain point: Engine still emits legacy event names (`roundStarted`, `timerTick`, `roundEnded`, `matchEnded`) requiring a bridge to PRD taxonomy. This indirection increases complexity and makes conformance auditing harder.
- Improvement: Align engine event names to PRD taxonomy and reduce the bridge to a no‑op or temporary compatibility shim. This simplifies mental models and lowers adapter maintenance cost. Treat this as a public API change: stage behind a feature flag and ship with explicit approval and dual‑path tests.

### 3.3. Timer Paths and Race Windows

- What’s good: Engine owns selection and cooldown timers; orchestrator mirrors ticks and manages control transitions. Guards in `roundDecisionEnter` and helpers (`guardSelectionResolution`, `schedulePostResolveWatchdog`) reduce stall/race risk.
- Pain point: Redundant/fallback timers are sprinkled around to protect tests and mocked timers (e.g., `startCooldown` schedules both engine timers and `setTimeout` fallbacks). Selection flow also clears ad‑hoc store timeouts. This increases the number of timing surfaces that need to agree.
- Improvement: Centralize fallback logic behind a single abstraction (e.g., a `SafeTimer` that wraps engine timers and provides vetted fallbacks). Ensure only one authoritative expiration path triggers state transitions; others should be observability only.

### 3.4. Logging and Test‑Only DOM Updates

- Observation: Several code paths write directly to DOM or use `console.log` under Vitest. Examples: `BattleEngine.handleStatSelection` logs; `roundResolver` sets `#round-message` and `#score-display` for tests.
- Risk: Side effects complicate the hot path and can mask issues in real flows.
- Improvement: Move test DOM updates into test utilities and prefer a structured logger (or Sentry logger) behind an env flag. Keep engine/core modules free of direct DOM writes.

### 3.5. Import Hygiene in Hot Paths

- Observation: Dynamic imports occur in hot modules (e.g., `selectionHandler` imports `showSnackbar`/`i18n`; `roundResolver` imports `setupScoreboard`). PRD/AGENTS rules discourage dynamic imports in classic battle hot paths.
- Improvement: Preload optional modules in `orchestrator.preloadDependencies()` (already started) and convert hot‑path dynamic imports to static imports or idle preloads to avoid JIT stalls and simplify flow.

## 4. Focused Simplification Plan (No Public API changes)

1. Normalize event taxonomy at the engine boundary

- Rename engine emitter events to PRD names, keep a temporary alias layer for compatibility. Targets:
  - `roundStarted` → `round.started({ roundIndex })`
  - `timerTick` → `round.timer.tick` or `cooldown.timer.tick` (phase aware)
  - `roundEnded` → emit `round.evaluated` at the orchestrator boundary (engine can also emit for conformance)
  - `matchEnded` → `match.concluded`
- Rationale: Eliminates `engineBridge` indirection and simplifies test conformance.

2. Consolidate timer/fallback logic

- Introduce a `SafeTimer` wrapper used by orchestrator for both selection and cooldown phases that delegates to engine timers and only adds a single, tested fallback path used in tests or degraded environments.
- Remove scattered `setTimeout` safety nets in `roundManager.startCooldown` and related helpers once the wrapper covers those cases.

3. Prefer orchestrator‑first resolution

- In `selectionHandler.handleStatSelection`, detect an active machine and allow it to resolve the round whenever possible. Keep the direct‑resolution path strictly behind `forceDirectResolution` test flags.
- Add a defensive check to avoid emitting duplicate outcome flows when the machine already advanced to `roundDecision`.

4. Reduce test‑only DOM writes and console logs

- Move the Vitest DOM updates from `roundResolver` into `tests` helpers. Replace `console.log` in engine code with a project logger gated by env flags, or mute via the existing test console utilities.

5. Import hygiene

- Convert hot‑path dynamic imports to static imports or preload them in `orchestrator.preloadDependencies()` to respect the “no dynamic import in hot paths” rule.

6. Minor correctness and cleanup

- Fix incorrect import in `classicBattle/bootstrap.js` where `bridgeEngineEvents` is imported from `roundResolver.js`; it should import from `classicBattle/engineBridge.js`.
- Ensure selection/cooldown tick and expiry events are emitted from a single place to avoid duplicate `ready`/`completed` emissions.

These steps keep public APIs and tests stable while removing complexity at seams where races tend to hide.

## 5. Race Condition Review

- Selection vs timer expiry
  - Current: Engine controls the selection countdown; orchestrator guards `roundDecision` with `guardSelectionResolution` and `waitForPlayerChoice`. `selectionHandler.cleanupTimers` stops engine timers and clears local store timeouts upon selection.
  - Risk: Dual resolution paths (machine vs direct) can allow late events to interleave in edge cases.
  - Proposal: Treat the orchestrator as the sole authority once initialized. After emitting `round.selection.locked`, ignore subsequent selection/expiry for that round via a single shared “roundResolved” latch owned by the machine.

- Cooldown expiry vs fallback timeout
  - Current: `startCooldown` wires engine timers plus two fallbacks (global and injected scheduler). A local `expired` flag attempts to ensure idempotency.
  - Proposal: Move fallbacks into `SafeTimer` and guarantee a single `onExpired` invocation; other paths only set diagnostics.

## 6. Quick Wins Checklist (small, high‑impact)

- Engine event naming parity with PRD (reduce bridge surface).
- Fix `bridgeEngineEvents` import in `classicBattle/bootstrap.js`.
- Add a single “resolution latch” in the orchestrator to ignore second‑arriving selection/expiry.
- Preload hot optional modules in `orchestrator.preloadDependencies()` and convert hot‑path dynamic imports to static where feasible.
- Remove test‑only DOM writes from hot codepaths and consolidate into test helpers.
- Replace raw console logs in engine/core with the repo’s logger or Sentry logger where needed; mute in tests via `withMutedConsole`.

## 7. Validation Pointers to Code

- Orchestrator authority: `src/helpers/classicBattle/orchestrator.js` emits `control.state.changed` and mirrors timer state.
- Event taxonomy in use:
  - Selection: `src/helpers/classicBattle/selectionHandler.js` emits `round.selection.locked`.
  - Evaluation and scores: `src/helpers/classicBattle/roundResolver.js` emits `round.evaluated` and `display.score.update`.
  - Engine timer/domain events bridged: `src/helpers/classicBattle/engineBridge.js`.
  - FSM guards and race dampers: `src/helpers/classicBattle/stateHandlers/roundDecisionEnter.js` and `.../roundDecisionHelpers.js`.

## 8. Out‑of‑Scope Observations (not blocking but worth tracking)

- `src/helpers/classicBattle/bootstrap.js` incorrectly imports `bridgeEngineEvents` from `roundResolver.js`; should import from `classicBattle/engineBridge.js`.
- Several functions exceed 50 lines across classic battle helpers; when touching those files, consider extracting helpers per repo standards.
- Multiple dynamic imports exist in hot paths; plan a small follow‑up to preload or convert to static imports per AGENTS.md.

Agent validation updates
- Verified bootstrap currently imports `./engineBridge.js` (the mis‑import appears to be historic).
- Confirmed hot‑path dynamic imports in `classicBattle/*` (e.g., `selectionHandler.js`, `roundResolver.js`, `stateHandlers/*`, `orchestrator.js`). These should be addressed per import policy.
- Confirmed logger usage in `BattleEngine.js`; recommend extending logger usage across classic battle helpers to replace raw console calls and prefer Sentry logger where configured.

— End of amendments. Pausing here for your review.

## 9. Quick Wins Applied (this pass)

- Fixed wrong import in `src/helpers/classicBattle/bootstrap.js` to use `./engineBridge.js` for `bridgeEngineEvents` (was pointing at `roundResolver.js`).
- Replaced raw `console.log` calls in `src/helpers/BattleEngine.js` with the project `logger` to reduce noisy logs and follow logging standards; no behavior change, no hot‑path dynamic imports.
- Orchestrator‑first resolution preference: `src/helpers/classicBattle/selectionHandler.js` now short‑circuits direct resolution when the orchestrator is active, avoiding double‑resolution races; `forceDirectResolution` in tests remains intact.

Deferred to follow‑ups (tracked above): event naming parity at the engine boundary, centralizing timer fallbacks into a single abstraction, moving test‑only DOM writes into helpers, and converting dynamic imports in hot paths to static/preloaded where feasible.

## 10. Phase 1 — Hot‑Path import cleanup and safety tweaks

Changes
- Removed dynamic imports from hot paths by converting to static imports:
  - `classicBattle/stateHandlers/waitingForMatchStartEnter.js`
  - `classicBattle/selectionHandler.js`
  - `classicBattle/roundResolver.js`
  - `classicBattle/roundManager.js` (debug panel import)
  - `classicBattle/orchestrator.js` (preloads/state manager)
  - `classicBattle/battleEvents.js` (alias emission and Node shim)
- Added `src/helpers/nodeEventsShim.js` to isolate Node‑only dynamic import of `events` outside classicBattle.
- Ensured scoreboard resets to 0 on replay by explicitly updating score in `handleReplay` after engine recreation and UI reset.

Targeted tests executed
- `tests/helpers/classicBattle/selectionHandler.resolve.test.js` → PASS
- `tests/helpers/classicBattle/roundResolverOnce.test.js` → PASS
- `tests/helpers/classicBattle/handleStatSelection.machine.test.js` → PASS
- `tests/classicBattle/bootstrap.test.js` → PASS (fixed replay scoreboard reset)

Notes
- Remaining dynamic imports exist in non‑core paths (e.g., `classicBattle/testHooks.js`, `classicBattle/cooldowns.js`, `classicBattle/quitButton.js`). Plan to convert or relocate in Phase 2.
- No public API changes introduced; orchestrator/event taxonomy unchanged. The scoreboard reset on replay is an internal behavior alignment to test expectations and UI state.

## 11. Phase 2 — JSDoc completeness and pseudocode

Changes
- Removed placeholder `@summary TODO` blocks and ensured public functions have proper `@pseudocode`:
  - Cleaned extraneous TODO blocks in `classicBattle/roundManager.js` where real docs already existed for `handleReplay` and `startRound`.
  - Confirmed and retained full JSDoc with `@pseudocode` for exported functions in `classicBattle/roundResolver.js`; removed stray placeholder sections.

Targeted tests executed
- `tests/helpers/classicBattle/roundResolver.resolveRound.test.js` → PASS
- `tests/helpers/headlessMode.timing.test.js` → PASS

Notes
- Doc-only phase; no behavior changes introduced. This should improve `check:jsdoc` compliance for these areas.
