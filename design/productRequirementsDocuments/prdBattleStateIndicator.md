# PRD: Battle State Indicator

**Entry Point:** `src/helpers/battleStateIndicator.js`
**Used By:** Classic Battle (UI + CLI)
**Authoritative Source of Truth:** \[prdBattleEngine.md] — FSM, events, and state catalog

---

## 1. TL;DR

The **Battle State Indicator** is a **UI-only reflector** of the Battle Engine/Orchestrator finite-state machine (FSM).
It renders a horizontal list of FSM states and exposes an ARIA live announcer.
It holds **no business logic** and **does not infer** or remap states.

**Consumes exactly one canonical event stream:**
control.state.changed({ from, to, context, catalogVersion })

---

## 2. Scope & Non-Goals

**In scope**

* Render a stable, ordered list of FSM states supplied by the engine/orchestrator.
* Highlight the active state.
* Announce the active state via a screen-reader live region.
* Expose a headless query (getActiveState()) for tests.

**Out of scope**

* State normalization or mapping (interrupts, labels, IDs).
* Cooldown timers, readiness handshakes, or scoring logic.
* Scoreboard behavior or UI (see `prdBattleScoreboard.md`).

---

## 3. Dependencies & Contracts

### 3.1 Event contract

* **Event name:** control.state.changed

* **Payload:**

  type StateChanged = {
  from: FSMStateName;
  to: FSMStateName;
  context: {
  roundIndex: number;
  scores: { p1: number; p2: number };
  seed: string;
  timerState?: { phase: "round" | "cooldown"; remainingMs: number };
  };
  catalogVersion: string;
  debug?: { transition: { trigger: string } };
  }

* **Source:** Emitted by the Orchestrator after each FSM transition.

### 3.2 State catalog contract

* Provided at init via getCatalog() or sticky event control.state.catalog.
* Structure:

  type StateCatalog = {
  version: "v1";
  order: FSMStateName\[];
  ids: Record\<FSMStateName, number>;
  labels?: Record\<FSMStateName, string>;
  display: { include: FSMStateName\[] };
  }

---

## 4. Public API

createBattleStateIndicator(config: {
featureFlag?: boolean;
mount?: HTMLElement | string;
announcer?: HTMLElement | string;
events: {
on: (event: string, fn: (payload\:any) => void) => void;
off: (event: string, fn: (payload\:any) => void) => void;
};
getCatalog: () => Promise<StateCatalog>;
}): Promise<{
cleanup: () => void;
isReady: boolean;
getActiveState: () => FSMStateName | null;
}>

Notes:

* Resolves isReady only after catalog loaded and first paint.
* Idempotent: must cleanup() before re-init.

---

## 5. Rendering Rules

* Root list:

  <ul id="battle-state-indicator"  
      data-flag="battleStateIndicator"  
      aria-label="Battle progress">  
    <!-- <li> per catalog.display.include -->  
  </ul>  

* `<li>` attributes:

  * data-state-raw="<name>"
  * data-state-id="<number>"
  * optional data-state-label="<label>"
  * Active item gets `.active` and aria-current="step"

* Announcer:

  <p id="battle-state-announcer"  
     data-flag="battleStateAnnouncer"  
     aria-live="polite"  
     aria-atomic="true">  
     State: <name>  
  </p>  

* Unknown states: do not create new `<li>`.

  * Announcer still updated.
  * Root marked with data-unknown="true".

---

## 6. Behavior

* **Init**: fetch catalog, render in order, no default active state.
* **On control.state.changed**:

  * Highlight `to`.
  * Announce "State: <to>".
  * Reload catalog if catalogVersion mismatches.
* **Feature flag off**: return { isReady\:false, cleanup\:noop, getActiveState:()=>null }.
* **SSR/no DOM**: return { isReady\:false }.

---

## 7. Accessibility

* Announcer text always equals raw FSM state.
* Only active `<li>` gets aria-current="step".
* Respect prefers-reduced-motion.
* No keyboard focus management.

---

## 8. Non-Functional Requirements

* **Performance**: init ≤10ms, update ≤2ms.
* **Reliability**: never throw; unknown states safe.
* **Memory**: one listener per instance, released on cleanup().
* **Determinism**: always mirrors the last control.state.changed.
* **Testability**: getActiveState() supports headless checks.

---

## 9. Acceptance Criteria (Gherkin)

Feature: Battle State Indicator

Background:
Given the orchestrator provides a StateCatalog version "v1"
And the UI subscribes to "control.state.changed"

Scenario: Initial render
When the indicator initializes
Then it renders <li> items in catalog.display.include order
And no item is active until a state change arrives

Scenario: State change reflection
Given the indicator is initialized
When control.state.changed => { from:"matchInit", to:"cooldown" }
Then <li data-state-raw="cooldown"> is active with aria-current="step"
And announcer text is "State: cooldown"
And getActiveState() returns "cooldown"

Scenario: Catalog version update
Given the indicator has catalogVersion "v1"
When a change arrives with catalogVersion "v2"
Then the indicator reloads the new catalog

Scenario: Unknown state
When control.state.changed => { to:"interruptRound" }
Then announcer says "State: interruptRound"
And root has data-unknown="true"

Scenario: Feature flag off
Given featureFlag is false
When the indicator initializes
Then isReady is false and no DOM rendered

---

## 10. Telemetry (optional)

* indicator.render.ms
* indicator.update.ms
* indicator.unknown\_state.count
* indicator.catalog\_reload.count

---

## 11. Migration Notes

* Replace legacy battleStateChange with control.state.changed.
* Remove local ID tables; use catalog.ids.
* Ensure announcer text matches raw FSM state for test parity.

---

Do you want me to also generate the corresponding **insertions for prdBattleEngine.md** (like a patch note style you could drop in as §4.3 or similar) so the canonical `control.state.changed` event is fully documented there?
