# PRD: Battle Bandit

**Entry Point:** `src/pages/battleBandit.html`
**Uses:** Battle Engine (variant of Classic orchestration)
**Related Docs:** \[prdBattleClassic.md], \[prdRandomJudoka.md], \[prdBattleEngine.md], \[prdBattleScoreboard.md]

---

## 1. TL;DR

The **Battle Bandit** mode is a hybrid between **Classic Battle** and **Random Judoka**.
Players hit a central **“Start Match” button** to trigger a one-arm-bandit style mechanic:

* Both **Player** and **Opponent** judoka cards are selected at random.
* A **stat** is randomly selected for comparison.
* The **Battle Engine** evaluates the round and displays the outcome instantly.
* After a **3-second cooldown**, the player may press the button to start the next round.

The game begins with a **Round Select modal**, similar to Classic Battle, allowing players to confirm or configure initial settings before the first round.

Snackbars will be used to display brief, transient messages (e.g., round outcome confirmations, errors, cooldown notices) during gameplay.

The game ends when either side reaches **10 wins**, with an overall winner declared.

This mode is designed as a **minimal-input, fast-paced battle** with short, repeatable rounds.

---

## 2. Problem Statement

Classic mode relies on user agency in choosing stats, while Random Judoka is single-round only.
Younger or casual players may prefer a **low-interaction, quick-fire experience** that emphasises surprise and speed rather than strategy.
Battle Bandit fills this gap by offering a **slot-machine-like mechanic** that instantly resolves rounds with minimal input.

> *Note: This gap was identified through internal observation of low engagement with multi-choice battles by new or younger users.*

---

## 3. Goals

1. Provide a **minimal-input** game mode with short, repeatable rounds.
2. Ensure **compatibility with the Battle Engine** (shared logic, deterministic outcomes).
3. Display persistent match status (scoreboard) with no overlap from transient prompts.
4. Maintain consistency with Classic mode rules: **first to 10 wins** decides the match.
5. Architect the round resolution flow to support **future slot-reel animation injection**.
6. Reuse and adapt **Round Select modal** from Classic mode for onboarding.
7. Integrate **snackbar system** for short-form status and result feedback.

---

## 4. Scope & Non-Goals

**In scope**

* Round Select modal at match start (adapted from Classic).
* Random judoka selection for both Player and Opponent each round.
* Random stat selection each round (pure, uniform distribution).
* Scoreboard integration (round counter, win counter, outcome message).
* Inter-round cooldown (3s) enforced before next spin.
* Match progression and overall winner declaration.
* Engine variant implementation (Battle Engine extended, not forked).
* Snackbar usage for outcome/status/error prompts.

**Out of scope**

* Player choice of judoka or stats.
* Slot-reel animation (future enhancement).
* Alternate victory conditions (e.g. best of X, endless mode).
* Weighted randomness (rarity/stat weighting).

---

## 5. User Stories

*As a casual player*, I want to press one button to play, so I don’t need to make choices each round.
*As a child or new player*, I want quick matches that are fun to repeat, so I can enjoy the game without learning strategy.
*As a developer*, I want Battle Bandit to reuse the Battle Engine, so that logic is consistent across modes.
*As a player*, I want a clear scoreboard that shows my wins and the current round, so I can easily track progress.
*As a player*, I want the game to announce the overall winner, so I know when the match is complete.
*As a player*, I want a round setup modal before the game starts, so I understand what’s about to happen.
*As a player*, I want short snackbars to notify me of round results, cooldowns, or system messages.

---

## 6. Functional Requirements

### Match Setup

| Priority | Feature                 | Description                                                |
| -------- | ----------------------- | ---------------------------------------------------------- |
| P1       | Load Judoka Pool        | Load full judoka pool (same as Classic).                   |
| P1       | Initialize Scoreboard   | Start scoreboard at 0–0 with round 1.                      |
| P1       | Engine Integration      | Connect Battle Bandit mode to shared Battle Engine.        |
| P1       | Show Round Select Modal | Launch modal on mode entry, using Classic modal structure. |

### Round Flow

| Priority | Feature              | Description                                                                 |
| -------- | -------------------- | --------------------------------------------------------------------------- |
| P1       | Start Round          | On button press, randomly select Player and Opponent judoka.                |
| P1       | Stat Selection       | Randomly select one stat per round.                                         |
| P1       | Evaluate Round       | Use Battle Engine to determine outcome.                                     |
| P1       | Update Scoreboard    | Reflect round result, score, and round number.                              |
| P2       | Cooldown Enforcement | Enforce 3s cooldown before button is re-enabled.                            |
| P3       | Visual Feedback      | Grey out button during cooldown for clarity.                                |
| P2       | Show Snackbars       | Display transient feedback (e.g., results, errors, cooldown notifications). |

### Match End

| Priority | Feature       | Description                                            |
| -------- | ------------- | ------------------------------------------------------ |
| P1       | Win Detection | Declare winner when one side reaches 10 wins.          |
| P2       | Restart Match | Provide "Restart Match" button that resets game state. |

---

## 7. Non-Functional Requirements

* Must integrate with **Battle Engine/Orchestrator** for determinism and testability.
* Scoreboard must update within **≤200ms** of outcome emission.
* Cooldown must be visually clear (e.g. disabled button, greyed state).
* No hidden logic — random selection must be pure and auditable.
* Accessible: outcome messages exposed via ARIA live regions.
* Snackbar system must support stacking and timed dismissal.

---

## 8. Acceptance Criteria

* Pressing “Start Match” instantly reveals both cards and a stat.
* Player judoka and Opponent judoka are selected randomly each round (no memory).
* Stat selection is random each round, no repeats carried forward.
* Scoreboard shows round count and score consistently across match.
* Cooldown of 3 seconds is enforced before next round can be started.
* Game ends when a player reaches 10 wins, with a clear winner message.
* Restart button resets state cleanly to round 1, 0–0 score.
* Restart wipes all prior round data and UI state.
* Round Select modal is shown at match start.
* Snackbars appear on round result and system events.

---

## 9. Edge Cases / Failure States

* If random selection fails, retry mechanism is triggered once.
* If scoreboard update fails, fallback to last known state and log error.
* Browser refresh during match resets state cleanly to round 1.
* If Battle Engine response is delayed >1s, show a spinner and retry up to 3x.
* On cooldown state misfire, disable input until next valid round trigger.
* Snackbar overflow capped to 3 active messages to prevent UI overload.

---

## 10. Design and UX Considerations

* Greyed-out button state during cooldown with subtle animation.
* Scoreboard layout follows Classic mode reference.
* Match result shown as overlay text with ARIA region live support.
* Include mockup reference: \[To be attached by design team].
* Button and scoreboard elements responsive to small and large screen sizes.
* Ensure button hit target ≥48px with clear visual focus indicator.
* Snackbar position anchored (top or bottom), with fade-in/out animation.
* Round Select modal to reuse layout/style from Classic Battle with adjusted text copy.
