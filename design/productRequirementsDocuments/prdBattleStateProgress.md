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

Example (QA report): “During testing, the UI badge showed ‘Cooldown’ while the list still highlighted
‘Decision’. It was unclear which state the match was actually in.”

This PRD documents the expected behavior so implementers and QA can validate the module and write tests.

## Goals / Success Metrics

**SMART Goals:**

1. **Accuracy**: The progress list must reflect the current battle state with 100% correctness across all state transitions (core and mapped non-core).
2. **Performance**: Rendering and updates must complete in <250ms on a standard dev machine and each update must finish in <16ms to avoid frame drops.
3. **Initialization**: The `battleStateProgressReadyPromise` must always resolve (rendered or skipped) before dependent logic executes.
4. **Compatibility**: The module must accept both legacy string payloads and new object `{ from, to }` payloads without error.
5. **Stability**: Rendering must be idempotent; no unnecessary DOM updates may occur if the state list already matches expectations.
6. **Accessibility**: Each item must present both a numeric ID and a human-readable label; active item uses `aria-current="step"`. Support reduced motion.

**Success Metrics (examples):**

- Rendering completes (or is intentionally skipped) in < 250ms on a typical dev machine for the standard state table.
- All updates complete in <16ms during test simulations.
- No `console.error` during normal initialization or state updates in tests.
- Screen readers announce the active step correctly.

## User Stories

- As a player, I want a clear, readable list of battle phases (with numbers and names) so I know where I am in the match.
- As a UI consumer, I want a deterministic list of core battle states displayed so I can see match progress.
- As a developer, I want a promise that signals when the progress list is ready so I can sequence other startup work.
- As a QA engineer, I want idempotent rendering (no unnecessary DOM churn) so tests are stable and fast.

## Functional Requirements (Prioritized)

P1 – Render Core State List

- Feature: Render a trimmed list of core states into `#battle-state-progress`.
- Description: The module must generate one DOM element per core state (`id < 90`), ordered by ascending ID, with each element carrying a `data-state` attribute, visible numeric ID, and human-readable label.

P1 – Expose Ready Promise

- Feature: Provide `battleStateProgressReadyPromise` that resolves when rendering completes or is skipped.

P1 – Active State Updates

- Feature: Listen for `battle:state` events and update the active item by toggling an `active` class and `aria-current="step"`.

P1 – Support legacy/new event payloads

- Feature: Accept `e.detail` as a plain string (legacy) or as an object `{ from, to }` (new), and always use the destination state.

P1 – Map non-core states to visible core states

- Feature: For interrupts/admin paths, map `interruptRound` → `cooldown`, `interruptMatch` → `matchOver`, and `roundModification` → `roundDecision` so the progress list indicates a reasonable visual step.

P2 – Idempotent rendering

- Feature: Skip rendering if the existing DOM items already match the expected list (names and IDs in order).

P2 – Fallback rendering when empty

- Feature: If `CLASSIC_BATTLE_STATES` is missing or contains no core states, display a single fallback list item.

P2 – Accessibility & Keyboard Support

- Feature: Provide `ul/li` semantics, `aria-current="step"` on the active item, container label “Battle progress,” focusable items, and keyboard navigation (Up/Down).

P2 – Reduced Motion Handling

- Feature: Use a 100–150ms CSS transition for active state changes; respect `prefers-reduced-motion`.

P3 – Cleanup API

- Feature: Return a cleanup function that removes the `battle:state` listener.

P3 – Localization-ready Labels

- Feature: Support future i18n of state labels (default EN).

## Acceptance Criteria

### Rendering

- **Given** `#battle-state-progress` exists and `CLASSIC_BATTLE_STATES` has core states,  
  **When** initialization runs,  
  **Then** one item is created per core state (id < 90) in ascending order,  
  **And** each has `data-state="<stateName>"`, visible text “<id> <label>”,  
  **And** the container has `role="list"` and items have `role="listitem"`.  
  **And** `battleStateProgressReadyPromise` resolves after rendering.

- **Given** the DOM already matches expected items,  
  **When** initialization runs,  
  **Then** no DOM nodes are replaced or reordered.

