# PRD: Battle Engine

**Supports:**  
- [Classic Battle PRD](prdBattleClassic.md)  
- [Classic Battle CLI PRD](prdBattleCLI.md)  

---

## TL;DR

The **Battle Engine** powers JU-DO-KON!’s turn-based match flow.  
It is a **deterministic, UI-agnostic state machine** that handles:  
- match setup,  
- round progression,  
- stat selection with timers,  
- scoring and win conditions,  
- interrupts and recovery.  

This engine ensures every mode (Classic, CLI, future variants) runs on the **same consistent rules**, with outputs exposed via events for any UI to render.

---

## Problem Statement

Classic Battle modes rely on consistent, predictable flow. Without a robust engine:  
- timers drift,  
- states desync from UI,  
- edge cases (timeouts, quits, errors) behave inconsistently,  
- QA automation becomes brittle.  

A clear **battle engine contract** prevents divergence between game modes and guarantees a **fair, testable, and accessible** experience.  

From the **player’s perspective**, these failures break immersion and fairness:  
- A timer drifting can feel like a “stolen turn.”  
- Desynced UI may show incorrect scores, reducing trust.  
- Inconsistent error handling can cause perceived unfair defeats.  

One playtester described this as:  
> “I picked a stat, but the game skipped me — it felt like I didn’t get my turn at all.”  

Framing the engine around **trust, fairness, and clarity** ensures both developers and players benefit.

---

## Goals

1. **Determinism** — Same seed + same inputs → same outcomes.  
2. **UI Independence** — Engine emits events; rendering is external.  
3. **Robust Timing** — Single authoritative timer with drift correction.  
4. **Accessibility Support** — Expose semantics so UIs can meet WCAG.  
5. **Testability** — Provide hooks, seeds, and debug events for automation.  
6. **Recovery** — Handle interrupts gracefully (quit, navigation, error).  

---

## Non-Goals

- Rendering of UI (DOM, ARIA attributes, animations).  
- Multiplayer networking or remote persistence.  
- Advanced rulesets (ranked, handicaps, modifiers).  

---

## User Stories

- **Developer:** I can integrate the engine into any surface without rewriting logic.  
- **Tester:** I can simulate seeded matches and assert outcomes deterministically.  
- **Player (indirect):** The game never skips turns and timers feel fair.  
- **Accessibility Reviewer:** UIs receive structured events (timers, states, outcomes) to announce correctly.  

---

## Player Flow

From a player’s perspective, a typical match follows this flow:  

1. **Start Match** — Player presses "Start," engine enters matchStart.  
2. **Round Start** — Player sees available stats, timer begins.  
3. **Player Choice**  
   - If the player chooses a stat: engine validates, compares, scores.  
   - If timer expires:  
     - With `autoSelect = true`, engine picks a stat automatically.  
     - With `autoSelect = false`, match flow interrupts.  
4. **Cooldown** — A short pause (default 3s) before next round.  
5. **Interrupts** — If player quits, navigates away, or an error occurs, engine ends or rolls back cleanly.  
6. **Match End** — Game ends on win target or max rounds.  

**Cancellation/Backout:** If a player navigates away mid-selection, the engine transitions to an interrupt state and ends the round safely.  

**Feedback Timing:**  
- Choice confirmation → feedback emitted within 250ms.  
- Timer resumption after pause → countdown correction displayed within 500ms.  
- Match end → clear terminal state, no lingering timers.  

---

## Defaults (Configurable)

- **Stat Selection Timer:** 30 s  
- **Cooldown Between Rounds:** 3 s  
- **Win Target:** 5 / 10 / 15 (default: 10)  
- **Max Rounds:** 25 (match ends in draw if exceeded)  
- **Random Stat Mode (`autoSelect`):** Enabled by default  

**Clarification:** These defaults are *developer-configurable*. Players do not directly adjust them in Classic or CLI modes, but future variants may expose them in settings.

---

## Acceptance Criteria

- **State Accuracy**  
  - Given a documented state transition, When the trigger is fired, Then the engine moves to the correct next state only.  

- **Selection Window**  
  - Given a round prompt, When a player submits a valid stat, Then only the first valid input is accepted and extras are ignored.  
  - Given an invalid statKey, When chooseStat is called, Then the engine rejects it and emits an `error:event`.  

- **Timeout**  
  - Given autoSelect=true, When timer expires, Then the engine auto-selects a stat and continues.  
  - Given autoSelect=false, When timer expires, Then the engine transitions to interruptRound.  

- **Drift Handling**  
  - Given system sleep or clock drift >2s, When resumed, Then the engine corrects timers and emits a debug correction event.  

- **Scoring**  
  - Given a resolved round outcome, When values are compared, Then score:update is emitted within ≤250 ms.  

- **Match End**  
  - Given a player reaches win target OR max rounds is exceeded, When round completes, Then match:end is emitted with final scores.  

- **Interrupt Stability**  
  - Given an interrupt event, When applied, Then the engine ends in a clean terminal or rollback state with no ghost timers.  

- **Reproducibility**  
  - Given the same seed and flags, When a match is replayed, Then the transcript is identical across all supported platforms.  

