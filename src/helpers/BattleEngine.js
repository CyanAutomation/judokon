/**
 * JU-DO-KON! Battle Engine
 *
 * @fileoverview Implements core game logic for scoring, round timing, match state, and stat selection timer with pause/resume and auto-selection. UI modules should access this logic through the facade in `helpers/api/battleUI.js` to keep DOM concerns separate.
 * @note This module does NOT handle card rendering, stat concealment, or animation. Stat obscuring and card transitions are managed in the UI layer (see JudokaCard, battleJudokaPage.js, and helpers/api/battleUI.js).
 * @see {@link ../../design/productRequirementsDocuments/prdBattleEngine.md#state-diagram|State Machine Diagram} for the complete state flow diagram (init → prestart → selection → evaluation → cooldown → end)
 * @see {@link ../../design/productRequirementsDocuments/prdStateHandler.md|State Handler PRD} for canonical state definitions, transitions, timeouts, and test hooks
 */

import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { TimerController } from "./TimerController.js";
import { setTestMode } from "./testModeUtils.js";
import { stop as stopScheduler } from "../utils/scheduler.js";
import { SimpleEmitter } from "./events/SimpleEmitter.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";
import logger from "./logger.js";
import {
  startRoundTimer,
  startCoolDownTimer,
  pauseTimer as enginePauseTimer,
  resumeTimer as engineResumeTimer,
  stopTimer as engineStopTimer,
  handleTabInactive as engineHandleTabInactive,
  handleTabActive as engineHandleTabActive
} from "./battle/engineTimer.js";

export const STATS = ["power", "speed", "technique", "kumikata", "newaza"];

export const TIMER_CATEGORY = {
  ROUND: "roundTimer",
  COOLDOWN: "coolDownTimer"
};

/**
 * Battle Engine event payload version.
 * Increment when event payload structures change to maintain compatibility.
 */
export const ENGINE_VERSION = "1.0.0";

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

const MATCH_POINT_OFFSET = 1;
const ALLOWED_MODIFICATIONS = ["playerScore", "opponentScore", "roundsPlayed", "resetRound"];

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
 * 1. If `outcome.outcome` is `OUTCOME.WIN_PLAYER`, increment `playerScore` via method.
 * 2. Else if `outcome.outcome` is `OUTCOME.WIN_OPPONENT`, increment `opponentScore` via method.
 * 3. Otherwise, leave scores unchanged.
 *
 * @param {BattleEngine} engine - Battle engine instance.
 * @param {{outcome: keyof typeof OUTCOME}} outcome - Outcome object.
 * @returns {void}
 */
