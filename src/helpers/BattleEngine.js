/**
 * JU-DO-KON! Battle Engine
 *
 * @fileoverview Implements core game logic for scoring, round timing, match state, and stat selection timer with pause/resume and auto-selection. UI modules should access this logic through the facade in `helpers/api/battleUI.js` to keep DOM concerns separate.
 * @note This module does NOT handle card rendering, stat concealment, or animation. Stat obscuring and card transitions are managed in the UI layer (see JudokaCard, battleJudokaPage.js, and helpers/api/battleUI.js).
 */

import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { TimerController } from "./TimerController.js";
import { stop as stopScheduler } from "../utils/scheduler.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];

/**
 * Compare two stat values and report the winner.
 *
 * @pseudocode
 * 1. Compute `delta = playerVal - opponentVal`.
 * 2. If `delta > 0` winner is `"player"`.
 * 3. Else if `delta < 0` winner is `"opponent"`.
 * 4. Otherwise winner is `"tie"`.
 * 5. Return `{ delta, winner }`.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{delta: number, winner: "player"|"opponent"|"tie"}}
 */
export function compareStats(playerVal, opponentVal) {
  const delta = playerVal - opponentVal;
  let winner = "tie";
  if (delta > 0) winner = "player";
  else if (delta < 0) winner = "opponent";
  return { delta, winner };
}

/**
 * Determine the round outcome using raw stat values.
 *
 * @pseudocode
 * 1. Compute `delta = playerVal - opponentVal`.
 * 2. If `delta > 0` outcome is `"winPlayer"`.
 * 3. Else if `delta < 0` outcome is `"winOpponent"`.
 * 4. Otherwise outcome is `"draw"`.
 * 5. Return `{ delta, outcome }`.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{delta: number, outcome: "winPlayer"|"winOpponent"|"draw"}}
 */
export function determineOutcome(playerVal, opponentVal) {
  const delta = playerVal - opponentVal;
  let outcome = "draw";
  if (delta > 0) outcome = "winPlayer";
  else if (delta < 0) outcome = "winOpponent";
  return { delta, outcome };
}

const OUTCOME_MESSAGE = {
  winPlayer: "You win the round!",
  winOpponent: "Opponent wins the round!",
  draw: "Tie – no score!"
};

/**
 * Apply a round outcome to the engine scores.
 *
 * @pseudocode
 * 1. If `outcome.outcome` is `"winPlayer"`, increment `playerScore`.
 * 2. Else if `outcome.outcome` is `"winOpponent"`, increment `opponentScore`.
 * 3. Otherwise, leave scores unchanged.
 *
 * @param {BattleEngine} engine - Battle engine instance.
 * @param {{outcome: "winPlayer"|"winOpponent"|"draw"}} outcome - Outcome object.
 * @returns {void}
 */
export function applyOutcome(engine, outcome) {
  if (outcome.outcome === "winPlayer") {
    engine.playerScore += 1;
  } else if (outcome.outcome === "winOpponent") {
    engine.opponentScore += 1;
  }
}