- **Performance**  
  - Given reference hardware, When processing transitions, Then handling completes within ≤5 ms.  

---

## Edge Cases

- Dataset fails to load → engine emits error.  
- Player inactivity with autoSelect=false → safe interrupt path.  
- Clock jump/drift > 2 s → emit debug correction, adjust timers.  
- Duplicate input events → ignore after first valid choice.  
- Unexpected error → transition to interruptMatch.  

---

## Design and UX Considerations

Although the engine is UI-agnostic, UIs must render its events consistently to maintain fairness and clarity:  
- **Timeouts:** UI should visually show when autoSelect is applied or when an interrupt occurs.  
- **Interrupts:** Show clear modal or overlay messaging (e.g., “Match ended due to quit” or “Error occurred”).  
- **Recovery:** Resume flows should include player feedback (paused timers, resuming countdown).  
- **Accessibility:** Ensure all emitted events map to UI announcements (ARIA live regions, screen reader alerts).  

**Recommendation:** Provide lightweight wireframes or flows in linked UI PRDs showing how Classic UI and CLI consume these events. For accessibility review, document minimum semantics (e.g., all `state:change`, `round:timeout`, and `match:end` events must trigger live announcements).  

---

## Open Questions

1. Should win target and timer length be configurable in future modes (e.g., “quick play”)?  
2. Should AI logic live in the engine or remain external (supplied by UI)?  
3. Should mid-match feature flag changes be allowed or locked at startMatch()?  

---

## API Surface

### Constructor
```js
const engine = createBattleEngine({
  pointsToWin?: 5 | 10 | 15,
  maxRounds?: number,
  seed?: number,
  flags?: { autoSelect?: boolean; skipRoundCooldown?: boolean; enableTestMode?: boolean },
  deck?: Judoka[],
});
```

---

## Controls

```js
engine.startMatch();
engine.chooseStat(statKey: string);
engine.interrupt(kind: "quit" | "navigate" | "error");
engine.resume();
engine.pauseTimers();
engine.resumeTimers();
```

---

## Queries

```js
engine.getState();   // { stateId, round, scores, remainingMs, ... }
engine.getSeed();    // number
engine.getFlags();   // effective feature flags
```

---

## Events

	•	state:change → { from, to, context }
	•	round:start → { round }
	•	round:prompt → { round, availableStats }
	•	round:timeout → { round }
	•	round:decision → { outcome, stat, values }
	•	score:update → { player, opponent }
	•	cooldown:start → { ms }
	•	cooldown:end → { round }
	•	match:end → { winner, scores, reason }
	•	timer:tick → { id, remainingMs }
	•	debug → detailed internal transitions (test mode only)

⸻

## State Machine (Canonical)

States
	1.	waitingForMatchStart
	2.	matchStart
	3.	cooldown
	4.	roundStart
	5.	waitingForPlayerAction
	6.	roundDecision
	7.	roundOver
	8.	matchDecision
	9.	matchOver
	10.	interruptRound
	11.	interruptMatch

From
Trigger
Guard
To
waitingForMatchStart
startMatch
valid config
matchStart
matchStart
ready
–
cooldown
cooldown
ready
–
roundStart
roundStart
cardsReady
–
waitingForPlayerAction
waitingForPlayerAction
chooseStat
valid
roundDecision
waitingForPlayerAction
timeout
autoSelect
roundDecision
waitingForPlayerAction
timeout
!autoSelect
interruptRound
roundDecision
resolved
–
roundOver
roundOver
matchPointReached
–
matchDecision
roundOver
continue
–
cooldown
matchDecision
finalize
–
matchOver
any
interrupt
kind
interruptRound / interruptMatch

---

## Functional Requirements (Prioritized)

P
Feature
Requirement
P1
Deterministic State Machine
No skipped/duplicate states; transitions only via documented triggers.
P1
Round Logic
One valid stat choice per round; compares values; applies scoring.
P1
Timers
30 s stat selection timer; pause/resume; drift correction (≥2 s).
P1
Scoring
+1 point to winner; ties = 0.
P1
End Conditions
End at win target or max rounds.
P2
Interrupts
Quit/navigate/error handled via explicit interrupt states; rollback or match termination.
P2
Cooldown
3 s delay between rounds unless skipRoundCooldown.
P2
Validation
Reject invalid stat keys or actions in wrong states. Emit error:event with reason.
P3
Debug Mode
Extra events, seed injection, fast timers for deterministic tests.


---

## Mermaid Diagram

