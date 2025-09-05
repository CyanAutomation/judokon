Battle Engine PRD vs Implementation — Gap Analysis

- Purpose: Compare PRD (design/productRequirementsDocuments/prdBattleEngine.md) to the current codebase and note deltas.
- Scope reviewed: Engine, Orchestrator/FSM, timers, events, and public surface used by classic battle flows.

Task Contract

{
  "inputs": [
    "design/productRequirementsDocuments/prdBattleEngine.md",
    "src/helpers/BattleEngine.js",
    "src/helpers/battleEngineFacade.js",
    "src/helpers/classicBattle/*.js",
    "src/helpers/timers/*.js"
  ],
  "outputs": [
    "progressEngine.md"
  ],
  "success": [
    "Analysis written",
    "Concrete file references",
    "Actionable follow-ups"
  ],
  "errorMode": "ask_on_public_api_change"
}

What The PRD Requires (abridged)

- Engine vs Orchestrator: Strict separation; engine owns round timer + scoring; orchestrator owns FSM, cooldowns, readiness, interrupts, and UI adapter events.
- Event taxonomy: Namespaced events (round.*, cooldown.*, control.*, interrupt.*, debug.*). Orchestrator emits control.*; engine emits domain + round timer only.
- Orchestrator interface: confirmReadiness(), requestInterrupt(scope, reason), getState() → { node, context }, injectFakeTimers(fakeTimersApi).
- State Catalog: Orchestrator publishes a versioned catalog and emits control.state.changed with context + catalogVersion after every transition.
- Determinism: Seeded randomness for reproducible outcomes; test seams for timers and snapshots.

What’s Implemented Today

- Engine core (present):
  - Implementation: `src/helpers/BattleEngine.js` with scoring, match end detection, round/cooldown timers via `TimerController`, and events (`roundStarted`, `timerTick`, `roundEnded`, `matchEnded`, `error`).
  - Facade/API: `src/helpers/battleEngineFacade.js` exposes `createBattleEngine`, `startRoundTimer/pause/resume/stop` (aliases), `getScores`, `getRoundsPlayed`, `isMatchPoint`, `getSeed`, `on/off`, `evaluateSelection` wrapper.
  - Timers: `src/helpers/TimerController.js` (preloadable utils; drift detection) and `src/helpers/timers/createRoundTimer.js` (engine-backed or JS fallback).

- Orchestrator + FSM (present):
  - State manager: `src/helpers/classicBattle/stateManager.js`, state table in `stateTable.js` (waitingForMatchStart → matchStart → cooldown → roundStart → waitingForPlayerAction → roundDecision → roundOver → matchDecision → matchOver; interrupt branches).
  - Orchestrator: `src/helpers/classicBattle/orchestrator.js` wires transitions, mirrors state to DOM, emits `battleStateChange`, and emits diagnostics `debug.transition` + `debug.state.snapshot`.
  - Handlers: `src/helpers/classicBattle/orchestratorHandlers.js` start match/cooldowns, drive selection flow, and resolve outcomes.
  - Cooldowns: Inter-round countdown owned by orchestrator via `initInterRoundCooldown()` and by `roundManager.startCooldown()` in non-orchestrated paths.

- Event emissions (partial PRD coverage):
  - Round timers: `round.timer.tick` and `round.timer.expired` from `classicBattle/timerService.js` (engine-backed `createRoundTimer`).
  - Cooldown timers: `cooldown.timer.tick/expired` from `classicBattle/roundManager.js` and `orchestratorHandlers.initInterRoundCooldown`.
  - Domain: `round.started` via `classicBattle/roundResolver.bridgeEngineEvents()`; `round.evaluated` via `classicBattle/roundResolver.computeRoundResult()`; `round.selection.locked` via `classicBattle/selectionHandler.js`.
  - Match: `match.concluded` via `bridgeEngineEvents()` mapping from engine `matchEnded`.
  - Control: `control.countdown.started` and `control.countdown.completed` emitted in `roundManager.startCooldown()` (see “Gaps” for orchestrator inconsistency).
  - Diagnostics: `debug.transition` + `debug.state.snapshot` emitted by orchestrator.

- Determinism & seeding (partial):
  - `createBattleEngine({ seed })` stores seed; facade seeds `seededRandom` via `setTestMode`.
  - Random card/opponent selection uses seeded RNG (`src/helpers/cardUtils.js`, `api/battleUI.js`).
  - Some non-critical randomness remains unseeded (e.g., resolve delay in `roundResolver.resolveRound`).

Key Deltas vs PRD

- State Catalog missing:
  - No `StateCatalog` object, no `catalogVersion`, and no `control.state.changed` emission carrying `{ from, to, context, catalogVersion }`.
  - Current practice: `battleStateChange` plus DOM `data-battle-state`, and `getStateSnapshot()` for debug only.

