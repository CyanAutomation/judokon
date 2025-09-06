# PRD: Battle Scoreboard

---

## 1. TL;DR

The **Battle Scoreboard** is a **UI-only reflector** that displays **persistent battle information** in the header:

* round outcome/status messages,
* stat selection timer,
* round counter,
* and current match score.

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

* Rendering of persistent scoreboard elements (round message, timer, round counter, score).
* Outcome message persistence rules (guarded by `data-outcome`).
* Accessibility of live regions and reduced-motion compliance.
* Fallback “Waiting…” message for sync or drift.

**Out of scope**

* Transient prompts (“Opponent is choosing…”, “Choose a stat”, inter-round countdowns). These belong to Snackbar.
* Business/game logic (auto-select, stat comparison, match state progression).
* Styling of win/loss colors (decision pending; see §Open Decisions).

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

## 5. Event Model

The Scoreboard reacts to these domain/control events:

* `roundStarted` → clears outcome, updates counter, syncs scores.
* `roundResolved` → shows outcome with `{outcome:true}`; updates score; clears round counter at match end.
* `scoreboardShowMessage` / `scoreboardClearMessage` → imperative UI hooks.
* `countdownStart` (stat selection) → scoreboard timer starts via `updateTimer`.
* `countdownFinished` → timer cleared; orchestrator may emit auto-select → triggers `showAutoSelect`.
* `nextRoundTimerReady` → orchestrator marks `#next-button[data-next-ready="true"]` (Scoreboard does not own this).
* Visibility events → pause/resume timers.

---

## 6. DOM & ARIA Contract

The Scoreboard reserves these IDs:

* `#round-message`

  * Writes: `textContent`, `data-outcome`.
  * ARIA: `aria-live="polite"`, `aria-atomic="true"`, `role="status"`.

* `#next-round-timer`

  * Writes: countdown text.
  * ARIA: `aria-live="polite"`, `aria-atomic="true"`, `role="status"`.

* `#round-counter`

  * Writes: “Round N” text.
  * ARIA: `aria-live="polite"`.

* `#score-display`

  * Contains two `<span>` children for player/opponent.
  * ARIA: `aria-live="polite"`, `aria-atomic="true"`.
  * Updates animated (500ms).

* `#next-button[data-next-ready="true"]` – orchestrator-owned; Scoreboard observes contract but does not set.

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