sequenceDiagram
  autonumber
  actor Player
  participant UI as UI Layer (Classic/CLI)
  participant ENG as BattleEngine
  participant TMR as TimerController
  participant RNG as Seeded PRNG

  Note over UI,ENG: Boot & Config
  UI->>ENG: createBattleEngine({ pointsToWin, seed, flags, deck? })
  ENG-->>UI: on("state:change" | "timer:tick" | "score:update" | ...)

  Note over Player,ENG: Start Match
  Player->>UI: Click "Start"
  UI->>ENG: startMatch()
  ENG->>ENG: init scores, round=1
  ENG-->>UI: state:change(waitingForMatchStart→matchStart)
  ENG-->>UI: state:change(matchStart→cooldown)
  ENG->>TMR: start(COOLDOWN_MS)
  TMR-->>UI: timer:tick(remainingMs)
  TMR-->>ENG: done()
  ENG-->>UI: state:change(cooldown→roundStart)

  Note over ENG,RNG: Round Start
  ENG->>RNG: draw player/opponent cards
  ENG-->>UI: round:start({ round })
  ENG-->>UI: state:change(roundStart→waitingForPlayerAction)
  ENG-->>UI: round:prompt({ round, availableStats })
  ENG->>TMR: start(ROUND_SELECTION_MS)

  alt Player chooses in time
    Player->>UI: Pick stat
    UI->>ENG: chooseStat(statKey)
    ENG->>ENG: validate & compare
    ENG-->>UI: round:decision({ outcome, stat, values })
    ENG-->>UI: score:update({ player, opponent })
  else Timeout
    TMR-->>ENG: timeout()
    ENG-->>UI: round:timeout({ round })
    alt flags.autoSelect
      ENG->>RNG: auto-pick stat
      ENG-->>UI: round:decision(...)
      ENG-->>UI: score:update(...)
    else no autoSelect
      ENG-->>UI: state:change(waitingForPlayerAction→interruptRound)
    end
  end

  Note over ENG,TMR: Cooldown / Next Round
  ENG-->>UI: state:change(roundDecision→roundOver)
  ENG-->>UI: (if matchPoint) state:change(roundOver→matchDecision→matchOver)
  ENG->>TMR: start(COOLDOWN_MS) (unless skipRoundCooldown)
  TMR-->>ENG: done()
  ENG-->>UI: state:change(roundOver→cooldown→roundStart) (next round)

---

## Minimal State Contract (reference)

stateDiagram-v2
  [*] --> waitingForMatchStart
  waitingForMatchStart --> matchStart: startMatch
  matchStart --> cooldown: ready
  cooldown --> roundStart: ready
  roundStart --> waitingForPlayerAction: cardsReady
  waitingForPlayerAction --> roundDecision: chooseStat / timeout&autoSelect
  waitingForPlayerAction --> interruptRound: timeout & !autoSelect
  roundDecision --> roundOver: resolved
  roundOver --> matchDecision: matchPointReached
  roundOver --> cooldown: continue
  matchDecision --> matchOver: finalize
  state interruptRound {
    [*] --> interruptRound
  }
  state interruptMatch {
    [*] --> interruptMatch
  }
  roundStart --> interruptRound: interrupt
  waitingForPlayerAction --> interruptRound: interrupt
  roundDecision --> interruptRound: interrupt
  matchStart --> interruptMatch: interrupt/error
  matchDecision --> interruptMatch: interrupt
  matchOver --> waitingForMatchStart: rematch/home

---

Event I/O Cheat Sheet

Inputs (from UI):
	•	startMatch()
	•	chooseStat(statKey)
	•	interrupt(kind: “quit” | “navigate” | “error”)
	•	pauseTimers() / resumeTimers()

Outputs (to UI):
	•	state:change(from, to, ctx)
	•	round:start({ round })
	•	round:prompt({ round, availableStats })
	•	timer:tick({ id, remainingMs })
	•	round:timeout({ round })
	•	round:decision({ outcome, stat, values })
	•	score:update({ player, opponent })
	•	cooldown:start({ ms }), cooldown:end({ round })
	•	match:end({ winner, scores, reason })
	•	debug(evt) (test mode)

---

**See also:**

- [Classic Battle PRD](prdBattleClassic.md)
- [Battle Scoreboard PRD](prdBattleScoreboard.md)
- [stateTable.js](../../src/helpers/classicBattle/stateTable.js)
- [BattleEngine.js](../../src/helpers/BattleEngine.js)
- [orchestrator.js](../../src/helpers/classicBattle/orchestrator.js)
- [battleStateProgress.js](../../src/helpers/battleStateProgress.js)

---

## Tasks

- [ ] 1.0 Implement State Machine
  - [ ] 1.1 Define states and transitions in `stateTable.js`
  - [ ] 1.2 Implement orchestrator for state flow
  - [ ] 1.3 Expose state via event emitters
- [ ] 2.0 Build Round Logic
  - [ ] 2.1 Implement stat selection and validation
  - [ ] 2.2 Compare stats and compute round outcome
  - [ ] 2.3 Update scores (+1, ties=0)
- [ ] 3.0 Implement Timer System
  - [ ] 3.1 Add 30s stat selection timer with pause/resume
  - [ ] 3.2 Handle drift correction (>2s jumps)
  - [ ] 3.3 Emit timer:tick for UI
- [ ] 4.0 Handle Interrupts
  - [ ] 4.1 Add quit, navigate, error interrupts
  - [ ] 4.2 Define rollback/match termination logic
- [ ] 5.0 Testing & Debugging
  - [ ] 5.1 Add hooks for Playwright/automation
  - [ ] 5.2 Log state transitions in debug mode
  - [ ] 5.3 Unit test timers, scoring, and interrupts