export function applyOutcome(engine, outcome) {
  if (outcome.outcome === OUTCOME.WIN_PLAYER) {
    engine.incrementPlayerScore();
  } else if (outcome.outcome === OUTCOME.WIN_OPPONENT) {
    engine.incrementOpponentScore();
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
    this._currentStats = Object.freeze({});
    this._initialConfig = { pointsToWin, maxRounds, stats, debugHooks, seed: this.seed };
    return emitter || new SimpleEmitter();
  }

  #bindEmitter(emitter) {
    this.emitter = emitter;
    this.on = this.emitter.on.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);
  }

  #safeLog(method, data) {
    if (!logger?.debug) return;
    try {
      logger.debug(method, data);
    } catch {}
  }

  #safeEmit(eventName, payload) {
    try {
      this.emit(eventName, payload);
    } catch (error) {
      try {
        this.#safeLog(`Failed to emit ${eventName}`, error);
      } catch {}
    }
  }

  /**
   * Increment player score by one.
   *
   * @pseudocode
   * 1. Add 1 to `playerScore`.
   *
   * @returns {void}
   */
  incrementPlayerScore() {
    this.playerScore += 1;
  }

  /**
   * Increment opponent score by one.
   *
   * @pseudocode
   * 1. Add 1 to `opponentScore`.
   *
   * @returns {void}
   */
  incrementOpponentScore() {
    this.opponentScore += 1;
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
   *
   * @note Delegates to engineTimer module to maintain separation of concerns.
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
   *
   * @note Delegates to engineTimer module to maintain separation of concerns.
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
   * @param {object} [stats] - Optional stat snapshot to refresh emitted payloads.
   * @returns {{delta: number, outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  handleStatSelection(playerVal, opponentVal, stats) {
    this.#safeLog("BattleEngine.handleStatSelection", { playerVal, opponentVal });
    if (this.matchEnded) {
      return this.#resultWhenMatchEnded(playerVal, opponentVal);
    }
    this.stopTimer();
    const outcome = determineOutcome(playerVal, opponentVal);
    this.#safeLog("BattleEngine.determineOutcome", outcome);
    applyOutcome(this, outcome);
    this.#refreshCurrentStats(stats);
    // Notify listeners that stats-related values used for UI may need refresh.
    this.#safeEmit("statsUpdated", {
      stats: undefined, // UI may query snapshots; payload optional by design
      _version: ENGINE_VERSION
    });
    this.#safeLog("BattleEngine.applyOutcome.scores", {
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    });
    this.roundsPlayed += 1;
    return this.#finalizeRound(outcome);
  }

  #resultWhenMatchEnded(playerVal, opponentVal) {
    // Note: We recompute outcome here for consistency with happy path,
    // even though the match has already ended. The outcome won't affect scoring.
    const already = determineOutcome(playerVal, opponentVal);
    return {
      ...already,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
  }

  #finalizeRound(outcome) {
    this.#safeLog("BattleEngine.finalizeRound.in", outcome);
    const matchOutcome = this.#endMatchIfNeeded();
    const result = {
      ...outcome,
      outcome: matchOutcome || outcome.outcome,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      _version: ENGINE_VERSION
    };
    this.#safeLog("BattleEngine.finalizeRound.out", result);
    this.#safeEmit("roundEnded", result);
    // matchEnded event only emitted when match actually ends (not on every round)
    if (this.matchEnded) this.#safeEmit("matchEnded", result);
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
      opponentScore: this.opponentScore,
      _version: ENGINE_VERSION
    };
    this.#safeEmit("matchEnded", result);
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
      opponentScore: this.opponentScore,
      _version: ENGINE_VERSION
    };
    this.#safeEmit("matchEnded", result);
    return result;
  }

  /**
   * Admin/test branch for modifying round state.
   *
   * @pseudocode
   * 1. Accept a modification object and validate keys against allowed modifications.
   * 2. Apply changes to round state only for recognized keys.
   * 3. Optionally log the modification.
   * 4. Return a modification outcome and current scores.
   *
   * @param {object} modification - Object describing the round modification.
   * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
   */
  roundModification(modification) {
    if (!modification || typeof modification !== "object") {
      this.lastError = "Invalid modification: expected object";
      return this.handleError(this.lastError);
    }

    // Warn about unrecognized keys
    for (const key of Object.keys(modification)) {
      if (!ALLOWED_MODIFICATIONS.includes(key)) {
        console.warn(`Unrecognized modification key: ${key}`);
      }
    }

    // Example: allow score override, round reset, etc.
    if (modification?.playerScore !== undefined) this.playerScore = modification.playerScore;
    if (modification?.opponentScore !== undefined) this.opponentScore = modification.opponentScore;
    if (modification?.roundsPlayed !== undefined) this.roundsPlayed = modification.roundsPlayed;
    if (modification?.resetRound) {
      this.stopTimer();
      this.roundInterrupted = false;
    }
    this.lastModification = modification;
    const result = {
      outcome: OUTCOME.ROUND_MODIFIED,
      matchEnded: this.matchEnded,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore
    };
    this.#refreshCurrentStats(modification?.stats);
    this.#safeEmit("statsUpdated", { stats: undefined, _version: ENGINE_VERSION });
    return result;
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
    this.#safeEmit("error", { message: errorMsg, _version: ENGINE_VERSION });
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

  /**
   * Get the current scores.
   *
   * @pseudocode
   * 1. Return current player and opponent scores.
   *
   * @returns {{playerScore: number, opponentScore: number}}
   */
  getScores() {
    return { playerScore: this.playerScore, opponentScore: this.opponentScore };
  }

  /**
   * Check if the match has ended.
   *
   * @pseudocode
   * 1. Return the `matchEnded` flag.
   *
   * @returns {boolean}
   */
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
    const needed = Math.max(0, Number(this.pointsToWin) - MATCH_POINT_OFFSET);
    return this.playerScore === needed || this.opponentScore === needed;
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

  /**
   * Get the timer state.
   *
   * @pseudocode
   * 1. Return the current timer state from the TimerController.
   *
   * @returns {object}
   */
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
    const transitions = this.debugHooks?.getStateSnapshot?.()?.log ?? [];
    return { timer, transitions: Array.isArray(transitions) ? transitions : [] };
  }

  #refreshCurrentStats(stats) {
    const shouldRefresh = stats && typeof stats === "object" && !Array.isArray(stats);

    this._currentStats = Object.freeze(shouldRefresh ? { ...stats } : {});
  }

  /**
   * Return the latest stat snapshot tracked by the engine.
   *
   * @returns {Readonly<object>}
   */
  getCurrentStats() {
    return this._currentStats;
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

  #getTimerRestarter(category) {
    return category === TIMER_CATEGORY.COOLDOWN
      ? this.timer.startCoolDown.bind(this.timer)
      : this.timer.startRound.bind(this.timer);
  }

  /**
   * Respond to timer drift by resetting the timer and logging the event.
   *
   * @pseudocode
   * 1. Determine whether a timer is active; if not, record drift and exit.
   * 2. Stop the timer and optionally restart it.
   * 3. Log the drift amount for diagnostics.
   * 4. Optionally notify UI or test harness.
   *
   * @param {number} remainingTime - Amount of drift detected in seconds.
   */
  handleTimerDrift(remainingTime) {
    const category =
      typeof this.timer.getActiveCategory === "function" ? this.timer.getActiveCategory() : null;
    const hasActiveTimer =
      typeof this.timer.hasActiveTimer === "function"
        ? this.timer.hasActiveTimer()
        : Boolean(category);

    if (!hasActiveTimer) {
      this.lastTimerDrift = remainingTime;
      return;
    }
    const onTick = this.timer.onTickCb;
    const onExpired = this.timer.onExpiredCb;
    this.stopTimer();
    this.lastTimerDrift = remainingTime;

    const restart = this.#getTimerRestarter(category);
    restart(onTick, onExpired, remainingTime, (r) => this.handleTimerDrift(r));
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
    this._currentStats = Object.freeze({});
    this.timer = new TimerController();
  }
}