export class BattleEngine {
  /**
   * Initializes a new instance of the BattleEngine, setting up the initial state
   * for a battle, including scores, timer, and various flags.
   *
   * @pseudocode
   * 1. Initialize `pointsToWin` to `CLASSIC_BATTLE_POINTS_TO_WIN`.
   * 2. Initialize `playerScore` and `opponentScore` to 0.
   * 3. Create a new `TimerController` instance and assign it to `timer`.
   * 4. Set `matchEnded` to `false`.
   * 5. Set `roundsPlayed` to 0.
   * 6. Set `roundInterrupted` to `false`.
   * 7. Initialize `lastInterruptReason` to an empty string.
   * 8. Initialize `lastError` to an empty string.
   * 9. Initialize `lastModification` to `null`.
   */
  constructor() {
    this.pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.timer = new TimerController();
    this.matchEnded = false;
    this.roundsPlayed = 0;
    this.roundInterrupted = false;
    this.lastInterruptReason = "";
    this.lastError = "";
    this.lastModification = null;
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

  /**
   * Stops the internal timer of the battle engine.
   *
   * @returns {void}
   * @pseudocode
   * 1. Call the `stop()` method on the `this.timer` instance.
   */
  stopTimer() {
    this.timer.stop();
  }

  #endMatchIfNeeded() {
    if (
      this.playerScore >= this.pointsToWin ||
      this.opponentScore >= this.pointsToWin ||
      this.roundsPlayed >= CLASSIC_BATTLE_MAX_ROUNDS
    ) {
      this.matchEnded = true;
      if (this.playerScore > this.opponentScore) {
        return "You win the match!";
      }
      if (this.playerScore < this.opponentScore) {
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
   * @param {function(number): void} [onDrift] - Drift handler invoked with remaining time.
   * @returns {Promise<void>} Resolves when the timer starts.
   */
  startRound(onTick, onExpired, duration, onDrift) {
    return this.timer.startRound(
      onTick,
      async () => {
        if (!this.matchEnded) await onExpired();
      },
      duration,
      onDrift
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
   * @param {function(number): void} [onDrift] - Drift handler invoked with remaining time.
   * @returns {Promise<void>} Resolves when the timer starts.
   */
  startCoolDown(onTick, onExpired, duration, onDrift) {
    return this.timer.startCoolDown(
      onTick,
      async () => {
        if (!this.matchEnded) await onExpired();
      },
      duration,
      onDrift
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
   * Compare player and opponent stat values to update scores.
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
   * @param {number} opponentVal - Value selected by the opponent.
   * @returns {{message: string, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  handleStatSelection(playerVal, opponentVal) {
    if (this.matchEnded) {
      const already = determineOutcome(playerVal, opponentVal);
      return {
        ...already,
        message: "",
        matchEnded: this.matchEnded,
        playerScore: this.playerScore,
        opponentScore: this.opponentScore
      };
    }
    this.stopTimer();
    const outcome = determineOutcome(playerVal, opponentVal);
    applyOutcome(this, outcome);
    this.roundsPlayed += 1;
    const endMsg = this.#endMatchIfNeeded();
    return {
      ...outcome,
      message: endMsg || OUTCOME_MESSAGE[outcome.outcome],
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * End the current match and return the final message.
   *
   * @pseudocode
   * 1. Set `matchEnded` to true and stop any running timer.
   * 2. Return a quit message along with `playerScore` and `opponentScore`.
   *
   * @returns {{message: string, playerScore: number, opponentScore: number}}
   */
  quitMatch() {
    this.matchEnded = true;
    this.stopTimer();
    return {
      message: "You quit the match. You lose!",
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * Interrupt the current round (admin/test/error/quit).
   *
   * @pseudocode
   * 1. Stop the timer and set a round interrupted flag.
   * 2. Optionally log or store the reason.
   * 3. Return an interrupt message and current scores.
   *
   * @param {string} [reason] - Reason for interruption.
   * @returns {{message: string, playerScore: number, opponentScore: number}}
   */
  interruptRound(reason) {
    this.stopTimer();
    this.roundInterrupted = true;
    this.lastInterruptReason = reason || "";
    return {
      message: `Round interrupted${reason ? ": " + reason : ""}`,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * Interrupt the entire match (admin/test/error/quit).
   *
   * @pseudocode
   * 1. Stop the timer and set matchEnded to true.
   * 2. Optionally log or store the reason.
   * 3. Return an interrupt message and current scores.
   *
   * @param {string} [reason] - Reason for interruption.
   * @returns {{message: string, playerScore: number, opponentScore: number}}
   */
  interruptMatch(reason) {
    this.stopTimer();
    this.matchEnded = true;
    this.lastInterruptReason = reason || "";
    return {
      message: `Match interrupted${reason ? ": " + reason : ""}`,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * Admin/test branch for modifying round state.
   *
   * @pseudocode
   * 1. Accept a modification object and apply changes to round state.
   * 2. Optionally log the modification.
   * 3. Return a modification message and current scores.
   *
   * @param {object} modification - Object describing the round modification.
   * @returns {{message: string, playerScore: number, opponentScore: number}}
   */
  roundModification(modification) {
    // Example: allow score override, round reset, etc.
    if (modification?.playerScore !== undefined) this.playerScore = modification.playerScore;
    if (modification?.opponentScore !== undefined) this.opponentScore = modification.opponentScore;
    if (modification?.roundsPlayed !== undefined) this.roundsPlayed = modification.roundsPlayed;
    if (modification?.resetRound) {
      this.stopTimer();
      this.roundInterrupted = false;
    }
    this.lastModification = modification;
    return {
      message: `Round modified${modification ? ": " + JSON.stringify(modification) : ""}`,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * Error recovery branch for match or round errors.
   *
   * @pseudocode
   * 1. Stop timer, set error flag, and log error.
   * 2. Return error message and scores.
   *
   * @param {string} errorMsg - Error message.
   * @returns {{message: string, playerScore: number, opponentScore: number}}
   */
  handleError(errorMsg) {
    this.stopTimer();
    this.lastError = errorMsg;
    return {
      message: `Error: ${errorMsg}`,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * Reset round interruption and error flags (for admin/test recovery).
   *
   * @pseudocode
   * 1. Clear interruption and error flags.
   * 2. Optionally reset timer.
   */
  resetInterrupts() {
    this.roundInterrupted = false;
    this.lastInterruptReason = "";
    this.lastError = "";
  }

  getScores() {
    return { playerScore: this.playerScore, opponentScore: this.opponentScore };
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
   * Get a snapshot of the timer state and recent transitions for test harnesses.
   *
   * @pseudocode
   * 1. Return timer state (remaining, paused, etc.) and transition log if available.
   * 2. Used by Playwright and unit tests for diagnostics.
   *
   * @returns {{timer: object, transitions?: Array<object>}}
   */
  getTimerStateSnapshot() {
    const timer = this.getTimerState();
    let transitions = [];
    const snap = getStateSnapshot();
    if (Array.isArray(snap.log)) {
      transitions = snap.log.slice();
    }
    return { timer, transitions };
  }

  /**
   * Handle tab inactivity by pausing the timer and marking state.
   *
   * @pseudocode
   * 1. Pause the timer if active.
   * 2. Set a flag to indicate tab is inactive.
   */
  handleTabInactive() {
    this.pauseTimer();
    this.tabInactive = true;
  }

  /**
   * Handle tab re-activation by resuming the timer if paused.
   *
   * @pseudocode
   * 1. Resume the timer if previously paused due to inactivity.
   * 2. Clear the tab inactive flag.
   */
  handleTabActive() {
    if (this.tabInactive) {
      this.resumeTimer();
      this.tabInactive = false;
    }
  }

  /**
   * Respond to timer drift by resetting the timer and logging the event.
   *
   * @pseudocode
   * 1. Stop the timer and optionally restart it.
   * 2. Log the drift amount for diagnostics.
   * 3. Optionally notify UI or test harness.
   *
   * @param {number} driftAmount - Amount of drift detected in seconds.
   */
  handleTimerDrift(driftAmount) {
    this.stopTimer();
    this.lastTimerDrift = driftAmount;
    // Optionally restart timer or notify UI
  }

  /**
   * Inject an error for testing error handling scenarios.
   *
   * @pseudocode
   * 1. Set error flag and log the error message.
   * 2. Optionally trigger error recovery logic.
   *
   * @param {string} errorMsg - Error message to inject.
   */
  injectError(errorMsg) {
    this.lastError = errorMsg;
    // Optionally trigger error recovery
    this.handleError(errorMsg);
  }

  _resetForTest() {
    stopScheduler();
    this.pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.matchEnded = false;
    this.roundsPlayed = 0;
    this.roundInterrupted = false;
    this.lastInterruptReason = "";
    this.lastError = "";
    this.lastModification = null;
    this.timer = new TimerController();
  }
}
