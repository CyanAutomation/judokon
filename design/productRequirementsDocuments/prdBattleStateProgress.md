```markdown
## Title / Overview (TL;DR)

Battle State Progress — a small helper that renders and keeps in-sync a visual list of core Classic Battle states.

This module reads the embedded `CLASSIC_BATTLE_STATES` table, renders a trimmed list of core states into the
`#battle-state-progress` element (IDs < 90), listens for `battle:state` events to update the active item,
updates the compact status badge, and exposes a promise that resolves when the list has been rendered or
intentionally skipped.

## Problem Statement / Why It Matters

The Classic Battle UI needs a lightweight, testable way to show progress through the match lifecycle.
Without a single source-of-truth renderer and event handler, multiple parts of the UI could go out-of-sync
when the match advances, when admin/interrupt flows run, or when the client and server disagree on state.

This PRD documents the expected behavior so implementers and QA can validate the module and write tests.

## Goals / Success Metrics

- Keep the visual list of core battle states accurate and in sync with runtime state transitions.
- Avoid unnecessary DOM updates (render only when the DOM doesn't already match expected items).
- Resolve a ready promise so other initialization logic can wait for the list.
- Support both legacy and new `battle:state` event payloads and map non-core states to nearest core states.

Success metrics (examples):
- Rendering completes (or is intentionally skipped) in < 250ms on a typical dev machine for the standard state table.
- No console.error during normal initialization or state updates in tests.

## User Stories

- As a UI consumer, I want a deterministic list of core battle states displayed so I can see match progress.
- As a developer, I want a promise that signals when the progress list is ready so I can sequence other startup work.
- As a QA engineer, I want idempotent rendering (no unnecessary DOM churn) so tests are stable and fast.

## Functional Requirements (Prioritized)

P1 – Render Core State List
- Feature: Render a trimmed list of core states into `#battle-state-progress`.
- Description: Read `CLASSIC_BATTLE_STATES`, filter for entries with `id < 90`, sort by `id`, and create an `<li>`
	per state with `data-state` set to the state's `name` and text content equal to the numeric `id`.

P1 – Expose Ready Promise
- Feature: Provide `battleStateProgressReadyPromise` that resolves when rendering completes or is skipped.

P1 – Active State Updates
- Feature: Listen for `battle:state` events and toggle an `active` class on the matching `<li>`.

P1 – Support legacy/new event payloads
- Feature: Accept `e.detail` as a plain string (legacy) or an object shape `{ from, to }` (new), and use the
	destination state string when available.

P1 – Map non-core states to visible core states
- Feature: For interrupts/admin paths, map `interruptRound` → `cooldown`, `interruptMatch` → `matchOver`, and
	`roundModification` → `roundDecision` so the progress list still indicates a reasonable visual step.

P2 – Idempotent rendering
- Feature: If the existing list items match the expected states (names and IDs in order), skip re-rendering.

P2 – Fallback rendering when empty
- Feature: If `CLASSIC_BATTLE_STATES` is missing or contains no core states, render `<li>No states found</li>`.

P3 – Cleanup API
- Feature: Return a cleanup function that removes the `battle:state` listener.

## Acceptance Criteria

- When `#battle-state-progress` is present and `CLASSIC_BATTLE_STATES` contains core states:
	- The list contains exactly one `<li>` per core state (id < 90), in ascending id order.
	- Each `<li>` has `data-state="<stateName>"` and text content equal to the numeric id.
	- `battleStateProgressReadyPromise` resolves after rendering.

- When the existing DOM list already matches expected items (same length, each `data-state` equals expected
	name, and text content equals expected id), the module does not change `innerHTML` nor reorder nodes.

- When `CLASSIC_BATTLE_STATES` is missing or yields zero core states:
	- `#battle-state-progress` contains a single `<li>` with text `No states found` and the promise resolves.

- When a `battle:state` event is dispatched with `detail` as a string, the corresponding `<li>` receives the
	`active` class and all others are not active. `updateBattleStateBadge` is invoked with the same state value.

- When a `battle:state` event is dispatched with `detail` as an object `{ from, to }`, the `to` string must be
	used to select the active `<li>`.

- For non-core states (`interruptRound`, `interruptMatch`, `roundModification`) the UI maps to the nearest core
	visible state (`cooldown`, `matchOver`, `roundDecision` respectively) and marks that item active.

- If `document.body.dataset.battleState` contains an initial state at initialization, that state is applied
	immediately (the corresponding `<li>` is marked `active`), and `markBattlePartReady('state')` is called once.

- After the first state update (either from the initial dataset or the first `battle:state` event),
	`markBattlePartReady('state')` must be called exactly once.

- The module returns a function which, when called, removes the internal `battle:state` listener.

## Non-Functional Requirements / Design Considerations

- Performance: Avoid unnecessary DOM writes by checking whether the current list matches expected items.
- Robustness: If `document` is not available (server-side), the module should return early and the promise
	should resolve immediately (or be a resolved promise in non-browser environments).
- Testability: Expose `battleStateProgressReadyPromise` on `window` in browser environments so tests can await
	initialization.
- Accessibility: Render simple list items `<li>`; ensure any future visual focus/ARIA is layered on top of this
	structure rather than baked into it.

## Dependencies and Open Questions

- Depends on `src/helpers/classicBattle/stateTable.js` (export `CLASSIC_BATTLE_STATES`).
- Calls `updateBattleStateBadge(state)` from `src/helpers/classicBattle/uiHelpers.js`.
- Calls `markBattlePartReady('state')` from `src/helpers/battleInit.js`.

Open questions / considerations:
- Are the non-core→core mapping rules exhaustive? If more admin or interrupt states are added, the mapping
	table should be kept in sync.
- Should the list include labels (human readable state names) for better accessibility, not just numeric ids?

## Contract (Inputs / Outputs / Errors)

- Inputs: none directly; reads `CLASSIC_BATTLE_STATES` import and queries the DOM for `#battle-state-progress`
	and `document.body.dataset.battleState`.
- Outputs: returns a cleanup function (or undefined if returned early). Side-effects: DOM mutations, event
	listener registration, calls to `updateBattleStateBadge` and `markBattlePartReady`, and resolving
	`battleStateProgressReadyPromise`.
- Errors: should not throw for missing DOM or malformed `CLASSIC_BATTLE_STATES`. In non-browser contexts the
	promise resolves immediately.

## Pseudocode / Implementation Notes

1. If `document` is undefined, return early.
2. Find `#battle-state-progress`; if missing, resolve ready promise and return.
3. Read `CLASSIC_BATTLE_STATES`, filter where `id < 90`, sort ascending by `id`.
4. If resulting core list is empty, set `list.innerHTML = '<li>No states found</li>'` and resolve promise.
5. Compare existing `<li>` items to the expected list; if any mismatch render the list from scratch.
6. Resolve the ready promise.
7. Register `document` listener for `battle:state`. The handler should accept both string and `{to}` shapes.
8. Map non-core states to a visible core fallback when necessary, toggle `active` class on the matched `<li>`, and
	 call `updateBattleStateBadge(state)`.
9. If `document.body.dataset.battleState` exists, apply it immediately and call `markBattlePartReady('state')`.
10. Return a cleanup function that removes the event listener.

## Edge cases and Test Ideas

- Test server-side (no DOM): `initBattleStateProgress()` should return immediately and the exported promise
	should be a resolved promise.
- Test idempotent rendering by pre-populating `#battle-state-progress` with the expected markup and verifying
	no DOM changes occur (use a MutationObserver or compare element reference equality).
- Test fallback UI when `CLASSIC_BATTLE_STATES` is empty.
- Test mapping of `interruptRound`, `interruptMatch`, `roundModification` to expected visible states.
- Test that `markBattlePartReady('state')` is called only once, on first state application.

## Notes / Next Steps

- Add small unit/integration tests that stub `CLASSIC_BATTLE_STATES` and dispatch `battle:state` events to
	validate DOM mutations, promise resolution, badge updates, and cleanup behavior.
