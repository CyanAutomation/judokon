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

The game ends when either side reaches **10 wins**, with an overall winner declared.

This mode is designed as a **minimal-input, fast-paced battle** with short, repeatable rounds.

---

## 2. Problem Statement

Classic mode relies on user agency in choosing stats, while Random Judoka is single-round only.
Younger or casual players may prefer a **low-interaction, quick-fire experience** that emphasises surprise and speed rather than strategy.
Battle Bandit fills this gap by offering a **slot-machine-like mechanic** that instantly resolves rounds with minimal input.

---

## 3. Goals

1. Provide a **minimal-input** game mode with short, repeatable rounds.
2. Ensure **compatibility with the Battle Engine** (shared logic, deterministic outcomes).
3. Display persistent match status (scoreboard) with no overlap from transient prompts.
4. Maintain consistency with Classic mode rules: **first to 10 wins** decides the match.
5. Leave room for a **future slot-reel animation update**.

---

## 4. Scope & Non-Goals

**In scope**

* Random judoka selection for both Player and Opponent each round.
* Random stat selection each round (pure, uniform distribution).
* Scoreboard integration (round counter, win counter, outcome message).
* Inter-round cooldown (3s) enforced before next spin.
* Match progression and overall winner declaration.
* Engine variant implementation (Battle Engine extended, not forked).

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

---

## 6. Functional Requirements

### Match Setup

* Load full judoka pool (same as Classic).
* Initialise scoreboard (0–0, round 1).

### Round Flow

* On button press:

  * Randomly select Player judoka.
  * Randomly select Opponent judoka.
  * Randomly select one stat.
  * Evaluate outcome via Battle Engine.
  * Update scoreboard (round result, wins, round number).
* After result, enforce a **3-second cooldown** before enabling button again.

### Match End

* Continue until one side reaches 10 wins.
* Display overall winner (Player or Opponent).
* Offer “Restart Match” option.

---

## 7. Non-Functional Requirements

* Must integrate with **Battle Engine/Orchestrator** for determinism and testability.
* Scoreboard must update within **≤200ms** of outcome emission.
* Cooldown must be visually clear (e.g. disabled button, greyed state).
* No hidden logic — random selection must be pure and auditable.
* Accessible: outcome messages exposed via ARIA live regions.

---

## 8. Acceptance Criteria

* Pressing “Start Match” instantly reveals both cards and a stat.
* Player judoka and Opponent judoka are selected randomly each round (no memory).
* Stat selection is random each round, no repeats carried forward.
* Scoreboard shows round count and score consistently across match.
* Cooldown of 3 seconds is enforced before next round can be started.
* Game ends when a player reaches 10 wins, with a clear winner message.
* Restart button resets state cleanly to round 1, 0–0 score.

---

## 9. Dependencies

* \[prdBattleEngine.md] — shared engine logic, event taxonomy.
* \[prdBattleClassic.md] — victory conditions and scoreboard reference.
* \[prdRandomJudoka.md] — random card selection logic reference.
* \[prdBattleScoreboard.md] — scoreboard UI implementation.
* Snackbar (transient prompts) not used in this mode.
