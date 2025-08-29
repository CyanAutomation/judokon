# PRD: Battle Engine

---

**Supports:** [Classic Battle Mode PRD](prdBattleClassic.md)

---

## TL;DR

The Battle Engine defines the core mechanics, state transitions, and round logic for JU-DO-KON!'s Classic Battle mode.
It manages match setup, round progression, stat selection, scoring, timers, and end conditions, ensuring a smooth, accessible, and testable game flow.  
This PRD details the state machine, round logic, and technical requirements for the engine and orchestrator modules.

---

## Problem Statement

Classic Battle requires a **robust, deterministic engine** to manage match flow, scoring, and state transitions.  
In recent internal tests, **12–18% of matches** experienced timing inconsistencies or incorrect state transitions due to incomplete timer drift handling and unclear interrupt recovery logic.  

**From a player’s perspective:**  
> “The timer froze for me and then skipped my turn. I didn’t even get to pick my stat — that felt unfair.”  

Without a clear state machine and timer system, matches risk becoming **unpredictable**, **less accessible**, and **hard to test at scale**.  
A well-defined engine will enable consistent gameplay, predictable UI updates that display promptly, and full edge case handling for all device and connection scenarios.

---

## Goals

1. **Predictable Match Flow** — Ensure 100% of Classic Battle matches follow the defined state sequence from `src/helpers/classicBattle/stateTable.js` with no skipped or duplicate states.
2. **UI Feedback Speed** — Surface round results, timers, and scores to the UI within target response budgets.  
3. **Accessibility Compliance** — Meet WCAG 2.1 AA contrast, focus, and readability guidelines for all state and timer displays.  
4. **Test Coverage** — Achieve **≥95% automated test pass rate** for match state and timer scenarios in Playwright and unit tests.  
5. **Interrupt Recovery** — Handle 100% of quit, navigation, and error interrupts without corrupting match state or causing UI desync.

---

## Defaults (Developer Configurable)

- **Stat Selection Timer:** 30 seconds, or another value
- **Win Target:** User-selected at match start (5, 10, or 15 round wins)
- **Random Stat Mode (`autoSelect`):** Enabled by default

> **Note:** Feature flags use camelCase keys.

---

## User Stories

- As a developer, I want a state machine that exposes the current match state so I can drive UI updates and tests.  
- As a player, I want the game to progress smoothly through rounds, with clear feedback at each step.  
- As a tester, I want to simulate and verify all match states and transitions, including edge cases and interruptions.  
- As a player with accessibility needs, I want timers and messages to be surfaced in a way that is readable and responsive.

---

## Functional Requirements (Prioritized)

| Priority | Feature                      | Description                                                                                                                        |
|----------|------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| **P1**   | State Machine                | Implements all match states and transitions as defined in `src/helpers/classicBattle/stateTable.js`. Exposes current state to UI and tests.       |
| **P1**   | Round Logic                  | Handles round start, stat selection, comparison, scoring, and round end.                                                          |
| **P1**   | Stat Selection Timer         | 30s timer for stat selection, with pause/resume and auto-select fallback (Random Stat Mode, `autoSelect`, enabled by default). |
| **P1**   | Scoring                      | Updates player and opponent scores after each round.                                                                               |
| **P1**   | Match End Condition          | Ends match when user-selected win target is reached; exposes final result and score.                                               |
| **P2**   | Interrupt Handling           | Supports early quit, navigation, or error interrupts. Navigation away pauses play and rolls back to the last completed round. Unexpected errors revert to the last stable state, surface an error message, and return to the lobby. |
| **P2**   | Accessibility Hooks          | Ensures all state and timer feedback meets WCAG AA guidelines.                                                                    |
| **P3**   | Debug/Test Hooks             | Exposes state, transitions, and logs for automated tests and debugging.                                                           |

---

## Acceptance Criteria (Given/When/Then Format)

1. **State Machine Accuracy**  
   - **Given** a match is running  
   - **When** a state transition occurs  
   - **Then** the new state must match the definition in `src/helpers/classicBattle/stateTable.js` exactly.

