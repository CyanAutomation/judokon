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

**SMART Goals:**

1. **Accuracy**: The progress list must reflect the current battle state with 100% correctness across all state transitions (core and mapped non-core).
2. **Performance**: Rendering and updates must complete in <250ms on a standard dev machine and each update must finish in <16ms to avoid frame drops.
3. **Initialization**: The `battleStateProgressReadyPromise` must always resolve (rendered or skipped) before dependent logic executes.
4. **Compatibility**: The module must accept both legacy string payloads and new object `{ from, to }` payloads without error.
5. **Stability**: Rendering must be idempotent; no unnecessary DOM updates may occur if the state list already matches expectations.

**Success Metrics (examples):**
- Rendering completes (or is intentionally skipped) in < 250ms on a typical dev machine for the standard state table.
- All updates complete in <16ms during test simulations.
- No `console.error` during normal initialization or state updates in tests.

## User Stories

- As a UI consumer, I want a deterministic list of core battle states displayed so I can see match progress.
- As a developer, I want a promise that signals when the progress list is ready so I can sequence other startup work.
- As a QA engineer, I want idempotent rendering (no unnecessary DOM churn) so tests are stable and fast.

## Functional Requirements (Prioritized)

P1 – Render Core State List  
- Feature: Render a trimmed list of core states into `#battle-state-progress`.  
- Description: The module must generate one DOM element per core state (`id < 90`), ordered by ascending ID, with each element carrying both a data attribute (`data-state`) and a visible label.

P1 – Expose Ready Promise  
- Feature: Provide `battleStateProgressReadyPromise` that resolves when rendering completes or is skipped.

P1 – Active State Updates  
- Feature: Listen for `battle:state` events and update the active item by toggling an `active` class.

P1 – Support legacy/new event payloads  
- Feature: Accept `e.detail` as a plain string (legacy) or as an object `{ from, to }` (new), and always use the destination state.

P1 – Map non-core states to visible core states  
- Feature: For interrupts/admin paths, map `interruptRound` → `cooldown`, `interruptMatch` → `matchOver`, and `roundModification` → `roundDecision` so the progress list indicates a reasonable visual step.

P2 – Idempotent rendering  
- Feature: Skip rendering if the existing DOM items already match the expected list (names and IDs in order).

P2 – Fallback rendering when empty  
- Feature: If `CLASSIC_BATTLE_STATES` is missing or contains no core states, display a single fallback list item.

P3 – Cleanup API  
- Feature: Return a cleanup function that removes the `battle:state` listener.

## Acceptance Criteria

- When `#battle-state-progress` is present and `CLASSIC_BATTLE_STATES` contains core states:
	- The list contains exactly one item per core state (id < 90), in ascending id order.
	- Each item has `data-state="<stateName>"` and text content equal to the numeric id (or fallback label if accessibility requires).
	- `battleStateProgressReadyPromise` resolves after rendering.

- When the existing DOM list already matches expected items, the module does not change `innerHTML` nor reorder nodes.

- When `CLASSIC_BATTLE_STATES` is missing or yields zero core states:
	- `#battle-state-progress` contains a single fallback `<li>` with text `No states found` and the promise resolves.

- When a `battle:state` event is dispatched with `detail` as a string, the corresponding item receives the
	`active` class and all others are not active. `updateBattleStateBadge` is invoked with the same state value.

- When a `battle:state` event is dispatched with `detail` as an object `{ from, to }`, the `to` string must be
	used to select the active item.

- For non-core states (`interruptRound`, `interruptMatch`, `roundModification`) the UI maps to the nearest core
	visible state (`cooldown`, `matchOver`, `roundDecision` respectively) and marks that item active.

- If `document.body.dataset.battleState` contains an initial state at initialization, that state is applied
	immediately, and `markBattlePartReady('state')` is called once.

- After the first state update (either from the initial dataset or the first `battle:state` event),
	`markBattlePartReady('state')` must be called exactly once.

- The module returns a function which, when called, removes the internal `battle:state` listener.

- All state updates complete in <16ms during runtime.

## Non-Functional Requirements / Design Considerations

- Performance: Avoid unnecessary DOM writes by checking whether the current list matches expected items.
- Robustness: If `document` is not available (server-side), the module should return early and the promise
	should resolve immediately (or be a resolved promise in non-browser environments).