- **Given** no core states are found,  
  **When** initialization runs,  
  **Then** a single `<li>` with text `No states found` appears,  
  **And** the promise resolves.

### State Updates

- **Given** the list is rendered,  
  **When** a `battle:state` event fires with `detail: "cooldown"`,  
  **Then** the cooldown item has class `active` and `aria-current="step"`,  
  **And** all other items are inactive,  
  **And** `updateBattleStateBadge("cooldown")` is called once.

- **Given** the list is rendered,  
  **When** a `battle:state` event fires with `{ from: "decision", to: "cooldown" }`,  
  **Then** the cooldown item becomes active and badge is updated.

- **Given** a `battle:state` event fires with `"interruptMatch"`,  
  **Then** the `matchOver` item becomes active and badge updates to `"matchOver"`.

### Initialization State

- **Given** `document.body.dataset.battleState` contains `"roundDecision"`,  
  **When** initialization runs,  
  **Then** the `roundDecision` item is active immediately,  
  **And** `markBattlePartReady('state')` is called exactly once.

### Robustness

- **Given** no DOM exists (SSR),  
  **When** the module initializes,  
  **Then** it returns immediately and the ready promise resolves.

### Performance

- All updates complete in <16ms.
- Rendering completes or skips in <250ms.

## Non-Functional Requirements / Design Considerations

- **Performance**: Avoid unnecessary DOM writes (idempotency checks).
- **Robustness**: SSR safe; resolve promise even with no document.
- **Testability**: Expose promise on `window`.
- **Accessibility**: Provide labels, ARIA roles, keyboard navigation, `aria-current`. Respect reduced motion.
- **UX**: Simple vertical list with one highlighted active item. Active item uses bold text + colored left bar.
- **Visuals**: Item height ≥ 44px, touch target ≥ 44×44, 12–16px spacing, 14–16px font. High-contrast colors.
- **Localization**: Default EN labels, structure ready for future i18n.
- **Mockup**: Vertical list with state numbers + names, one highlighted.

## Dependencies and Open Questions

- Depends on `src/helpers/classicBattle/stateTable.js` (export `CLASSIC_BATTLE_STATES`).
- Calls `updateBattleStateBadge(state)` from `src/helpers/classicBattle/uiHelpers.js`.
- Calls `markBattlePartReady('state')` from `src/helpers/battleInit.js`.

Open questions:

- Are the non-core→core mapping rules exhaustive?
- Should icons be included for clarity for children (recommended: P2)?
- Should keyboard focus cycle through all items or stay locked to the active one?

## Contract (Inputs / Outputs / Errors)

- **Inputs**: Reads `CLASSIC_BATTLE_STATES`, queries `#battle-state-progress`, `document.body.dataset.battleState`.
- **Outputs**: Returns cleanup function (removes listener). Mutates DOM, calls helper functions, resolves promise.
- **Errors**: Should not throw for missing DOM or malformed state table. SSR returns resolved promise.

## Pseudocode / Implementation Notes

1. If `document` undefined, return early and resolve promise.
2. Get `#battle-state-progress`; if missing, resolve promise and return.
3. Read and filter `CLASSIC_BATTLE_STATES` (`id < 90`), sort ascending.
4. If empty, render `<li>No states found</li>` and resolve.
5. Compare existing DOM to expected; if mismatched, re-render.
6. Resolve ready promise.
7. Register `battle:state` listener. Normalize payloads.
8. Map non-core to nearest core; set `active` + `aria-current="step"`. Call badge update.
9. If initial state exists in `body.dataset`, apply immediately and call readiness once.
10. Return cleanup function.

## Edge cases and Test Ideas

- SSR (no DOM): Promise resolves, no error.
- Idempotent rendering: pre-populated DOM unchanged.
- Fallback rendering when empty.
- Mapping correctness for interrupts/admin.
- `markBattlePartReady('state')` fires exactly once.
- Malformed events handled gracefully.
- Accessibility: Screen reader announces active; keyboard navigation works; reduced motion respected.

## Notes / Next Steps

- Add unit/integration tests with stubbed `CLASSIC_BATTLE_STATES`.
- Provide wireframe mockup with accessibility notes.
- Decide whether to include icons for clarity.
- Plan localization (labels/i18n).

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
