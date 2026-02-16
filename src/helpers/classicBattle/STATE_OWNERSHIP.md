# Classic Battle State Ownership

Classic Battle has two distinct state layers:

- **Engine/orchestrator domain state (authoritative):** progression for selection, evaluation, cooldown, and match end.
- **`createBattleStore()` projection state (non-authoritative):** UI flags, element refs, and session/view-model mirrors used for rendering and diagnostics.

## Ownership Rules

1. Domain progression must originate from the orchestrator state machine (`createStateManager`) and engine transitions.
2. Store fields are projections only. They can mirror domain decisions but must never become transition authority.
3. Orchestrator transitions run runtime reconciliation via `reconcileProjectionAuthority()` to reject conflicting projection writes.

## Projection field groups

Defined in `stateOwnership.js`:

- `VIEW_PROJECTION_FIELDS`: UI flags, timeout refs, selected stat projection, DOM refs.
- `SESSION_PROJECTION_FIELDS`: current judoka snapshots and session mirrors (`roundsPlayed`, deck cache fields).

## Runtime desync protection

During state transitions, orchestrator reconciliation enforces invariants that prevent UI projection desync from hijacking flow:

- Outside `roundSelect`/`roundResolve`: `selectionMade=false`, `playerChoice=null`
- In `roundSelect`: `roundReadyForInput=true`
- Outside `roundSelect`: `roundReadyForInput=false`

When conflicts are detected, orchestrator emits `battle.intent.rejected` with reason `projection.desync.rejected` and overwrites projection fields with authoritative values.