- Testability: Expose `battleStateProgressReadyPromise` on `window` in browser environments so tests can await
	initialization.
- Accessibility: Ensure each item has both a numeric id and (if available) a human-readable label for screen readers. If only ids are displayed, an ARIA label must provide descriptive text.
- UX: Provide a simple, clean visual list. Future iterations may enhance with styling, icons, or ARIA roles, but the initial design prioritizes clarity and lightweight markup.
- Mockups: Include a minimal wireframe showing the vertical list of states with one highlighted “active” item.

## Dependencies and Open Questions

- Depends on `src/helpers/classicBattle/stateTable.js` (export `CLASSIC_BATTLE_STATES`).
- Calls `updateBattleStateBadge(state)` from `src/helpers/classicBattle/uiHelpers.js`.
- Calls `markBattlePartReady('state')` from `src/helpers/battleInit.js`.

Open questions / considerations:
- Are the non-core→core mapping rules exhaustive? If more admin or interrupt states are added, the mapping
	table should be kept in sync.
- Should the list include labels (human readable state names) for better accessibility, not just numeric ids? (Recommended: yes.)

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
5. Compare existing items to the expected list; if any mismatch render the list from scratch.
6. Resolve the ready promise.
7. Register `document` listener for `battle:state`. The handler should accept both string and `{to}` shapes.
8. Map non-core states to a visible core fallback when necessary, toggle `active` class on the matched item, and
	 call `updateBattleStateBadge(state)`.
9. If `document.body.dataset.battleState` exists, apply it immediately and call `markBattlePartReady('state')`.
10. Return a cleanup function that removes the event listener.

## Edge cases and Test Ideas

- Test server-side (no DOM): `initBattleStateProgress()` should return immediately and the exported promise
	should be a resolved promise.
- Test idempotent rendering by pre-populating `#battle-state-progress` with the expected markup and verifying
	no DOM changes occur.
- Test fallback UI when `CLASSIC_BATTLE_STATES` is empty.
- Test mapping of `interruptRound`, `interruptMatch`, `roundModification` to expected visible states.
- Test that `markBattlePartReady('state')` is called only once, on first state application.
- Test malformed event payloads (e.g., missing `detail`) and confirm no crashes occur.

## Notes / Next Steps

- Add small unit/integration tests that stub `CLASSIC_BATTLE_STATES` and dispatch `battle:state` events to
	validate DOM mutations, promise resolution, badge updates, and cleanup behavior.
- Provide a minimal mockup showing the list of states with one active.
- Decide on inclusion of human-readable labels for accessibility.

---

## Tasks

- [ ] 1.0 Core State List Rendering
  - [ ] 1.1 Import and filter `CLASSIC_BATTLE_STATES` (id < 90).
  - [ ] 1.2 Sort core states ascending by `id`.
  - [ ] 1.3 Generate DOM list items for each state.
  - [ ] 1.4 Insert into `#battle-state-progress`.

- [ ] 2.0 Ready Promise Integration
  - [ ] 2.1 Implement `battleStateProgressReadyPromise`.
  - [ ] 2.2 Resolve after rendering or intentional skip.
  - [ ] 2.3 Expose promise on `window` for testing.

- [ ] 3.0 State Update Handling
  - [ ] 3.1 Register `battle:state` listener.
  - [ ] 3.2 Accept legacy string payloads.
  - [ ] 3.3 Accept `{ from, to }` object payloads.
  - [ ] 3.4 Map non-core states to core equivalents.
  - [ ] 3.5 Toggle `active` class and update badge.
  - [ ] 3.6 Call `markBattlePartReady('state')` once.

- [ ] 4.0 Fallback & Idempotency
  - [ ] 4.1 If DOM already matches, skip rendering.
  - [ ] 4.2 If no core states, render `<li>No states found</li>`.
  - [ ] 4.3 Handle missing DOM by resolving early.
  - [ ] 4.4 Ensure server-side safe execution (no DOM access).

- [ ] 5.0 Cleanup & Testing
  - [ ] 5.1 Return cleanup function to remove listener.
  - [ ] 5.2 Add unit tests for normal flow.
  - [ ] 5.3 Add edge case tests (empty states, malformed events, SSR).
  - [ ] 5.4 Add integration tests for badge + readiness signaling.