2. **Timer Behavior**  
   - **Given** the player is in `waitingForPlayerAction`  
   - **When** the timer reaches zero  
   - **Then**  
    - If `autoSelect` (Random Stat Mode) is enabled → system auto-selects the highest stat allowed by rules, and match proceeds to `roundDecision`.
    - If `autoSelect` is disabled → match proceeds to `interruptRound` or a defined grace extension.

3. **Timer Drift Handling**  
   - **Given** the tab is inactive or device clock drifts by >200ms  
   - **When** the player returns or drift is detected  
   - **Then** the timer adjusts to the correct remaining time without skipping or repeating.

4. **Score Update Speed**  
   - **Given** a round outcome is determined  
   - **When** the result is revealed  
   - **Then** the scoreboard updates both player and opponent scores promptly (p50 ≤250ms, p95 ≤500ms on reference hardware).

5. **Interrupt Stability**
   - **Given** the player quits, navigates away, or triggers an error
   - **When** the interrupt is handled
   - **Then** the UI remains stable, the state is rolled back or ended appropriately, and no desync occurs.
   - Roll back the match to the last completed round when the player navigates away.
   - Roll back the match and display an error message when an unexpected error occurs.

6. **Random Seed Reproducibility**
   - **Given** a match is started with a specific seed value
   - **When** the engine runs the match
   - **Then** all random draws and stat selections are reproducible for that seed, verified by automated tests.

7. **Performance**
   - **Given** a match with 15 rounds
   - **When** the engine processes state transitions and scoring
   - **Then** all transitions and updates complete within 50ms per state on reference hardware (Node 18+, Chrome 120+).

---

## Edge Cases / Failure States

- **Timeout Auto-Select:** If enabled via `autoSelect` (Random Stat Mode), the engine auto-selects highest stat by ruleset; otherwise follow fallback path.
- **Tab Inactivity / App Backgrounding:** Timers pause; state resumes accurately on return.  
- **Error Injection (Testing):** Engine must recover from simulated logic or UI hook errors without corrupting match state.

## Interrupt Workflow

When a player quits in the middle of a match, the engine follows a defined sequence to safely unwind state:

1. `interrupt` transitions the machine into `interruptRound` or `interruptMatch`.
2. From `interruptRound`, `abortMatch` advances to `matchOver`, allowing rollback hooks to run.
3. From `interruptMatch`, `toLobby` returns to `waitingForMatchStart` without reaching `matchOver`.
4. Navigation away from the battle screen occurs only after the above transitions complete.

---

## Dependencies

- `stateTable.js` defines all match states and transitions.
- `BattleEngine.js` implements round logic, scoring, timer, and match end conditions.  
- `orchestrator.js` manages state machine, transitions, and exposes hooks for UI and tests.  
- `battleStateProgress.js` renders state progress bar and syncs active state.  
- Scoreboard UI and accessibility requirements as described in `prdBattleScoreboard.md`.

---

## Match Flow

The Battle Engine PRD focuses on technical implementation details for state management, timer logic, and deterministic randomization. Gameplay rules and user-facing logic are described in the Classic Battle PRD; this document covers how the engine orchestrates those rules programmatically.

- State transitions, timer management, and scoring are implemented as pure functions and exposed via orchestrator hooks for UI and test automation.
- Random card draws use a seedable PRNG to ensure reproducibility for test and debug scenarios. The engine exposes a method to set and retrieve the current seed.
- The progress bar and UI hooks are updated via engine events, not direct UI logic.

---

### 1. `waitingForMatchStart`
The game is idle before a match begins. The UI displays a “Start Match” button and allows the user to select the win target (5, 10, or 15 wins).

- **Triggers:**  
  - `startClicked` → **`matchStart`**  
  - `navigateHome` or `interrupt` → **`waitingForMatchStart`** (no match context yet, stays in lobby)  
- **Notes:** No round data is active yet.

---

### 2. `matchStart`
The match setup phase — win target is stored, scores reset, and the user is set as the first player.

- **Triggers:**
  - `ready` → **`cooldown`**
  - `interrupt / error` → **`interruptMatch`**
- **Notes:** No shuffling occurs; random draw will happen at each round start. After setup the engine enters a brief
  cooldown that runs a `matchStartTimer` (default 3s) before the first round begins.

---

