/**
 * JU-DO-KON! Battle Engine
 *
 * @fileoverview Implements core game logic for scoring, round timing, match state, and stat selection timer with pause/resume and auto-selection. UI modules should access this logic through the facade in `helpers/api/battleUI.js` to keep DOM concerns separate.
 * @note This module does NOT handle card rendering, stat concealment, or animation. Stat obscuring and card transitions are managed in the UI layer (see JudokaCard, battleJudokaPage.js, and helpers/api/battleUI.js).
 */

import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { TimerController } from "./TimerController.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];
const DRIFT_THRESHOLD = 2;

/**
 * Compare two stat values and report the winner.
 *
 * @pseudocode
 * 1. Compute `delta = playerVal - computerVal`.
 * 2. If `delta > 0` winner is `"player"`.
 * 3. Else if `delta < 0` winner is `"computer"`.
 * 4. Otherwise winner is `"tie"`.
 * 5. Return `{ delta, winner }`.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} computerVal - Opponent's stat value.
 * @returns {{delta: number, winner: "player"|"computer"|"tie"}}
 */
export function compareStats(playerVal, computerVal) {
  const delta = playerVal - computerVal;
  let winner = "tie";
  if (delta > 0) winner = "player";
  else if (delta < 0) winner = "computer";
  return { delta, winner };
}

const DELTA_OUTCOME = {
  1: {
    message: "You win the round!",
    update(engine) {
      engine.playerScore += 1;
    }
  },
  0: {
    message: "Tie – no score!",
    update() {}
  },
  [-1]: {
    message: "Opponent wins the round!",
    update(engine) {
      engine.computerScore += 1;
    }
  }
};

/**
 * Create a drift watcher for a timer controller.
 *
 * @pseudocode
 * 1. Record `start = Date.now()` and `pausedAt = null; pausedMs = 0`.
 * 2. Every second:
 *    a. If `timer.hasActiveTimer()` is false, clear the interval.
 *    b. Read `{remaining, paused}` from `timer.getState()`.
 *    c. If `paused` and `pausedAt` is null, set `pausedAt = Date.now()` and continue.
 *    d. If not `paused` and `pausedAt` exists, add `Date.now() - pausedAt` to `pausedMs` and clear `pausedAt`.
 *    e. Compute `elapsed = (Date.now() - start - pausedMs) / 1000`.
 *    f. Set `expected = duration - floor(elapsed)`.
 *    g. If `remaining - expected` exceeds `DRIFT_THRESHOLD`, clear interval and call `onDrift(remaining)`.
 * 3. Return a function that clears the interval.
 *
 * @param {TimerController} timer - Timer to monitor.
 * @returns {(duration: number, onDrift: function(number): void) => function(): void}
 */
