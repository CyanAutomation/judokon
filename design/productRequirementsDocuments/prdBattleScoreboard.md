# PRD: Battle Scoreboard

---

## 1. TL;DR

The **Battle Scoreboard** is a **UI-only reflector** that displays **persistent battle information** in the header:

* round outcome/status messages,
* stat selection or inter-round timer (ticks only),
* round counter,
* current match score,

It holds **no game logic** and does not emit events; it reacts to events from the **Battle Engine/Orchestrator**.
**Contextual or transient prompts** (e.g. “Opponent is choosing…”, “Select a stat”) are explicitly **handled by the Snackbar** (see [prdSnackbar.md](prdSnackbar.md)).

**Problem Statement:**
Players were previously confused by transient prompts overlapping persistent status displays or misreading score changes due to animation delay. In one playtest, a player said: “I thought I lost points because I saw the message change before the score updated.” The scoreboard aims to improve clarity by visually separating persistent battle status and transient prompts while ensuring accessible, responsive updates.

---

## 2. Goals

1. Score animation completes within **≤500ms**, and persists for **≥1s**.
2. Stat selection timer should be visible within **200ms** and update per second.
3. Fallback "Waiting..." state must render within **500ms** on sync drift.
4. All accessible regions must follow WCAG 2.1 AA guidelines including **≥4.5:1** contrast ratio.
5. Round outcome messages must not be overwritten until the next round starts.

---

## 3. Scope & Non-Goals

**In scope**
Rendering of persistent scoreboard elements:
* round message (with precedence/locking),
* timer (read-only ticks),
* round counter,
* score display,
* Accessibility (live regions, reduced-motion compliance, color/contrast).
* Deterministic rendering rules, idempotent updates.

**Out of scope**

* Transient prompts (“Opponent is choosing…”, “Choose a stat”, countdown snackbars) → handled by Snackbar.
* Timer ownership, scheduling, or auto-select → owned by Orchestrator/Engine.
* Business/game logic (win conditions, stat comparisons, cooldown FSM).

---

## Responsibilities & Boundaries
### Scoreboard responsibilities
* Maintain a minimal ScoreboardState object.
* Render DOM nodes deterministically from state.
* Apply animation/accessibility rules to updates.
* Provide a headless API (render, getState, destroy) for tests/CLI.

### Explicit non-responsibilities
* Starting, pausing, or resuming timers.
* Emitting readiness or next-round events.
* Computing scores, outcomes, or end conditions.

---

## 4. Public API (Normative)

**Priority: P1**

* `createScoreboard(container?: HTMLElement) -> HTMLElement`

**Priority: P1**

* `initScoreboard(container: HTMLElement | null, controls: {startCoolDown, pauseTimer, resumeTimer, scheduler}) -> void`

**Priority: P1**

* `showMessage(text: string, opts?: {outcome?: boolean})`

**Priority: P1**

* `clearMessage()`

**Priority: P1**

* `showTemporaryMessage(text: string) -> Function`

**Priority: P1**

* `showAutoSelect(stat: string)`

**Priority: P1**

* `updateTimer(seconds: number)`

**Priority: P1**

* `clearTimer()`

**Priority: P2**

* `updateRoundCounter(current: number)`

**Priority: P2**

* `clearRoundCounter()`

**Priority: P2**

* `updateScore(playerScore: number, opponentScore: number)`

---

## 5. Event Taxonomy
All events are emitted by Orchestrator (see [prdBattleEngine.md]) and consumed by Scoreboard:
* display.round.start({ roundNumber })
* display.round.message({ text, kind, lock?: boolean })
* display.round.outcome({ result: 'win'|'loss'|'draw', text }) (implies lock=true)
* display.message.clear()
* display.timer.show({ role: 'selection'|'cooldown', secondsRemaining })
* display.timer.tick({ secondsRemaining })
* display.timer.hide()
* display.score.update({ player, opponent, animate?: boolean })
* display.readiness.update({ nextReady: boolean })