### 3. `cooldown`
A short pacing pause between match start or rounds.

- **Triggers:**
  - `ready` → **`roundStart`**
  - `interrupt` → **`interruptRound`**
- **Notes:** Scoreboard and snackbar show countdown to round. The initial entry uses the `matchStartTimer` to pace the
  start of the match before any cards are revealed.

---

### 4. `roundStart`
A new round begins — both the user and opponent are assigned random judoka via the random draw function.

- **Triggers:**  
  - `cardsRevealed` → **`waitingForPlayerAction`**  
  - `interrupt` → **`interruptRound`**  
- **Notes:** Cards are revealed immediately after draw for the current round.

---

### 5. `waitingForPlayerAction`
The game waits for a stat selection.

- **Triggers:**
  - `statSelected` → **`roundDecision`**
  - `timeout` (if `autoSelect` enabled) → **`roundDecision`**
  - `timeout` (if `autoSelect` disabled) → **`interruptRound`**
  - `interrupt` → **`interruptRound`**
- **Notes:** The user always chooses first; AI only selects if it is the AI’s turn in other modes. Stat buttons remain disabled until this state is entered and are disabled again when leaving it.

---

### 6. `roundDecision`
Compares selected stat values and determines the round winner.

- **Triggers:**  
  - `outcome=winP1 / outcome=winP2 / outcome=draw` → **`roundOver`**  
  - `interrupt` → **`interruptRound`**  
- **Notes:** Scoreboard shows result and reveals chosen stats.

---

### 7. `roundOver`
Updates scores.

- **Triggers:**  
  - `matchPointReached` (guard: `scoreP1 >= winTarget` OR `scoreP2 >= winTarget`) → **`matchDecision`**  
  - `continue` → **`cooldown`**  
  - `interrupt` → **`interruptRound`**

---

### 8. `matchDecision`
Determines the overall match winner.

- **Triggers:**  
  - `finalize` → **`matchOver`**  
  - `interrupt` → **`interruptMatch`**

---

### 9. `matchOver`
Match complete; final scoreboard displayed.

- **Triggers:**  
  - `rematch` → **`waitingForMatchStart`**  
  - `home` → **`waitingForMatchStart`**

---

### 10. `interruptRound`
Round interrupted (quit, navigation, error).

- **Triggers:**  
  - `restartRound` → **`cooldown`**  
  - `resumeLobby` → **`waitingForMatchStart`**  
  - `abortMatch` → **`matchOver`**  
  - `roundModifyFlag` (if `FF_ROUND_MODIFY` enabled) → **`roundModification`**

---

### 11. `roundModification` (admin/test only)
Applies manual changes for testing or admin purposes.

- **Triggers:**  
  - `modifyRoundDecision` → **`roundDecision`**  
  - `cancelModification` → **`interruptRound`**

---

### 12. `interruptMatch`
Match interrupted from setup or critical error.

- **Triggers:**  
  - `restartMatch` → **`matchStart`**  
  - `toLobby` → **`waitingForMatchStart`**

---

## Transition Table

