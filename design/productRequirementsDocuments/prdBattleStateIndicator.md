# PRD: Battle State Indicator

**Entry Point:** `src/helpers/battleStateIndicator.js`
**Used By:** Classic Battle (UI + CLI)
**Authoritative Source of Truth:** \[prdBattleEngine.md] — FSM, events, and state catalog

---

## 1. TL;DR

The **Battle State Indicator** is a **UI-only reflector** of the Battle Engine/Orchestrator finite-state machine (FSM).
It renders a horizontal list of FSM states and exposes an ARIA live announcer for accessibility.

The component provides **real-time visual and screen-reader feedback** about the current battle phase, ensuring players can track gameplay progress across all supported interfaces. It holds **no business logic** and **does not infer** or remap states.

**Consumes exactly one canonical event stream:**
`control.state.changed({ from, to, context, catalogVersion })`

---

## 2. Scope & Non-Goals

**In scope:**

* Render a stable, ordered list of FSM states supplied by the engine/orchestrator.
* Highlight the active state.
* Announce the active state via a screen-reader live region.
* Expose a headless query (`getActiveState()`) for tests.

**Out of scope:**

* State normalization or mapping (interrupts, labels, IDs).
* Cooldown timers, readiness handshakes, or scoring logic.
* Scoreboard behavior or UI (see `prdBattleScoreboard.md`).

---

## 3. Explicit Goals

* Reflect all FSM transitions with visual and ARIA updates within **2ms** of receiving `control.state.changed`.
* Render all states from `catalog.display.include` in order within **10ms** on initialization.
* Provide 100% parity between the visual indicator and the last received FSM state (`getActiveState()` match).
* Ensure that the announcer always reflects the **raw FSM state**, including unknown states.
* Fail gracefully (return `{ isReady: false }`) in **non-browser or SSR environments**.

---

## 4. Dependencies & Contracts

### 4.1 Event Contract

**Event name:** `control.state.changed`
**Payload structure:**

* `from`: FSMStateName
* `to`: FSMStateName
* `context`:

  * `roundIndex`: number
  * `scores`: { p1: number; p2: number }
  * `seed`: string
  * `timerState?`: { phase: "round" | "cooldown"; remainingMs: number }
* `catalogVersion`: string
* `debug?`: { transition: { trigger: string } }

**Source:** Emitted by the Orchestrator after each FSM transition.

### 4.2 State Catalog Contract

Provided at init via `getCatalog()` or sticky event `control.state.catalog`.

**Structure:**

* `version`: "v1"
* `order`: FSMStateName\[]
* `ids`: Record\<FSMStateName, number>
* `labels?`: Record\<FSMStateName, string>
* `display`: { include: FSMStateName\[] }

---

## 5. Public API

`createBattleStateIndicator(config): Promise<{ cleanup, isReady, getActiveState }>`

**Config parameters:**

* `featureFlag?`: boolean
* `mount`: HTMLElement or selector string
* `announcer`: HTMLElement or selector string
* `events`: { on, off } — event bus bindings
* `getCatalog`: function returning a Promise<StateCatalog>

**Returns:**

* `cleanup()`: removes all listeners
* `isReady`: boolean, set after catalog + paint
* `getActiveState()`: returns FSMStateName or null

---

## 6. Rendering Rules

**Root element:**
`<ul id="battle-state-indicator" data-flag="battleStateIndicator" aria-label="Battle progress">`

* Contains `<li>` for each `catalog.display.include` entry

**Each `<li>` should have:**

* `data-state-raw="<name>"`
* `data-state-id="<number>"`
* (optional) `data-state-label="<label>"`
* Active item: `.active` and `aria-current="step"`

**Announcer region:**
`<p id="battle-state-announcer" data-flag="battleStateAnnouncer" aria-live="polite" aria-atomic="true">`

* Contains text: `State: <name>`

**Unknown states:**

* Do not create `<li>`
* Still update announcer
* Add `data-unknown="true"` to root element

---

## 7. Behavior

* On init: fetch catalog, render ordered list, no state selected by default
* On `control.state.changed`:

  * Highlight the `to` state
  * Update announcer with raw state
  * Reload catalog if `catalogVersion` differs
* If `featureFlag` is false: return stub object, do nothing
* If SSR or no DOM: return `{ isReady: false }`

---

## 8. Accessibility

* Announcer text always equals raw FSM state
* Only active `<li>` has `aria-current="step"`
* Supports `prefers-reduced-motion`
* No keyboard focus management (non-interactive)

---

## 9. Design and UX Considerations

* Visual style should match the **retro-terminal look** of Classic Battle mode
* No shadows or animations; align with CLI aesthetic
* Announcer should be invisible visually but fully screen-reader compatible
* Layout should allow horizontal scrolling if too many states

---

## 10. Non-Functional Requirements

* **Performance:** Init ≤10ms, updates ≤2ms
* **Reliability:** Safe handling of unknown states
* **Memory:** Cleanup must release listener references
* **Determinism:** Always reflects most recent `control.state.changed`
* **Testability:** `getActiveState()` must return current FSM state

---

## 11. Acceptance Criteria (Gherkin)

**Feature:** Battle State Indicator

**Background:**
Given the orchestrator provides a StateCatalog version "v1"
And the UI subscribes to "control.state.changed"

**Scenario: Initial render**
When the indicator initializes
Then it renders `<li>` items in catalog.display.include order
And no item is active until a state change arrives

**Scenario: State change reflection**
Given the indicator is initialized
When control.state.changed => { from: "matchInit", to: "cooldown" }
Then `<li data-state-raw="cooldown">` is active with `aria-current="step"`
And announcer text is "State: cooldown"
And `getActiveState()` returns "cooldown"

**Scenario: Catalog version update**
Given the indicator has catalogVersion "v1"
When a change arrives with catalogVersion "v2"
Then the indicator reloads the new catalog

**Scenario: Unknown state**
When control.state.changed => { to: "interruptRound" }
Then announcer says "State: interruptRound"
And root has `data-unknown="true"`

**Scenario: Feature flag off**
Given featureFlag is false
When the indicator initializes
Then `isReady` is false and no DOM rendered

---

## 12. Telemetry (Optional)

* `indicator.render.ms`
* `indicator.update.ms`
* `indicator.unknown_state.count`
* `indicator.catalog_reload.count`

---

## 13. Migration Notes

* Replace legacy `battleStateChange` with `control.state.changed`
* Remove local ID tables; use `catalog.ids`
* Ensure announcer always reflects raw FSM state (test parity)

---