/**
 * @typedef {object} IBattleEngine
 * @property {(value:number) => void} setPointsToWin
 * @property {() => number} getPointsToWin
 * @property {() => void} stopTimer
 * @property {(...args:any[]) => Promise<void>} startRound
 * @property {(...args:any[]) => Promise<void>} startCoolDown
 * @property {() => void} pauseTimer
 * @property {() => void} resumeTimer
 * @property {(...args:any[]) => {delta:number, outcome:keyof typeof OUTCOME, matchEnded:boolean, playerScore:number, opponentScore:number}} handleStatSelection
 * @property {() => {outcome:keyof typeof OUTCOME, matchEnded:boolean, playerScore:number, opponentScore:number}} quitMatch
 * @property {(reason?:string) => {outcome:keyof typeof OUTCOME, matchEnded:boolean, playerScore:number, opponentScore:number}} interruptMatch
 * @property {() => object} getScores
 * @property {() => number} getRoundsPlayed
 * @property {() => boolean} isMatchEnded
 * @property {() => object} getTimerState
 */

/**
 * Internal reference to the active BattleEngine instance.
 *
 * @summary Holds the engine instance created by `createBattleEngine()` so
 * thin wrapper helpers can delegate to it.
 * @pseudocode
 * 1. Initially undefined until `createBattleEngine()` constructs an engine.
 * 2. Wrappers call `requireEngine()` which throws if this value is unset.
 * @type {IBattleEngine|undefined}
 */
let battleEngine = null;

// Use a WeakMap to store battle engines per window to avoid sharing across pages.
//
// **Design Rationale:**
// - Isolates engines in multi-window environments (e.g., Playwright tests with context switching).
// - WeakMap keys are garbage-collected when windows are closed, preventing memory leaks.
// - Circular reference safety: WeakMap does not prevent GC even if the window holds a reference
//   to data that references the engine. This is safe because we intentionally keep engines
//   alive via explicit `createBattleEngine()` calls; the WeakMap cleanup is secondary.
//
// **Fallback for Node.js:**
// - The module-level `battleEngine` variable provides fallback storage when `window` is unavailable.
// - This enables both browser and server-side testing without conditional imports.
// - Trade-off: In Node.js, only one engine per process; multi-window benefit is browser-only.
//
const battleEngines = new WeakMap();