- Orchestrator public API shape differs:
  - No `confirmReadiness()`; readiness is an internal `dispatch('ready')` call.
  - No `requestInterrupt(scope, reason)`; callers use `dispatchBattleEvent('interrupt', payload)`.
  - No standard `getState() => { node, context }`; instead `getBattleStateMachine()` and `getStateSnapshot()` (debug-oriented).
  - No `injectFakeTimers()`; timers are injectable only indirectly (preload utils, alternate schedulers passed to helpers like `createRoundTimer`).

- Control events inconsistency:
  - `roundManager.startCooldown()` emits PRD `control.countdown.started/completed`.
  - Orchestrator’s `initInterRoundCooldown()` emits legacy `countdownStart/countdownFinished` instead of PRD control events.
  - No `control.readiness.confirmed` emission when readiness is acknowledged; only `control.readiness.required` on entering `matchStart`.

- Interrupt and validation taxonomy not surfaced:
  - No `interrupt.requested` / `interrupt.resolved` events around the FSM interrupt paths.
  - No `input.invalid` / `input.ignored` or `error.recoverable` / `error.fatal` emissions; engine only emits a generic `error` and classic flow uses internal messages.

- State naming drift (semantic equivalence, not blocking):
  - PRD: `selection`, `roundEvaluation`, `betweenRounds`, `matchEvaluation`.
  - Impl: `waitingForPlayerAction`, `roundDecision`, `roundOver`, `matchDecision`. Functionally equivalent but mismatched names; no mapping table exported.

- Engine seed usage is minimal:
  - Engine stores and exposes `getSeed()`, but outcome/duration logic inside the engine does not use the seed; determinism is realized in surrounding selection utilities. This is acceptable for outcomes, but PRD’s “engine emits deterministic outcomes” implies stronger centralization.

Low-Risk Alignments To Close Gaps

- Add `control.state.changed` emission in orchestrator:
  - Where: `src/helpers/classicBattle/orchestrator.js` on every transition.
  - Payload: `{ from, to, context: { roundIndex, scores, seed, timerState }, catalogVersion }`.
  - Source `scores`, `seed`, `timerState` from machine context/engine.

- Introduce `StateCatalog` module:
  - Where: `src/helpers/classicBattle/stateCatalog.js` exporting version, order, ids, labels, display.include.
  - Provide `catalogVersion` via orchestrator and optionally broadcast once at init via `control.state.catalog`.

- Normalize control events to PRD:
  - Update `initInterRoundCooldown()` to also emit `control.countdown.started/completed` alongside or instead of legacy names during migration.
  - Emit `control.readiness.confirmed` upon dispatching/receiving `ready` into `cooldown`.

- Public orchestrator shims (non-breaking):
  - Export tiny wrappers: `confirmReadiness() { return dispatchBattleEvent('ready'); }` and `requestInterrupt(scope, reason) { return dispatchBattleEvent('interrupt', { scope, reason }); }`.
  - Add `getState()` returning `{ node: machine.getState(), context: { roundIndex, seed, timerState } }` built from existing hooks.

- Optional: Surface interrupt/validation taxonomy:
  - Emit `interrupt.requested` when entering interrupt states and `interrupt.resolved({ outcome })` on resolution.
  - Emit `input.ignored({ kind: 'duplicateSelection' })` in `selectionHandler` when filtering invalid clicks; emit `input.invalid` where applicable.

Notes

- Hot-path import policy: `TimerController` uses dynamic import but is preloaded by orchestrator (`preloadTimerUtils()`), satisfying the “no dynamic import in hot paths” guidance.
- Tests/UI currently depend on legacy events like `battleStateChange`, `countdownStart/Finished`, `roundResolved`, `matchOver`. Any migration to PRD events should dual-emit during a deprecation window.

End State (target)

- Orchestrator emits `control.state.changed` with a stable catalog and minimal context; UI and tests consume this as the single source of truth.
- All control/cooldown/readiness events use PRD namespaced identifiers.
- Lightweight shims provide the PRD orchestrator API without removing existing helpers.
- Interrupt/validation events are available to improve observability and test coverage.


Phased Implementation Plan

Phase 0 — Scaffolding and Contracts

- Goals: Establish shared types and catalog without behavior changes.
- Tasks:
  - Add `src/helpers/classicBattle/stateCatalog.js` exporting `{ version, order, ids, labels?, display }` (maps current FSM names; version `v1`).
  - Add JSDoc `@pseudocode` blocks for all new public functions; keep functions ≤50 lines.
  - Pre-commit aliases: ensure `preloadTimerUtils()` remains called on orchestrator init to respect import policy.
