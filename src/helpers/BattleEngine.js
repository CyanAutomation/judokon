/**
 * JU-DO-KON! Battle Engine
 *
 * @fileoverview Implements core game logic for scoring, round timing, match state, and stat selection timer with pause/resume and auto-selection. UI modules should access this logic through the facade in `helpers/api/battleUI.js` to keep DOM concerns separate.
 * @note This module does NOT handle card rendering, stat concealment, or animation. Stat obscuring and card transitions are managed in the UI layer (see JudokaCard, battleJudokaPage.js, and helpers/api/battleUI.js).
 */

import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { TimerController } from "./TimerController.js";
import { stop as stopScheduler } from "../utils/scheduler.js";
import { SimpleEmitter } from "./events/SimpleEmitter.js";
import {
  startRoundTimer,
  startCoolDownTimer,
  pauseTimer as enginePauseTimer,
  resumeTimer as engineResumeTimer,
  stopTimer as engineStopTimer,
  handleTabInactive as engineHandleTabInactive,
  handleTabActive as engineHandleTabActive,
  handleTimerDrift as engineHandleTimerDrift
} from "./battle/engineTimer.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];

export const OUTCOME = {
  WIN_PLAYER: "winPlayer",
  WIN_OPPONENT: "winOpponent",
  DRAW: "draw",
  MATCH_WIN_PLAYER: "matchWinPlayer",
  MATCH_WIN_OPPONENT: "matchWinOpponent",
  MATCH_DRAW: "matchDraw",
  QUIT: "quit",
  INTERRUPT_ROUND: "interruptRound",
  INTERRUPT_MATCH: "interruptMatch",
  ROUND_MODIFIED: "roundModified",
  ERROR: "error"
};

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
 * 2. If `delta > 0` outcome is `OUTCOME.WIN_PLAYER`.
 * 3. Else if `delta < 0` outcome is `OUTCOME.WIN_OPPONENT`.
 * 4. Otherwise outcome is `OUTCOME.DRAW`.
 * 5. Return `{ delta, outcome }`.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{delta: number, outcome: keyof typeof OUTCOME}}
 */
export function determineOutcome(playerVal, opponentVal) {
  const delta = playerVal - opponentVal;
  let outcome = OUTCOME.DRAW;
  if (delta > 0) outcome = OUTCOME.WIN_PLAYER;
  else if (delta < 0) outcome = OUTCOME.WIN_OPPONENT;
  return { delta, outcome };
}

/**
 * Apply a round outcome to the engine scores.
 *
 * @pseudocode
 * 1. If `outcome.outcome` is `OUTCOME.WIN_PLAYER`, increment `playerScore`.
 * 2. Else if `outcome.outcome` is `OUTCOME.WIN_OPPONENT`, increment `opponentScore`.
 * 3. Otherwise, leave scores unchanged.
 *
 * @param {BattleEngine} engine - Battle engine instance.
 * @param {{outcome: keyof typeof OUTCOME}} outcome - Outcome object.
 * @returns {void}
 */
export function applyOutcome(engine, outcome) {
  if (outcome.outcome === OUTCOME.WIN_PLAYER) {
    engine.playerScore += 1;
  } else if (outcome.outcome === OUTCOME.WIN_OPPONENT) {
    engine.opponentScore += 1;
  }
}

export class BattleEngine {
  /**
   * Initializes a new instance of the BattleEngine.
   *
   * @pseudocode
   * 1. Normalize configuration values.
   * 2. Bind the event emitter.
   *
   * @param {object} [config]
   */
  constructor(config = {}) {
    const emitter = this.#initFromConfig(config);
    this.#bindEmitter(emitter);
  }

