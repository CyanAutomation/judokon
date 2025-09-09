# PRD: Battle Scoreboard

**Entry Point:** `src/helpers/battleScoreboard.js`
**Used By:** Classic Battle (UI), Battle CLI, Battle Bandit, future modes
**Related Docs:** \[prdBattleEngine.md], \[prdSnackbar.md], \[prdBattleStateIndicator.md]

---

## 1. Problem Statement

Battle modes previously suffered from inconsistent or tightly coupled scoreboard implementations.
Players were often confused by **transient prompts overlapping persistent status displays**, or misreading score changes due to animation delays.

The scoreboard resolves this by **cleanly separating persistent battle state (scores, round outcomes, timers)** from **transient prompts** (Snackbar responsibility). A unified, mode-agnostic scoreboard is required to reflect battle state in a consistent, deterministic manner, decoupled from the rest of the game UI.

---

## 2. TL;DR

The **Battle Scoreboard** is a **UI-only reflector** of persistent battle information.

* It consumes events from the **Battle Engine/Orchestrator** event bus.
* It does **not** contain any business logic.
* It renders only **engine-derived state** and persists outcome/score until the next authoritative state transition.
* Styling and layout may differ by mode (via CSS themes), but structure and behavior remain identical.

---

## 3. Goals

1. Independence from the main battle area and transient UI components.
2. Reusability across Classic, CLI, Bandit, and future battle modes.
3. Strict alignment to the **canonical event catalog** defined in \[prdBattleEngine.md].
4. Deterministic, idempotent updates suitable for automated and AI-driven matches.
5. Accessibility and reduced-motion compliance.
6. Numeric UX thresholds:

   * Score animation completes within ≤500 ms and persists ≥1 s.
   * Stat selection timer visible within ≤200 ms of event.
   * Fallback “Waiting…” state visible within ≤500 ms if no state arrives.

---

## 4. Non-Goals

* Transient prompts (e.g. *“Opponent is choosing…”*) — handled by **Snackbar**.
* Game/business logic such as stat comparison or round winner calculation.
* Readiness handshakes — handled by Snackbar or control panels.
* Cooldown visuals (unless explicitly added later).

---

## 5. Event Catalog (Consumed)

The scoreboard listens **only** to the canonical events from the Battle Engine/Orchestrator:

| Event                                                          | Purpose                        | Notes                              |
| -------------------------------------------------------------- | ------------------------------ | ---------------------------------- |
| `control.state.changed({ from, to, context, catalogVersion })` | Authoritative state transition | Drives visibility and reset rules. |
| `round.started({ roundIndex })`                                | New round begins               | Updates round index.               |
| `round.timer.tick({ remainingMs })`                            | Selection timer countdown      | Updates visible timer.             |
| `round.evaluated({ outcome, scores })`                         | Round result                   | Updates outcome + scores.          |
| `match.concluded({ scores })`                                  | Final result                   | Locks scoreboard.                  |

---

## 6. Authority Rules

* **All visual transitions** are keyed off `control.state.changed`.
* Domain/timer events update values but **do not** drive transitions.
* Outcomes persist until the next `control.state.changed` to `selection` or `cooldown`.
* Duplicate or out-of-order events are ignored (idempotency guard).

---

## 7. State Model

```ts
{
  roundIndex: number,
  timerRemainingMs: number | null,
  scores: { player: number, opponent: number },
  outcome: "playerWin" | "opponentWin" | "draw" | null,
  state: string,            // echo of control.state.changed.to
  catalogVersion: string
}
```

**DOM Contract:**

* Outcome is exposed via `data-outcome` attribute on the root scoreboard element.
* Values: `"playerWin"`, `"opponentWin"`, `"draw"`, or `"none"`.
* This supports deterministic UI testing.

---

## 8. Public API

* **create(container?: HTMLElement) → HTMLElement**
  Creates scoreboard DOM, subscribes to engine events.

* **destroy()**
  Unsubscribes, clears DOM, resets state.

* **getSnapshot() → StateModel**
  Returns the current internal state (for tests/debugging).

---

## 9. Lifecycle & Idempotency

* Multiple `create()` calls return the same instance.
* `destroy()` unsubscribes from all topics and nulls state.
* Out-of-order events (older `roundIndex`) are ignored.
* Duplicate events with same `(roundIndex, statKey)` tuple are ignored.
* **Fallback behaviour:**

  * If no `control.state.changed` event is received within 500 ms of mount, display “Waiting…” until the first state arrives.

---

## 10. Performance & Accessibility

* Updates must commit within 16 ms (60 fps budget).
* Animation duration ≤ 500 ms; disable via `prefers-reduced-motion`.
* Timer drift ≤ 100 ms per 10 seconds (driven only by engine ticks).
* Live region announcements triggered only on outcome or state change (not every tick).

---

## 11. Acceptance Criteria (Gherkin)

Feature: Scoreboard updates from engine events

Background:
Given a running match
And the scoreboard is bound to the engine event bus

Scenario: Round start updates round index
When the engine emits "round.started" with roundIndex 3
Then the scoreboard shows round 3
And the outcome area is cleared

Scenario: Selection timer ticks
Given the state is "selection"
When the engine emits "round.timer.tick" with remainingMs 5000
Then the scoreboard shows "00:05"

Scenario: Outcome persists until next selection
When the engine emits "round.evaluated" with outcome "playerWin" and scores { player: 4, opponent: 2 }
Then the scoreboard shows "You win" and 4–2
And it remains until the next "control.state.changed" to "selection"

Scenario: Match concluded freezes scoreboard
When the engine emits "match.concluded" with scores { player: 10, opponent: 7 }
Then the scoreboard locks with final scores 10–7
And no further timer updates are rendered

Scenario: Ignore duplicate round events
Given the scoreboard already shows roundIndex 5
When the engine emits "round.started" with roundIndex 5
Then the scoreboard does not re-render

Scenario: Fallback waiting state
Given the scoreboard has just been created
When no "control.state.changed" event is received within 500 ms
Then the scoreboard shows "Waiting…"
And it is cleared on the next state change

---

## 12. Risks & Open Questions

* Should cooldown timers ever be displayed here, or always via Snackbar?
* Do we need a lightweight adapter event (`scoreboard.update`) to simplify UI wiring?
* Should we version-lock `catalogVersion` at binding time and throw if mismatched?

---
Would you like me to now do the **same reconciliation pass for the Battle Engine PRD** — i.e. check what detail from the original was lost when I aligned it, and merge back any important omissions?