### Event guarantees
* Idempotent (safe to replay).
* Order-stable (Orchestrator ensures only one active timer role at a time).

---

## State Model
ScoreboardState (immutable, reduced by events):
{
  message: { text: string; kind: 'neutral'|'info'|'critical'|'win'|'loss'|'draw'; locked: boolean },
  timer: { visible: boolean; secondsRemaining: number|null; role: 'selection'|'cooldown'|null },
  round: { current: number; total?: number|null },
  score: { player: number; opponent: number; animate: boolean },
  readiness: { nextReady: boolean }
}

### Message precedence
outcome|critical > info > neutral > placeholder.
Outcome lock persists until next display.round.start or display.message.clear.

--- 

## 6. DOM Contract

#round-message — status text; data-outcome="true" when locked.
#next-round-timer — shows Time left: Xs.
#round-counter — text Round N.
#score-display — two spans [data-side="player"], [data-side="opponent"].
#next-ready-badge — passive visual toggle; never focus-steals.

---

## Accessibility & Motion

Live regions
* #round-message: role="status", aria-live="polite", aria-atomic="true".
* #next-round-timer & #score-display: aria-live="polite", aria-atomic="true".

Announcement debouncing: coalesce updates within 250ms to prevent chatter.
Reduced motion: respect prefers-reduced-motion; bypass animations.
Contrast: ≥4.5:1 text/background, plus non-color cue for outcome states.

--- 

## 7. Behavioral Spec

* Outcome messages: persist via `data-outcome="true"` and block placeholder overwrites.
* Timer: "Time Left: Xs", visibility-based pause/resume, clears at 0, may trigger auto-select.
* Score: animate within 500ms, skip if reduced-motion.
* Fallbacks: show "Waiting..." within 500ms on sync drift, clear once resolved.
* Next round: scoreboard does not announce `data-next-ready`; awaiting UX decision.

---

## 8. Accessibility

* All scoreboard text areas use `aria-live="polite"`.
* Messages remain visible ≥1s.
* Timer pauses/resumes on tab visibility.
* Animations respect `prefers-reduced-motion`.
* Contrast ratio ≥4.5:1.
* Known gap: "Next ready" state not announced (open).

---

## 9. Acceptance Criteria

Render-only contract: Scoreboard never starts/stops timers or emits control events.
Message precedence: outcome messages lock until round.start or message.clear.
Timer behavior: shows/hides only on explicit events; never drives logic.
Score animation: ≤500ms unless reduced-motion.
Readiness badge: reflects state, passive only.
A11y compliance: Live regions polite/atomic, contrast ≥4.5:1, reduced-motion tested.