  #initFromConfig(config) {
    const {
      pointsToWin = CLASSIC_BATTLE_POINTS_TO_WIN,
      maxRounds = CLASSIC_BATTLE_MAX_ROUNDS,
      stats = STATS,
      debugHooks = {},
      emitter = null,
      seed = undefined
    } = config;
    this.pointsToWin = pointsToWin;
    this.maxRounds = maxRounds;
    this.stats = stats;
    this.debugHooks = debugHooks;
    this.seed = typeof seed === "number" ? seed : undefined;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.timer = new TimerController();
    this.matchEnded = false;
    this.roundsPlayed = 0;
    this.roundInterrupted = false;
    this.lastInterruptReason = "";
    this.lastError = "";
    this.lastModification = null;
    this._initialConfig = { pointsToWin, maxRounds, stats, debugHooks, seed: this.seed };
    return emitter || new SimpleEmitter();
  }

  #bindEmitter(emitter) {
    this.emitter = emitter;
    this.on = this.emitter.on.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);
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
    engineStopTimer(this);
  }

  #endMatchIfNeeded() {
    if (
      this.playerScore >= this.pointsToWin ||
      this.opponentScore >= this.pointsToWin ||
      this.roundsPlayed >= this.maxRounds
    ) {
      this.matchEnded = true;
      if (this.playerScore > this.opponentScore) {
        return OUTCOME.MATCH_WIN_PLAYER;
      }
      if (this.playerScore < this.opponentScore) {
        return OUTCOME.MATCH_WIN_OPPONENT;
      }
      return OUTCOME.MATCH_DRAW;
    }
    return null;
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
    return startRoundTimer(this, onTick, onExpired, duration, onDrift);
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
    return startCoolDownTimer(this, onTick, onExpired, duration, onDrift);
  }

  /**
   * Pause the round/stat selection timer.
   *
   * @pseudocode
   * 1. Set the `paused` flag to true.
   * 2. If a timer is running, call `pause()` on it.
   */
  pauseTimer() {
    enginePauseTimer(this);
  }

  /**
   * Resume the round/stat selection timer.
   *
   * @pseudocode
   * 1. Clear the `paused` flag.
   * 2. If a timer is running, call `resume()` on it.
   */
  resumeTimer() {
    engineResumeTimer(this);
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
   * 6. Call `#endMatchIfNeeded()` and override the round outcome if it returns one.
   * 7. Return the outcome code, `matchEnded`, and current scores.
   *
   * @param {number} playerVal - Value selected by the player.
   * @param {number} opponentVal - Value selected by the opponent.
   * @returns {{delta: number, outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  handleStatSelection(playerVal, opponentVal) {
    if (this.matchEnded) {
      return this.#resultWhenMatchEnded(playerVal, opponentVal);
    }
    this.stopTimer();
    const outcome = determineOutcome(playerVal, opponentVal);
    applyOutcome(this, outcome);
    this.roundsPlayed += 1;
    return this.#finalizeRound(outcome);
  }

  #resultWhenMatchEnded(playerVal, opponentVal) {
    const already = determineOutcome(playerVal, opponentVal);
    return {
      ...already,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  #finalizeRound(outcome) {
    const matchOutcome = this.#endMatchIfNeeded();
    const result = {
      ...outcome,
      outcome: matchOutcome || outcome.outcome,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
    this.emit("roundEnded", result);
    if (this.matchEnded) this.emit("matchEnded", result);
    return result;
  }

  /**
   * End the current match and return a quit outcome.
   *
   * @pseudocode
   * 1. Set `matchEnded` to true and stop any running timer.
   * 2. Return a quit outcome along with `playerScore` and `opponentScore`.
   *
   * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  quitMatch() {
    this.matchEnded = true;
    this.stopTimer();
    const result = {
      outcome: OUTCOME.QUIT,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
    this.emit("matchEnded", result);
    return result;
  }

  /**
   * Interrupt the current round (admin/test/error/quit).
   *
   * @pseudocode
   * 1. Stop the timer and set a round interrupted flag.
   * 2. Optionally log or store the reason.
   * 3. Return an interrupt outcome and current scores.
   *
   * @param {string} [reason] - Reason for interruption.
   * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  interruptRound(reason) {
    this.stopTimer();
    this.roundInterrupted = true;
    this.lastInterruptReason = reason || "";
    return {
      outcome: OUTCOME.INTERRUPT_ROUND,
      matchEnded: this.matchEnded,
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
   * 3. Return an interrupt outcome and current scores.
   *
   * @param {string} [reason] - Reason for interruption.
   * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  interruptMatch(reason) {
    this.stopTimer();
    this.matchEnded = true;
    this.lastInterruptReason = reason || "";
    const result = {
      outcome: OUTCOME.INTERRUPT_MATCH,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
    this.emit("matchEnded", result);
    return result;
  }

  /**
   * Admin/test branch for modifying round state.
   *
   * @pseudocode
   * 1. Accept a modification object and apply changes to round state.
   * 2. Optionally log the modification.
   * 3. Return a modification outcome and current scores.
   *
   * @param {object} modification - Object describing the round modification.
   * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
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
      outcome: OUTCOME.ROUND_MODIFIED,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  /**
   * Error recovery branch for match or round errors.
   *
   * @pseudocode
   * 1. Stop timer, set error flag, and log error.
   * 2. Return an error outcome and scores.
   *
   * @param {string} errorMsg - Error message.
   * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  handleError(errorMsg) {
    this.stopTimer();
    this.lastError = errorMsg;
    const result = {
      outcome: OUTCOME.ERROR,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
    this.emit("error", { message: errorMsg });
    return result;
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

  /**
   * Return true if either side is at match point.
   *
   * @pseudocode
   * 1. Compute `needed = pointsToWin - 1`.
   * 2. Return true when `playerScore === needed || opponentScore === needed`.
   *
   * @returns {boolean}
   */
  isMatchPoint() {
    const needed = Math.max(0, Number(this.pointsToWin) - 1);
    return this.playerScore === needed || this.opponentScore === needed;
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
    const snap = this.debugHooks?.getStateSnapshot?.();
    if (Array.isArray(snap?.log)) {
      transitions = snap.log.slice();
    }
    return { timer, transitions };
  }

  /**
   * Get the deterministic seed associated with this engine instance, if any.
   *
   * @pseudocode
   * 1. Return the stored numeric `seed` or `undefined` when not configured.
   *
   * @returns {number|undefined}
   */
  getSeed() {
    return this.seed;
  }

  /**
   * Handle tab inactivity by pausing the timer and marking state.
   *
   * @pseudocode
   * 1. Pause the timer if active.
   * 2. Set a flag to indicate tab is inactive.
   */
  handleTabInactive() {
    engineHandleTabInactive(this);
  }

  /**
   * Handle tab re-activation by resuming the timer if paused.
   *
   * @pseudocode
   * 1. Resume the timer if previously paused due to inactivity.
   * 2. Clear the tab inactive flag.
   */
  handleTabActive() {
    engineHandleTabActive(this);
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
    engineHandleTimerDrift(this, driftAmount);
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
    const { pointsToWin, maxRounds, stats, debugHooks, seed } = this._initialConfig;
    this.pointsToWin = pointsToWin;
    this.maxRounds = maxRounds;
    this.stats = stats;
    this.debugHooks = debugHooks;
    this.seed = seed;
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