export function createDriftWatcher(timer) {
  return (duration, onDrift) => {
    const start = Date.now();
    let pausedAt = null;
    let pausedMs = 0;
    const interval = setInterval(() => {
      if (!timer.hasActiveTimer()) {
        clearInterval(interval);
        return;
      }
      const { remaining, paused } = timer.getState();
      if (paused) {
        if (pausedAt === null) pausedAt = Date.now();
        return;
      }
      if (pausedAt !== null) {
        pausedMs += Date.now() - pausedAt;
        pausedAt = null;
      }
      const elapsed = Math.floor((Date.now() - start - pausedMs) / 1000);
      const expected = duration - elapsed;
      if (remaining - expected > DRIFT_THRESHOLD) {
        clearInterval(interval);
        if (typeof onDrift === "function") onDrift(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  };
}

export class BattleEngine {
  constructor() {
    this.pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN;
    this.playerScore = 0;
    this.computerScore = 0;
    this.timer = new TimerController();
    this.matchEnded = false;
    this.roundsPlayed = 0;
  }

  /**
   * Set the points required to win the match.
   *
   * @pseudocode
   * 1. Assign `value` to `pointsToWin`.
   *
   * @param {number} value - New points threshold to win.
   * @returns {void}
   */
  setPointsToWin(value) {
    this.pointsToWin = value;
  }

  /**
   * Get the points required to win the match.
   *
   * @pseudocode
   * 1. Return `pointsToWin`.
   *
   * @returns {number}
   */
  getPointsToWin() {
    return this.pointsToWin;
  }

  stopTimer() {
    this.timer.stop();
  }

  #endMatchIfNeeded() {
    if (
      this.playerScore >= this.pointsToWin ||
      this.computerScore >= this.pointsToWin ||
      this.roundsPlayed >= CLASSIC_BATTLE_MAX_ROUNDS
    ) {
      this.matchEnded = true;
      if (this.playerScore > this.computerScore) {
        return "You win the match!";
      }
      if (this.playerScore < this.computerScore) {
        return "Opponent wins the match!";
      }
      return "Match ends in a tie!";
    }
    return "";
  }

  /**
   * Start the round/stat selection timer with pause/resume and auto-selection support.
   *
   * @pseudocode
   * 1. Delegate to `TimerController.startRound` with callbacks.
   * 2. Guard the expiration callback so it doesn't fire after the match ends.
   *
   * @param {function} onTick - Callback each second with remaining time.
   * @param {function(): Promise<void>} onExpired - Callback when timer expires (auto-select logic).
   * @param {number} [duration] - Timer duration in seconds.
   * @returns {Promise<void>} Resolves when the timer starts.
   */
  startRound(onTick, onExpired, duration) {
    return this.timer.startRound(
      onTick,
      async () => {
        if (!this.matchEnded) await onExpired();
      },
      duration
    );
  }

  /**
   * Start the cooldown timer between rounds.
   *
   * @pseudocode
   * 1. Delegate to `TimerController.startCoolDown` with callbacks.
   * 2. Guard the expiration callback against post-match execution.
   *
   * @param {function} onTick - Callback each second with remaining time.
   * @param {function(): (void|Promise<void>)} onExpired - Callback when timer expires.
   * @param {number} [duration] - Cooldown duration in seconds.
   * @returns {Promise<void>} Resolves when the timer starts.
   */
  startCoolDown(onTick, onExpired, duration) {
    return this.timer.startCoolDown(
      onTick,
      async () => {
        if (!this.matchEnded) await onExpired();
      },
      duration
    );
  }

  /**
   * Pause the round/stat selection timer.
   *
   * @pseudocode
   * 1. Set the `paused` flag to true.
   * 2. If a timer is running, call `pause()` on it.
   */
  pauseTimer() {
    this.timer.pause();
  }

  /**
   * Resume the round/stat selection timer.
   *
   * @pseudocode
   * 1. Clear the `paused` flag.
   * 2. If a timer is running, call `resume()` on it.
   */
  resumeTimer() {
    this.timer.resume();
  }

  /**
   * Compare player and computer stat values to update scores.
   *
   * @pseudocode
   * 1. If the match has already ended, return current scores and `matchEnded`.
   * 2. Stop any running timer.
   * 3. Use `compareStats` to obtain `delta` between values.
   * 4. Look up the outcome by `Math.sign(delta)` and apply its score update.
   * 5. Increment `roundsPlayed`.
   * 6. Call `#endMatchIfNeeded()` and override the round message if it returns one.
   * 7. Return the round message, `matchEnded`, and current scores.
   *
   * @param {number} playerVal - Value selected by the player.
   * @param {number} computerVal - Value selected by the computer.
   * @returns {{message: string, matchEnded: boolean, playerScore: number, computerScore: number}}
   */
  handleStatSelection(playerVal, computerVal) {
    if (this.matchEnded) {
      return {
        message: "",
        matchEnded: this.matchEnded,
        playerScore: this.playerScore,
        computerScore: this.computerScore
      };
    }
    this.stopTimer();
    const { delta } = compareStats(playerVal, computerVal);
    const outcome = DELTA_OUTCOME[Math.sign(delta)];
    outcome.update(this);
    this.roundsPlayed += 1;
    const endMsg = this.#endMatchIfNeeded();
    return {
      message: endMsg || outcome.message,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      computerScore: this.computerScore
    };
  }

  /**
   * End the current match and return the final message.
   *
   * @pseudocode
   * 1. Set `matchEnded` to true and stop any running timer.
   * 2. Return a quit message along with `playerScore` and `computerScore`.
   *
   * @returns {{message: string, playerScore: number, computerScore: number}}
   */
  quitMatch() {
    this.matchEnded = true;
    this.stopTimer();
    return {
      message: "You quit the match. You lose!",
      playerScore: this.playerScore,
      computerScore: this.computerScore
    };
  }

  getScores() {
    return { playerScore: this.playerScore, computerScore: this.computerScore };
  }

  /**
   * Get the number of rounds played so far.
   *
   * @pseudocode
   * 1. Return `roundsPlayed`.
   *
   * @returns {number}
   */
  getRoundsPlayed() {
    return this.roundsPlayed;
  }

  isMatchEnded() {
    return this.matchEnded;
  }

  getTimerState() {
    return this.timer.getState();
  }

  /**
   * Monitor the active timer for drift and invoke a callback when detected.
   *
   * @pseudocode
   * 1. Delegate to `createDriftWatcher` with the internal timer.
   * 2. Return the stopper function from the created watcher.
   *
   * @param {number} duration - Duration originally passed to the timer.
   * @param {function(number): void} onDrift - Callback invoked when drift detected.
   * @returns {function(): void} Function to stop monitoring.
   */
  watchForDrift(duration, onDrift) {
    const watch = createDriftWatcher(this.timer);
    return watch(duration, onDrift);
  }

  _resetForTest() {
    this.pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN;
    this.playerScore = 0;
    this.computerScore = 0;
    this.matchEnded = false;
    this.roundsPlayed = 0;
    this.timer = new TimerController();
  }
}
