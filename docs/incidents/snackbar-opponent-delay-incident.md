# Snackbar Opponent Delay Incident (Canonical Record)

## Scope

Incident affecting Classic Battle snackbar behavior where the "Opponent is choosing…" message was missing, delayed incorrectly, or persisted across round transitions.

## Timeline

| Date                     | Event                                                                                                          | Evidence                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 2025-12-31               | Opponent reveal timing logic changed to move delay into round resolve flow.                                    | Commit `671bec2`                        |
| 2025-12-31               | Snackbar stack and message contract refactor landed.                                                           | Commit `85569fd`                        |
| 2025-12-31               | Round resolution made synchronous with UI-oriented opponent delay handling.                                    | Commit `f5db8cd`                        |
| 2025-12-31 to 2026-01-05 | Failures observed in opponent snackbar scenarios; investigation docs created (`snackbarFailure.md`, QA guide). | Historical docs now archived            |
| 2026-01-01 onward        | Additional stabilization around round flow/event contracts reduced timing variance.                            | Commits `785898f`, `7424b6f`, `96a04bd` |
| Current                  | Canonical fix state tracked in this record; archive references point here.                                     | This file                               |

## Root causes (ordered by confidence)

1. **Missing or skipped dynamic UI event binding on `statSelected` path (high confidence).**
   - Failure mode: opponent snackbar pathway did not execute when handler registration was skipped or not re-established for test/bootstrap cycles.
2. **Timing coupling between opponent prompt delay and round resolution transitions (high confidence).**
   - Failure mode: prompt could appear too late, be skipped, or conflict with cooldown/next-round updates.
3. **Inconsistent diagnostic assumptions in tests for very fast transitions (medium confidence).**
   - Failure mode: tests read transient globals/DOM between state transitions and observed null/empty snapshots.
4. **Legacy investigative hypotheses around guard persistence in test harness (medium/low confidence as singular root cause).**
   - Valid as a contributor in some test contexts, but superseded by broader event/timing fixes.

## Final fix state

- Opponent delay is handled in battle UI/round flow with deterministic sequencing (static flow updates in late-2025/early-2026 commits).
- Event contracts for round evaluation/start were standardized to reduce race windows.
- Snackbar lifecycle uses centralized manager semantics with explicit display/clear behavior.
- Canonical docs moved here; earlier investigations retained only as archived context.

## Residual risks and follow-ups

- **Residual risk:** regressions can reappear if bootstrap wiring order changes in Classic/CLI battle modes.
  - **Follow-up:** keep `bindRoundUIEventHandlersDynamic()` wiring verified in both bootstraps.
- **Residual risk:** very low/zero cooldown test configs can still expose timing assumptions.
  - **Follow-up:** prefer assertions accepting valid state ranges for deterministic fast paths.
- **Residual risk:** future refactors may re-introduce duplicate/suppressed handler guards.
  - **Follow-up:** add explicit diagnostics/assertions around handler registration in integration tests.

## Test coverage status

### Unit

- `tests/classicBattle/opponent-message-handler.improved.test.js` covers delayed/immediate opponent prompt behavior.
- `tests/helpers/classicBattle/snackbar-dismissal-events.test.js` covers round-start snackbar dismissal event flow.
- `tests/classicBattle/cooldown-suppression.test.js` covers cooldown visibility interactions with opponent prompt windows.

### Playwright

- `playwright/opponent-choosing.smoke.spec.js` covers deferred vs immediate opponent snackbar presentation.
- `playwright/battle-classic/opponent-message.spec.js` and `playwright/battle-classic/opponent-reveal.spec.js` cover battle-round integration behavior.

## Archived investigation documents

- `docs/incidents/archive/snackbarFailure.md` (superseded)
- `docs/incidents/archive/opponent-delay-message.md` (partial)
