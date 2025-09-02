import { BattleEngine, STATS } from "./BattleEngine.js";
import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";

/**
 * Core battle engine and useful constants exported from the engine module.
 *
 * @summary Re-export the `BattleEngine` class and `STATS` constant from the engine module.
 * @pseudocode
 * 1. Import engine implementation from `./BattleEngine.js` and re-export its public API.
 */
export { BattleEngine, STATS, OUTCOME } from "./BattleEngine.js";

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

/** @type {IBattleEngine|undefined} */
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
let battleEngine;

function requireEngine() {
  if (!battleEngine) {
    // Provide a clear error for consumers that call helpers before
    // initialization.
    throw new Error("Battle engine not initialized. Call createBattleEngine() first.");
  }
  return battleEngine;
}

/**
 * Internal guard that returns the active engine or throws if none exists.
 *
 * @summary Ensures the engine has been created before helper functions delegate to it.
 * @pseudocode
 * 1. If `battleEngine` is undefined, throw an Error instructing callers to initialize it.
 * 2. Otherwise, return the `battleEngine` instance.
 *
 * @throws {Error} When no engine has been created.
 * @returns {IBattleEngine}
 */
// (The function implementation appears above; this comment supplies the required JSDoc.)

/**
 * Create a new battle engine instance.
 *
 * @summary Factory returning a fresh `BattleEngine` instance.
 * @pseudocode
 * 1. Construct a new `BattleEngine` with default classic config merged with `config`.
 * 2. Store the instance for use by exported wrapper helpers.
 * 3. Return the new instance.
 *
 * @param {object} [config]
 * @returns {IBattleEngine}
 */
export function createBattleEngine(config = {}) {
  battleEngine = new BattleEngine({
    pointsToWin: CLASSIC_BATTLE_POINTS_TO_WIN,
    maxRounds: CLASSIC_BATTLE_MAX_ROUNDS,
    stats: STATS,
    debugHooks: { getStateSnapshot },
    ...config
  });
  return battleEngine;
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
export const handleStatSelection = (...args) => requireEngine().handleStatSelection(...args);

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
 * 1. Return `battleEngine.getScores()`.
 *
 * @returns {object}
 */
export const getScores = () => requireEngine().getScores();

/**
 * Retrieve how many rounds have been played.
 *
 * @pseudocode
 * 1. Return `battleEngine.getRoundsPlayed()`.
 *
 * @returns {number}
 */
export const getRoundsPlayed = () => requireEngine().getRoundsPlayed();

/**
 * Query whether the match has ended.
 *
 * @pseudocode
 * 1. Return `battleEngine.isMatchEnded()`.
 *
 * @returns {boolean}
 */
export const isMatchEnded = () => requireEngine().isMatchEnded();

/**
 * Get timer state (remaining, running, paused) from the engine.
 *
 * @pseudocode
 * 1. Return `battleEngine.getTimerState()`.
 *
 * @returns {object}
 */
export const getTimerState = () => requireEngine().getTimerState();

/**
 * Subscribe to battle engine events.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.on(type, handler)`.
 *
 * @param {string} type - Event name.
 * @param {(payload: any) => void} handler - Callback for the event.
 * @returns {void}
 */
export const on = (type, handler) => battleEngine?.on?.(type, handler);

/**
 * Unsubscribe from battle engine events.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.off(type, handler)`.
 *
 * @param {string} type - Event name.
 * @param {(payload: any) => void} handler - Callback for the event.
 * @returns {void}
 */
export const off = (type, handler) => battleEngine?.off?.(type, handler);

// Internal test helper removed; tests should instantiate engines via `createBattleEngine()`.

/**
 * Note: All thin wrappers above are intentionally documented with @pseudocode
 * in their preceding blocks to satisfy the project's JSDoc + @pseudocode rule.
 */