Feature: Battle Scoreboard — Acceptance Criteria
  As a player or assistive technology
  I want the scoreboard to behave accessibly and predictably
  So that round messages, timers, and scores are clear and reliable

  Background:
    Given a Scoreboard is created and initialized

  @score @score-animation
  Scenario: Score animates within 500ms when reduced-motion is not requested
    Given the scoreboard shows player score "2" and opponent score "1"
    And the user does not prefer reduced motion
    When the orchestrator calls updateScore with playerScore "3" and opponentScore "1"
    Then the visible score change animates
    And the animation completes within 500 milliseconds

  @score @reduced-motion
  Scenario: Score updates instantly when prefers-reduced-motion is enabled
    Given the scoreboard shows player score "2" and opponent score "1"
    And the user prefers reduced motion
    When the orchestrator calls updateScore with playerScore "3" and opponentScore "1"
    Then the score updates instantly without animation

  @timer @countdown
  Scenario: Timer shows countdown text, updates per second and clears at zero
    Given a countdown of 5 seconds is started via updateTimer
    When 1 second passes
    Then the next-round-timer shows "Time Left: 4s"
    When 4 more seconds pass
    Then the next-round-timer is cleared

  @timer @visibility
  Scenario: Timer pauses when tab is hidden and resumes when visible
    Given a countdown of 10 seconds is started via updateTimer
    When the document becomes hidden
    Then the countdown pauses
    When the document becomes visible again
    Then the countdown resumes from where it paused

  @outcome @persistence
  Scenario: Outcome messages persist at least 1 second and block placeholders
    Given the orchestrator calls showMessage "Player wins" with outcome=true
    When a placeholder or transient message is emitted within 200ms
    Then the #round-message retains "Player wins"
    And #round-message has attribute data-outcome="true"
    And the message remains visible for at least 1 second

  @fallback @sync-drift
  Scenario: "Waiting..." fallback appears within 500ms on sync drift
    Given the scoreboard is awaiting sync confirmation
    When sync drift is detected and unresolved
    Then the scoreboard shows "Waiting..." within 500 milliseconds
    And the "Waiting..." message is cleared when sync is resolved

  @accessibility @wcag
  Scenario: Scoreboard elements meet WCAG 2.1 AA requirements
    Given the scoreboard is rendered
    Then each live region has the proper ARIA attributes (aria-live="polite", aria-atomic="true" where required, role="status" for #round-message)
    And text contrast ratios for visible text are >= 4.5:1

  @next-ready @pending
  Scenario: data-next-ready rendering and announcement (pending)
    # This scenario is intentionally left pending until UX decision is made:
    # - Who announces next-ready: Scoreboard or Snackbar
    # - Exact announcement text and timing
    Given the orchestrator sets #next-button[data-next-ready="true"]
    When the scoreboard observes this state
    Then the scoreboard should (TBD) render/announce the readiness

---

## API Surface
Factory
* createScoreboard(container?: HTMLElement): Scoreboard
Methods
* render(patch: Partial<ScoreboardState>): void
* getState(): Readonly<ScoreboardState>
* destroy(): void

---

## Dependencies
* Relies on Orchestrator for event emission (see [prdBattleEngine.md]).
* Styling variables from shared CSS design system.
* Snackbar handles transient prompts.

---

## 10. Open Decisions

* **Win/loss color coding**: Implement win=green, loss=red, neutral=grey **or** confirm neutral-only scheme.
* **Next readiness announcement**: Decide if Scoreboard or Snackbar will announce it.

---

## 11. Cross-References

* [Classic Battle PRD](prdBattleClassic.md)
* [Snackbar PRD](prdSnackbar.md)
* [Battle State Indicator PRD](prdBattleStateIndicator.md)

---

## Tasks

- [ ] 1.0 Implement Scoreboard DOM API
  - [ ] 1.1 Implement `createScoreboard` with ARIA-compliant elements.
  - [ ] 1.2 Build `initScoreboard` with event wiring (visibility/focus).
  - [ ] 1.3 Ensure API methods fail gracefully if DOM is missing.

- [ ] 2.0 Implement Round Messaging Logic
  - [ ] 2.1 Add `data-outcome` guards to protect persistent messages.
  - [ ] 2.2 Block placeholders from overwriting outcomes.
  - [ ] 2.3 Finalize and apply win/loss/neutral styling tokens.

- [ ] 3.0 Implement and Test Timer Functionality
  - [ ] 3.1 Render “Time Left: Xs” with countdown.
  - [ ] 3.2 Auto-clear timer on zero.
  - [ ] 3.3 Add visibility-based pause/resume logic.
  - [ ] 3.4 Trigger `showAutoSelect` on countdown expiry.
  - [ ] 3.5 Write unit tests for pause/resume and auto-select trigger.

- [ ] 4.0 Score Animation Updates
  - [ ] 4.1 Add 500ms animated count-up for score.
  - [ ] 4.2 Respect `prefers-reduced-motion` setting.
  - [ ] 4.3 Write Playwright tests for reduced-motion bypass.

- [ ] 5.0 Accessibility, Fallbacks, and Readiness
  - [ ] 5.1 Show “Waiting…” fallback during sync drift.
  - [ ] 5.2 Announce round and score updates via live regions.
  - [ ] 5.3 Add `data-next-ready` accessibility announcement.
  - [ ] 5.4 Write automated accessibility tests.
