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
   * 1. If the match has already ended, return `matchEnded`, `playerScore`, and `computerScore` with an empty message.
   * 2. Stop any running timer.
   * 3. Compare `playerVal` and `computerVal`:
   *    a. If `playerVal > computerVal`, increment `playerScore` and set win message.
   *    b. If `playerVal < computerVal`, increment `computerScore` and set loss message.
   *    c. Otherwise, set tie message without changing scores.
   * 4. Increment the `roundsPlayed` counter.
   * 5. Call `#endMatchIfNeeded()` to update `matchEnded` and get an end-of-match message.
   *    - If it returns a non-empty message, override the round message.
   * 6. Return the message, updated `matchEnded`, and current scores.
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
    if (playerVal > computerVal) {
      this.playerScore += 1;
      this.roundsPlayed += 1;
      const endMsg = this.#endMatchIfNeeded();
      return {
        message: endMsg || "You win the round!",
        matchEnded: this.matchEnded,
        playerScore: this.playerScore,
        computerScore: this.computerScore
      };
    }
    if (playerVal < computerVal) {
      this.computerScore += 1;
      this.roundsPlayed += 1;
      const endMsg = this.#endMatchIfNeeded();
      return {
        message: endMsg || "Opponent wins the round!",
        matchEnded: this.matchEnded,
        playerScore: this.playerScore,
        computerScore: this.computerScore
      };
    }
    this.roundsPlayed += 1;
    const endMsg = this.#endMatchIfNeeded();
    return {
      message: endMsg || "Tie – no score!",
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
   * 1. Record the current timestamp as `start`.
   * 2. Every second:
   *    a. If the `TimerController` has no active timer, stop monitoring.
   *    b. Compute `elapsed = floor((Date.now() - start) / 1000)` and `expected = duration - elapsed`.
   *    c. Skip drift checks when the timer is paused.
   *    d. If `remaining - expected` > `DRIFT_THRESHOLD`:
   *       i. The timer is behind schedule; clear the monitoring interval.
   *       ii. If `onDrift` is a function, invoke it with current remaining time.
   * 3. Return a function that clears the monitoring interval to stop drift detection.
   *
   * @param {number} duration - Duration originally passed to the timer.
   * @param {function(number): void} onDrift - Callback invoked when drift detected.
   * @returns {function(): void} Function to stop monitoring.
   */
  watchForDrift(duration, onDrift) {
    const start = Date.now();
    const interval = setInterval(() => {
      if (!this.timer.hasActiveTimer()) {
        clearInterval(interval);
        return;
      }
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const expected = duration - elapsed;
      const { remaining, paused } = this.timer.getState();
      if (paused) return;
      if (remaining - expected > DRIFT_THRESHOLD) {
        clearInterval(interval);
        if (typeof onDrift === "function") onDrift(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
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