/** @type {Set<(engine: IBattleEngine|null) => void>} */
const engineCreatedListeners = new Set();

/**
 * Get the current engine instance from either window-isolated storage or module fallback.
 *
 * @returns {IBattleEngine|null}
 */
function getCurrentEngine() {
  if (typeof window !== "undefined") {
    return battleEngines.get(window) ?? null;
  }
  return battleEngine;
}

function shouldLogEngineListenerErrors() {
  return (
    (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") ||
    (typeof window !== "undefined" && window.__TEST__)
  );
}

function invokeEngineCreatedListener(listener, engine) {
  try {
    listener(engine);
  } catch (error) {
    if (shouldLogEngineListenerErrors()) {
      console.warn("Engine creation listener failed:", error);
      // In test environments, rethrow to catch listener bugs early
      if (isTestEnvironment()) {
        throw error;
      }
    }
  }
}

function notifyEngineCreated(engine) {
  if (engineCreatedListeners.size === 0) return;

  for (const listener of engineCreatedListeners) {
    invokeEngineCreatedListener(listener, engine);
  }
}

/**
 * Register a callback invoked whenever a battle engine instance is created.
 *
 * @pseudocode
 * 1. Ignore registrations when `listener` is not a function.
 * 2. Add the listener to an internal `Set`.
 * 3. Return an unsubscribe function that removes the listener.
 *
 * @param {(engine: IBattleEngine|null) => void} listener
 * @returns {() => void} Unsubscribe handle.
 */
export function onEngineCreated(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  engineCreatedListeners.add(listener);
  const currentEngine = getCurrentEngine();
  if (currentEngine) {
    invokeEngineCreatedListener(listener, currentEngine);
  }
  return () => {
    engineCreatedListeners.delete(listener);
  };
}

/**
 * Internal guard that returns the active engine or throws if none exists.
 *
 * @summary Ensures the engine has been created before helper functions delegate to it.
 * @pseudocode
 * 1. If the current engine is undefined, throw an Error instructing callers to initialize it.
 * 2. Otherwise, return the engine instance.
 *
 * @throws {Error} When no engine has been created.
 * @returns {IBattleEngine}
 */
export function requireEngine() {
  const engine = getCurrentEngine();
  if (!engine) {
    // Provide a clear error for consumers that call helpers before
    // initialization.
    throw new Error("Battle engine not initialized. Call createBattleEngine() first.");
  }
  return engine;
}

/**
 * Detect if code is running in a test environment.
 *
 * @returns {boolean}
 */
function isTestEnvironment() {
  const isWindowTest =
    typeof window !== "undefined" && (window.__TEST__ || window.__ENGINE_CONFIG?.forceCreate);
  const isNodeTest =
    typeof window === "undefined" &&
    typeof process !== "undefined" &&
    Boolean(
      process?.env?.VITEST ||
        process?.env?.NODE_ENV === "test" ||
        process?.env?.JEST_WORKER_ID ||
        process?.env?.BABEL_ENV === "test"
    );
  return isWindowTest || isNodeTest;
}

/**
 * Attempt to reset an engine via its internal _resetForTest method.
 *
 * @param {IBattleEngine|null} engine
 * @returns {IBattleEngine|null} The reset engine, or null if reset failed.
 */
function attemptInternalReset(engine) {
  if (engine && typeof engine._resetForTest === "function") {
    try {
      engine._resetForTest();
      return engine;
    } catch (error) {
      logger.warn("Engine _resetForTest failed:", error);
      return null;
    }
  }
  return null;
}

/**
 * Create a new battle engine instance.
 *
 * @summary Factory returning a fresh `BattleEngine` instance.
 *
 * @description
 * In browser environments, each window/frame gets its own isolated engine instance via WeakMap.
 * This prevents cross-window state sharing (e.g., in Playwright tests with multiple contexts).
 * In Node.js, uses a module-level variable; only one engine per process.
 *
 * @pseudocode
 * 1. Check if an engine already exists and reuse it if forceCreate is not set.
 * 2. Construct a new `BattleEngine` with default classic config merged with `config`.
 * 3. Store the instance in window-isolated (WeakMap) or module-level (Node.js) storage.
 * 4. Apply seed configuration if provided.
 * 5. Notify listeners that engine was created.
 * 6. Return the new instance.
 *
 * @param {object} [config]
 * @returns {IBattleEngine}
 */
export function createBattleEngine(config = {}) {
  logger.log("BattleEngine: createBattleEngine called with config:", config);
  const forceCreate = config.forceCreate || isTestEnvironment();
  const currentEngine = getCurrentEngine();

  if (currentEngine && !forceCreate) {
    logger.log("BattleEngine: returning existing engine instance");
    notifyEngineCreated(currentEngine);
    return currentEngine;
  }

  battleEngine = new BattleEngine({
    pointsToWin: CLASSIC_BATTLE_POINTS_TO_WIN,
    maxRounds: CLASSIC_BATTLE_MAX_ROUNDS,
    stats: STATS,
    debugHooks: { getStateSnapshot },
    ...config
  });
  if (typeof window !== "undefined") {
    battleEngines.set(window, battleEngine);
  }
  logger.log("BattleEngine: battleEngine set to", battleEngine);
  try {
    if (typeof config?.seed === "number") {
      setTestMode({ enabled: true, seed: Number(config.seed) });
    }
  } catch (error) {
    logger.warn("Failed to set test mode seed:", error);
  }
  notifyEngineCreated(battleEngine);
  return battleEngine;
}

/**
 * Reset the battle engine to a fresh instance while preserving configuration overrides.
 *
 * @summary Rebuilds the engine so match state (scores, rounds, flags) returns
 * to defaults while optionally reapplying configuration tweaks such as `pointsToWin`.
 *
 * @pseudocode
 * 1. Attempt to capture the current `pointsToWin` value when an engine exists.
 * 2. Try to reset the existing engine via `_resetForTest()` method.
 * 3. If that fails, create a fresh engine via `createBattleEngine({ forceCreate: true })`.
 * 4. Reapply captured and provided config overrides on the engine before returning.
 *
 * @param {object} [preserveConfig] - Additional config values to preserve (e.g., { pointsToWin: 2 })
 * @returns {IBattleEngine} Refreshed engine instance.
 */
export function resetBattleEnginePreservingConfig(preserveConfig = {}) {
  let config = { ...preserveConfig };
  let existingEngine = null;

  try {
    existingEngine = requireEngine();
    // Preserve pointsToWin unless explicitly overridden
    if (!("pointsToWin" in preserveConfig) && typeof existingEngine.getPointsToWin === "function") {
      const candidate = Number(existingEngine.getPointsToWin());
      if (Number.isFinite(candidate)) {
        config.pointsToWin = candidate;
      }
    }
  } catch {
    existingEngine = null;
  }

  let engine = attemptInternalReset(existingEngine);
  if (!engine) {
    engine = createBattleEngine({ forceCreate: true });
  }

  // Update module-level reference to ensure all subsequent calls get the reset engine
  battleEngine = engine;
  if (typeof window !== "undefined") {
    battleEngines.set(window, engine);
  }

  // Reapply any configuration overrides
  if (typeof config.pointsToWin === "number" && Number.isFinite(config.pointsToWin)) {
    try {
      engine?.setPointsToWin?.(config.pointsToWin);
    } catch (error) {
      // Ignore failures so replay flow can proceed with default thresholds.
      logger.warn("Failed to restore pointsToWin after reset:", error);
    }
  }

  return engine;
}

/**
 * Set the number of points required to win a match.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.setPointsToWin(value)`.
 *
 * @param {number} value
 * @returns {void}
 */
export const setPointsToWin = (value) => requireEngine().setPointsToWin(value);

/**
 * Get the current points required to win a match.
 *
 * @pseudocode
 * 1. Return `battleEngine.getPointsToWin()` result.
 *
 * @returns {number}
 */
export const getPointsToWin = () => requireEngine().getPointsToWin();

/**
 * Stop any active battle timer.
 *
 * @pseudocode
 * 1. Call `battleEngine.stopTimer()` to cancel ticks and callbacks.
 *
 * @returns {void}
 */
export const stopTimer = () => requireEngine().stopTimer();

/**
 * Start a new round via the underlying battle engine.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.startRound(...args)`.
 *
 * @param {...any} args
 * @returns {Promise<void>}
 */
export const startRound = (...args) => requireEngine().startRound(...args);

/**
 * Start the engine cooldown sequence.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.startCoolDown(...args)`.
 *
 * @param {...any} args
 * @returns {Promise<void>}
 */
export const startCoolDown = (...args) => requireEngine().startCoolDown(...args);

/**
 * Pause the current round timer.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.pauseTimer()` which saves remaining time and cancels ticks.
 *
 * @returns {void}
 */
export const pauseTimer = () => requireEngine().pauseTimer();

/**
 * Resume a previously paused round timer.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.resumeTimer()` which restores remaining time and restarts ticks.
 *
 * @returns {void}
 */
export const resumeTimer = () => requireEngine().resumeTimer();

/**
 * Forward stat selection to the engine which computes outcome and updates scores.
 *
 * @pseudocode
 * 1. Call `battleEngine.handleStatSelection(...args)` and return its result.
 *
 * @param {...any} args
 * @returns {{delta: number, outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
 */
export const handleStatSelection = (...args) => {
  logger.log("BattleEngine: handleStatSelection called with args:", args);
  return requireEngine().handleStatSelection(...args);
};

/**
 * Quit the current match via the engine.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.quitMatch()`.
 *
 * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
 */
export const quitMatch = () => requireEngine().quitMatch();

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
export const interruptMatch = (reason) => requireEngine().interruptMatch(reason);

/**
 * Retrieve the current scores from the engine.
 *
 * @pseudocode
 * 1. Get engine via requireEngine().
 * 2. Call getScores() and return a frozen copy to prevent external mutation.
 *
 * @returns {object}
 */
export const getScores = () => {
  const engine = requireEngine();
  return Object.freeze({ ...engine.getScores() });
};

/**
 * Get a shallow, immutable snapshot of current stat values.
 *
 * @pseudocode
 * 1. Get the engine via requireEngine().
 * 2. Call getCurrentStats() and return a frozen copy.
 *
 * @returns {Readonly<object>} Frozen snapshot object.
 */
export const getCurrentStats = () => {
  const engine = requireEngine();
  if (typeof engine.getCurrentStats !== "function") {
    return Object.freeze({});
  }
  return Object.freeze({ ...engine.getCurrentStats() });
};

/**
 * Retrieve how many rounds have been played.
 *
 * @pseudocode
 * 1. Get the engine via requireEngine().
 * 2. Call getRoundsPlayed() and ensure return value is numeric.
 *
 * @returns {number}
 */
export const getRoundsPlayed = () => {
  const engine = requireEngine();
  const count = engine.getRoundsPlayed();
  return typeof count === "number" ? count : 0;
};

/**
 * Query whether the match has ended.
 *
 * @pseudocode
 * 1. Get engine via requireEngine().
 * 2. Call isMatchEnded() and ensure return value is boolean.
 *
 * @returns {boolean}
 */
export const isMatchEnded = () => {
  const engine = requireEngine();
  return Boolean(engine.isMatchEnded());
};

/**
 * Get timer state (remaining, running, paused) from the engine.
 *
 * @pseudocode
 * 1. Get engine via requireEngine().
 * 2. Call getTimerState() and return a frozen copy to prevent external mutation.
 *
 * @returns {object}
 */
export const getTimerState = () => {
  const engine = requireEngine();
  return Object.freeze({ ...engine.getTimerState() });
};

/**
 * Subscribe to battle engine events.
 *
 * @pseudocode
 * 1. Ensure an engine exists via `requireEngine()`.
 * 2. Delegate to `battleEngine.on(type, handler)`.
 *
 * @param {string} type - Event name.
 * @param {(payload: any) => void} handler - Callback for the event.
 * @returns {void}
 */
export const on = (type, handler) => requireEngine().on(type, handler);

/**
 * Unsubscribe from battle engine events.
 *
 * @pseudocode
 * 1. Ensure an engine exists via `requireEngine()`.
 * 2. Delegate to `battleEngine.off(type, handler)`.
 *
 * @param {string} type - Event name.
 * @param {(payload: any) => void} handler - Callback for the event.
 * @returns {void}
 */
export const off = (type, handler) => requireEngine().off(type, handler);

/**
 * Get the active battle engine instance.
 *
 * @pseudocode
 * 1. Call requireEngine() to get the active engine.
 * 2. Return the engine instance.
 *
 * @returns {IBattleEngine} The active battle engine instance.
 * @throws {Error} When no engine has been created.
 */
export const getEngine = () => requireEngine();