- Deliverables: New module, no behavior change.
- Success: Build/tests unaffected; imports remain static on hot paths.

Phase 0 — Status

- Implemented `src/helpers/classicBattle/stateCatalog.js` exporting `{ version: "v1", order, ids, labels, display }` aligned with current FSM.
- No behavior changes; purely declarative module. No dynamic imports added.
- Next: begin Phase 1 to normalize control events.


Phase 1 — Normalize Control Events (Countdown/Readiness)

- Goals: Emit PRD control events consistently from the orchestrator; keep legacy events during migration.
- Files:
  - `src/helpers/classicBattle/orchestratorHandlers.js`
- Tasks:
  - In `initInterRoundCooldown(machine)` also emit `control.countdown.started({ durationMs })` and `control.countdown.completed()` when appropriate (dual-emit with `countdownStart/Finished`).
  - Emit `control.readiness.confirmed({ for: 'match'|'round' })` when processing `ready` that transitions to `cooldown` or `roundStart`.
- Deliverables: PRD control events present during lifecycle; legacy events preserved.
- Success: No regressions in existing tests; quick grep finds new control events.

Phase 1 — Status

- Orchestrator emits PRD control events:
  - `control.countdown.started({ durationMs })` in both `initStartCooldown` and `initInterRoundCooldown`.
  - `control.countdown.completed()` when each countdown finishes.
  - `control.readiness.confirmed({ for })` on `ready` transitions (`match` from `matchStart`, else `round`).
- Legacy `countdownStart/countdownFinished` retained for migration.
- Next: Phase 2 to emit `control.state.changed` with context and broadcast catalog at init.

Phase 2 — control.state.changed + Catalog Broadcast

- Goals: Make state transitions authoritative per PRD.
- Files:
  - `src/helpers/classicBattle/orchestrator.js`
  - `src/helpers/classicBattle/stateCatalog.js` (from Phase 0)
- Tasks:
  - In `onTransition({ from, to, event })`, assemble minimal `context` from engine:
    - `roundIndex`: `engine.getRoundsPlayed?.() ?? 0`
    - `scores`: `engine.getScores?.()`
    - `seed`: `engine.getSeed?.()`
    - `timerState`: `engine.getTimerState?.()`
  - Emit `emitBattleEvent('control.state.changed', { from, to, context, catalogVersion: catalog.version })` after DOM/debug listeners.
  - On init, broadcast `control.state.catalog` once with the catalog structure.
- Deliverables: Deterministic, idempotent state-change signal for UI/tests.
- Success: Event emitted on every transition; contains catalogVersion and context; no hot-path dynamic imports.

Phase 2 — Status

- Implemented `control.state.changed` emission in orchestrator `onTransition` with context:
  - `roundIndex`, `scores`, `seed`, and `timerState` pulled from engine.
  - Includes `catalogVersion` sourced from `stateCatalog.version`.
- Broadcast `control.state.catalog` once during orchestrator init.
- Imported `stateCatalog` statically (no hot-path dynamic import violations).
- Next: Pause for review; subsequent phases will add API shims and interrupt/validation events.

Phase 3 — Orchestrator Public API Shims

- Goals: Provide PRD-like entry points without breaking current callers.
- Files:
  - `src/helpers/classicBattle/orchestratorApi.js` (new)
  - `src/helpers/classicBattle/orchestrator.js` (export wiring)
  - `src/helpers/classicBattle.js` (re-export surface)
- Tasks:
  - `confirmReadiness(for='match'|'round')` → `dispatchBattleEvent('ready')` and emit `control.readiness.confirmed`.
  - `requestInterrupt(scope, reason)` → `dispatchBattleEvent('interrupt', { scope, reason })` and emit `interrupt.requested`.
  - `getState()` → `{ node: machine.getState(), context: { roundIndex, seed, timerState } }`.
  - `injectFakeTimers(api)` → store passed API on machine context for tests; wire where supported (e.g., scheduler-based helpers) without changing hot paths.
- Deliverables: New public shim API documented with JSDoc and pseudocode.
- Success: Shims callable in tests/CLI; no side effects unless called.

Phase 3 — Status

- Added `src/helpers/classicBattle/orchestratorApi.js` exposing:
  - `confirmReadiness(for?: 'match'|'round')` → dispatches `ready`.
  - `requestInterrupt(scope: 'round'|'match', reason?: string)` → dispatches `interrupt`.
  - `getState()` → `{ node, context: { roundIndex, seed, timerState } }`.
  - `injectFakeTimers(api)` → stores reference on machine context for tests.
- Re-exported API via `src/helpers/classicBattle.js` for consumers.
- Next: Phase 4 to surface interrupt/validation taxonomy events.

Phase 4 — Interrupt & Validation Taxonomy