| State | Trigger | Guard (if any) | Next State | Notes |
|---|---|---|---|---|
| **waitingForMatchStart** | startClicked | – | matchStart | User selects win target, match begins. |
| waitingForMatchStart | navigateHome / interrupt | – | waitingForMatchStart | No match to abort; remain in lobby. |
| **matchStart** | ready | – | cooldown | Init complete, enter pacing pause. |
| matchStart | interrupt / error | – | interruptMatch | Critical abort path. |
| **cooldown** | ready | – | roundStart | Enter new round. |
| cooldown | interrupt | – | interruptRound | Round-level abort rail. |
| **roundStart** | cardsRevealed | – | waitingForPlayerAction | Random draw and reveal of judoka. |
| roundStart | interrupt | – | interruptRound | Round-level abort rail. |
| **waitingForPlayerAction** | statSelected | – | roundDecision | User made a choice. |
| waitingForPlayerAction | timeout | autoSelectEnabled | roundDecision | Auto-pick stat. |
| waitingForPlayerAction | timeout | !autoSelectEnabled | interruptRound | No auto-pick; treat as interrupt or grace. |
| waitingForPlayerAction | interrupt | – | interruptRound | Round-level abort rail. |
| **roundDecision** | outcome=winP1 / winP2 / draw | – | roundOver | Deterministic outcome. |
| roundDecision | interrupt | – | interruptRound | Round-level abort rail. |
| **roundOver** | matchPointReached | scoreP1 >= winTarget OR scoreP2 >= winTarget | matchDecision | Win target met. |
| roundOver | continue | – | cooldown | Next round pacing. |
| roundOver | interrupt | – | interruptRound | Round-level abort rail. |
| **matchDecision** | finalize | – | matchOver | Declare winner. |
| matchDecision | interrupt | – | interruptMatch | Match-level abort rail. |
| **matchOver** | rematch | – | waitingForMatchStart | Return to lobby. |
| matchOver | home | – | waitingForMatchStart | Return to main screen. |
| **interruptRound** | restartRound | – | cooldown | Resume round loop. |
| interruptRound | resumeLobby | – | waitingForMatchStart | Exit to lobby. |
| interruptRound | abortMatch | – | matchOver | Cancel match. |
| interruptRound | roundModifyFlag | FF_ROUND_MODIFY | roundModification | Admin/test branch. |
| **roundModification** | modifyRoundDecision | – | roundDecision | Apply and re-evaluate. |
| roundModification | cancelModification | – | interruptRound | Discard changes. |
| **interruptMatch** | restartMatch | – | matchStart | Restart match. |
| interruptMatch | toLobby | – | waitingForMatchStart | Exit to lobby. |

---

## Mermaid Diagram

```mermaid
flowchart TD
  A([waitingForMatchStart]) -->|startClicked (select win target)| B[matchStart]
  A -->|navigateHome / interrupt| A

  subgraph InMatch
    direction LR

    B -->|ready| C[cooldown]
    B -->|interrupt / error| M[interruptMatch]

    C -->|ready| D[roundStart]
    C -->|interrupt| L[interruptRound]

    D -->|cardsRevealed| E[waitingForPlayerAction]
    D -->|interrupt| L

    E -->|statSelected| F[roundDecision]
    E -->|timeout & autoSelect| F
    E -->|timeout & !autoSelect| L
    E -->|interrupt| L

    F -->|winP1 / winP2 / draw| G[roundOver]
    F -->|interrupt| L

    G -->|matchPointReached| H[matchDecision]
    G -->|continue| C
    G -->|interrupt| L

    H -->|finalize| I([matchOver])
    H -->|interrupt| M

    L -->|restartRound| C
    L -->|resumeLobby| A
    L -->|abortMatch| I
    L -->|roundModifyFlag & FF_ROUND_MODIFY| N[roundModification]
    N -->|modifyRoundDecision| F
    N -->|cancelModification| L

    M -->|restartMatch| B
    M -->|toLobby| A
  end

  I -->|rematch| A
  I -->|home| A
```

---

## Open Questions

- Should timer duration or win target be adjustable in future versions?
- How should additional difficulty settings or AI logic be integrated into the state machine?
- Are there additional edge cases or failure states that require explicit state handling?

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
  - [ ] 1.1 Define states and transitions in `src/helpers/classicBattle/stateTable.js`
  - [ ] 1.2 Create `orchestrator.js` to manage state changes
  - [ ] 1.3 Expose state via DOM and window hooks
- [ ] 2.0 Build Round Logic
  - [ ] 2.1 Implement stat selection handling
  - [ ] 2.2 Compare stat values and determine round winner
  - [ ] 2.3 Update scores and manage tie handling
- [ ] 3.0 Implement Timer System
  - [ ] 3.1 Create 30s stat selection timer with pause/resume
  - [ ] 3.2 Detect and correct drift; fire auto-select on expiry
  - [ ] 3.3 Surface timer state for UI and accessibility
- [-] 4.0 Handle Interrupts
  - [-] 4.1 Implement quit, navigation, and error interrupts
  - [x] 4.2 Define rollback or match termination logic
- [ ] 5.0 Testing & Debugging
  - [ ] 5.1 Add Playwright hooks for automated state validation
  - [ ] 5.2 Add logging for all state transitions
  - [ ] 5.3 Create unit tests for timer and scoring logic
