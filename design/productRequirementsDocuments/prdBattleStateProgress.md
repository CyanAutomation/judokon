# PRD: Battle State Indicator

**Entry Point:** `src/helpers/battleStateIndicator.js`  
**Used By:** Classic Battle modes (UI + CLI)  
**Related Docs:**  
- [prdBattleEngine.md](prdBattleEngine.md)  
- [prdBattleScoreboard.md](prdBattleScoreboard.md)  

---

## 1. TL;DR

The **Battle State Indicator** is a **UI-only module**.  
It renders and maintains a **horizontal progress list** of match states, plus an **accessibility announcer badge**.  

It does **not** normalize state transitions — that is the responsibility of the **Battle Engine / Orchestrator**.  
This module only reflects **already-normalized events**.

**Public API:**
- `createBattleStateIndicator(config): Promise<{ cleanup: () => void, isReady: boolean }>`  

---

## 2. Problem Statement

Players and automated tests need a **clear, observable representation** of the current battle state.  
Without it, there is no reliable way to confirm or assert match flow from the UI.  

This module solves that by rendering:  
- a **deterministic list of states** (for visual reference), and  
- a **screen-reader announcer badge** (for accessibility parity).  

---

## 3. Goals

- **Clarity**: Always reflect the latest normalized `battleStateChange` event.  
- **Accessibility**: Provide a screen-reader live region plus `aria-current` on the active step.  
- **Determinism**: Always update synchronously with received events.  
- **Isolation**: Contain no business logic or state mapping.  
- **Idempotency**: Safe to init, destroy, and re-init without duplication.  
- **Feature Flag Support**: Entire module can be disabled cleanly.  

---

## 4. Functional Requirements

### P1 – Core
- **Render list**  
  - `<ul id="battle-state-indicator" data-flag="battleStateIndicator" aria-label="Battle progress">`.  
  - `<li>` per core state, sorted ascending by numeric ID.  
  - Attributes:  
    - `data-state-raw="<stateName>"` (from engine).  
    - `data-state-label="<label>"` (optional human-readable).  
  - Only one `<li>` carries `.active` and `aria-current="step"`.  

- **Event Handling**  
  - Subscribes to `battleStateChange` (payload: `{ from, to, meta }`).  
  - On each change:  
    - Highlight `<li data-state-raw="<to>">`.  
    - Remove `.active` from others.  
    - Update announcer badge with:  
      - `"State: <to>"` (raw engine state).  

- **Badge (Announcer)**  
  - `<p id="battle-state-announcer" data-flag="battleStateAnnouncer" aria-live="polite" aria-atomic="true">`.  
  - Always updated with **exact raw state**.  
  - Must remain the **normative accessibility channel**.  

- **Lifecycle**  
  - `createBattleStateIndicator(config)` returns a **contract object**:  
    - `{ cleanup: fn, isReady: boolean }`.  
  - `cleanup` detaches listeners and resets DOM.  

### P2 – Secondary
- **Feature Flag Off**  
  - If disabled, no DOM is rendered.  
  - Promise resolves with `{ isReady: false, cleanup: noop }`.  

- **Idempotency**  
  - Multiple `createBattleStateIndicator()` calls do not duplicate DOM or listeners.  
  - Must call `cleanup()` before a fresh init if new render required.  

- **SSR / Missing DOM**  
  - If `document` is missing, resolve early with `{ isReady: false }`.  

- **Empty States**  
  - If no states configured, render `<li>No states defined</li>`.  
  - Module still resolves `isReady: true`.  

### P3 – Future Enhancements
- Per-item tooltips or labels (localizable).  
- Keyboard navigation between list items.  
- Transition effects with `prefers-reduced-motion` respected.  

---

## 5. State List

The indicator consumes states already **normalized by the Battle Engine**.  
(See [prdBattleEngine.md](prdBattleEngine.md) for definitions.)  

Core states (id < 90):  
| id | name              | label (not rendered today) |
|----|-------------------|-----------------------------|
| 10 | `idle`            | Lobby                      |
| 20 | `matchInit`       | Match Start                |
| 30 | `cooldown`        | Cooldown                   |
| 40 | `selection`       | Choose Stat                |
| 50 | `roundEvaluation` | Resolve Round              |
| 60 | `betweenRounds`   | Next Round                 |
| 70 | `matchEvaluation` | Evaluate Match             |
| 80 | `matchFinished`   | Match Over                 |

Interrupts (`interruptRound`, `interruptMatch`, `roundModification`) are **already mapped by the engine**.  
The indicator does not apply any additional logic.  

---

## 6. Acceptance Criteria

- **Initialization**  
  - Given feature flag enabled, `<ul id="battle-state-indicator">` is present and `isReady: true`.  
  - Given feature flag disabled, no DOM is rendered, `isReady: false`.  

- **Event Handling**  
  - When `battleStateChange` → `{to: "cooldown"}`, then `<li data-state-raw="cooldown">` is `.active` and badge text = `State: cooldown`.  
  - When `battleStateChange` → `{to: "matchFinished"}`, then `<li data-state-raw="matchFinished">` is `.active` and badge text = `State: matchFinished`.  

- **Idempotency**  
  - Multiple inits without `cleanup` do not duplicate DOM.  
  - After `cleanup()`, fresh init works.  

- **SSR / Missing DOM**  
  - With no DOM, resolves `{ isReady: false }`.  

- **Accessibility**  
  - Badge text always matches raw state.  
  - Active list item always has `aria-current="step"`.  

---

## 7. Non-Functional Requirements

- **Performance**:  
  - Initial render ≤10ms for ≤12 states.  
  - Update ≤2ms per event.  

- **Robustness**:  
  - Never throws.  
  - Missing DOM or SSR environments handled gracefully.  

- **Memory**:  
  - Exactly one listener bound per instance.  
  - `cleanup` releases resources.  

- **Compatibility**:  
  - Accepts only normalized event payloads from engine.  
  - Ignores unrecognized events silently.  

- **Accessibility**:  
  - Must pass screen-reader audit with NVDA/VoiceOver.  
  - Badge is the normative announcement channel.  

---

## 8. Public API Contract

| Name                        | Signature                                                           | Purpose                                    | Side-Effects                         |
|-----------------------------|---------------------------------------------------------------------|--------------------------------------------|--------------------------------------|
| `createBattleStateIndicator` | `(config) => Promise<{ cleanup: fn, isReady: boolean }>`            | Initialize and render indicator UI.         | Renders DOM, attaches listener.       |

---

## 9. Dependencies

- **Events**: subscribes to `battleStateChange`.  
- **DOM**: container `#battle-state-indicator` and badge `#battle-state-announcer`.  
- **Feature Flag**: `data-flag="battleStateIndicator"`.  
- **Event Bus**: uses `onBattleEvent` / `offBattleEvent` for subscription.  

---

## 10. Out of Scope

- State mapping, validation, and business logic (engine responsibility).  
- Cooldown timers, readiness handshakes (orchestrator responsibility).  
- Scoreboard updates (covered by [prdBattleScoreboard.md](prdBattleScoreboard.md)).  

---