- Goals: Surface PRD interrupt/validation events.
- Files:
  - `src/helpers/classicBattle/orchestratorHandlers.js`
  - `src/helpers/classicBattle/selectionHandler.js`
- Tasks:
  - Emit `interrupt.requested({ scope, reason })` on entry to `interruptRound/interruptMatch`.
  - Emit `interrupt.resolved({ outcome })` when leaving interrupt states via `restartRound|resumeLobby|abortMatch`.
  - In `validateSelectionState`, when rejecting due to duplicate or wrong-state, emit `input.ignored({ kind: 'duplicateSelection'|'invalidState', state })`.
  - Where applicable, surface `input.invalid({ kind, detail })` and `error.recoverable/fatal` in existing error paths.
- Deliverables: Additional namespaced events for observability.
- Success: Events appear under expected scenarios; no test noise (mute console in tests where needed).

Phase 4 — Status

- Emitted taxonomy events:
  - `interrupt.requested({ scope, reason })` in `dispatchBattleEvent('interrupt')`.
  - `interrupt.resolved({ outcome })` on transition events: `restartRound|resumeLobby|abortMatch` (and mapped `restartMatch→restartRound`, `toLobby→resumeLobby`).
  - `input.ignored({ kind: 'duplicateSelection'|'invalidState', state? })` from `selectionHandler.validateSelectionState`.
- No changes to core FSM; purely additional event emissions.
- Next: Pause for review; Phase 5 will address determinism of resolve delay.

Phase 5 — Determinism Touch-ups (Non-breaking)

- Goals: Reduce nondeterminism outside the engine without API changes.
- Files:
  - `src/helpers/classicBattle/roundResolver.js`
- Tasks:
  - Replace `Math.random()` delay with seeded source (e.g., `seededRandom()` already used elsewhere) while keeping defaults when seed absent.
- Deliverables: More stable timing in tests/replays under a fixed seed.
- Success: Unit tests show consistent behavior with seed set; no UX regression.

Phase 5 — Status

- Replaced `Math.random()` delay in `roundResolver.resolveRound` with `seededRandom()` to ensure deterministic opponent reveal delay when a seed is set.
- No public API changes; default delay window unchanged (300–700ms).
- Next: Pause for review; Phase 6 is migration/dual-emit cleanup planning (no code changes yet).

Phase 6 — Adoption & Dual-Emit Cleanup (Follow-up)

- Goals: Migrate consumers to PRD signals, then retire legacy ones.
- Tasks:
  - Update UI/test listeners to primarily consume `control.state.changed` and PRD event names.
  - After a burn-in period, remove legacy `countdownStart/Finished` and redundant mirrors.
- Deliverables: Cleaner event surface; smaller maintenance footprint.
- Success: CI green across vitest/playwright; no console warnings of deprecated events.

Phase 6 — Status

- Migration readiness:
  - Dual-emit in place for countdowns (`countdownStart/Finished` + `control.countdown.*`).
  - Authoritative `control.state.changed` available with `catalogVersion` and context; `control.state.catalog` broadcast on init.
  - Shims available: `confirmReadiness`, `requestInterrupt`, `getState`, `injectFakeTimers`.
- Proposed adoption steps (no code changes yet):
  - Update consumers to prefer `control.state.changed` and PRD timer/control events.
  - Add a deprecation window (e.g., one minor release) before removing legacy events.
  - After migration, remove legacy `countdownStart/Finished` mirrors and redundant cooldown wiring, and simplify tests to PRD events.
- Current phase concluded with planning only to avoid breaking changes in this cycle.

Testing & Validation Plan

- Unit (vitest):
  - `control.state.changed` fires on transitions with correct context and `catalogVersion`.
  - `control.countdown.started/completed` emitted by orchestrator; legacy still present.
  - `interrupt.requested/resolved` and `input.ignored` fire for planned scenarios.
  - Deterministic delay in `resolveRound` under seeded mode.

- E2E (playwright):
  - Classic flow: observe PRD events during countdown, selection, evaluation, and next-round readiness.
  - Assert UI reacts to `control.state.changed` (e.g., state indicator / scoreboard ready).

- Repo checks (before commit):
  - `npx prettier . --check`
  - `npx eslint .`
  - `npm run check:jsdoc`
  - `npx vitest run`
  - `npx playwright test`
  - `npm run check:contrast`
  - Optional quick checks per Agent Guide (dynamic import in hot paths; unsuppressed console in tests; JSON validation).

Risk & Mitigations

- Event surface changes could affect listeners: dual-emit during migration; add targeted tests.
- Hot-path import policy: keep all new imports static; continue preloading timer utils at orchestrator init.
- Public API shims: keep behind new module to avoid accidental tree-shaking changes.
