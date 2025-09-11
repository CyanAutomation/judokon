import { BattleEngine, STATS } from "./BattleEngine.js";
import { setTestMode } from "./testModeUtils.js";
import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";
import logger from "./logger.js";

/**
 * Re-exports `BattleEngine`, `STATS`, and `OUTCOME` from the engine implementation.
 *
 * @summary Provides thin re-exports so callers import from the facade instead of
 * the implementation module directly. This keeps call sites stable if the
 * implementation file is refactored.
 *
 * @description
 * - **BattleEngine**: The class implementing match flow and timer control.
 * - **STATS**: The canonical stats enumeration used when creating engines.
 * - **OUTCOME**: Enumerates possible round/match outcomes.
 *
 * @pseudocode
 * 1. Import `BattleEngine`, `STATS`, and `OUTCOME` from `./BattleEngine.js`.
 * 2. Re-export these symbols so other modules consume a stable facade.
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
function requireEngine() {
  if (!battleEngine) {
    // Provide a clear error for consumers that call helpers before
    // initialization.
    throw new Error("Battle engine not initialized. Call createBattleEngine() first.");
  }
  return battleEngine;
}

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
  logger.log("battleEngineFacade: createBattleEngine called");
  // If an engine already exists and the caller didn't explicitly request a
  // fresh one, return the existing instance. Tests that repeatedly call
  // createBattleEngine() during simulated rounds previously recreated the
  // engine each time, resetting cumulative scores. Allow callers to force
  // recreation by passing { forceCreate: true }.
  if (battleEngine && !config.forceCreate) {
    logger.log("battleEngineFacade: returning existing engine instance");
    return battleEngine;
  }

  battleEngine = new BattleEngine({
    pointsToWin: CLASSIC_BATTLE_POINTS_TO_WIN,
    maxRounds: CLASSIC_BATTLE_MAX_ROUNDS,
    stats: STATS,
    debugHooks: { getStateSnapshot },
    ...config
  });
  logger.log("battleEngineFacade: battleEngine set to", battleEngine);
  try {
    if (typeof config?.seed === "number") {
      setTestMode({ enabled: true, seed: Number(config.seed) });
    }
  } catch {}
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

/**
 * startRoundTimer: PRD alias for starting the round timer.
 *
 * @summary Alias kept for Product Requirements Document (PRD) compatibility.
 * It forwards its arguments to the engine `startRound` implementation.
 *
 * @pseudocode
 * 1. Ensure an engine instance exists via `requireEngine()`.
 * 2. Call the engine's `startRound(...args)` passing through all arguments.
 * 3. Return the engine promise so callers may await round start completion.
 *
 * @param {...any} args - All arguments are forwarded to `BattleEngine.startRound`.
 * @returns {Promise<void>} Resolves when the engine has started the round.
 */
export const startRoundTimer = (...args) => requireEngine().startRound(...args);

/**
 * pauseRoundTimer: PRD alias for pausing the round timer.
 *
 * @pseudocode
 * 1. Delegate to `pauseTimer` on the active engine instance which saves remaining
 *    time and cancels any running tick callbacks.
 *
 * @returns {void}
 */
export const pauseRoundTimer = () => requireEngine().pauseTimer();

/**
 * resumeRoundTimer: PRD alias for resuming the round timer.
 *
 * @pseudocode
 * 1. Delegate to `resumeTimer` on the active engine instance which restores
 *    remaining time and restarts tick callbacks.
 *
 * @returns {void}
 */
export const resumeRoundTimer = () => requireEngine().resumeTimer();

/**
 * stopRoundTimer: PRD alias for stopping the round timer.
 *
 * @pseudocode
 * 1. Delegate to `stopTimer` on the active engine instance which cancels the
 *    timer and clears scheduled callbacks.
 *
 * @returns {void}
 */
export const stopRoundTimer = () => requireEngine().stopTimer();

/**
 * evaluateSelection: PRD-shaped wrapper for stat evaluation.
 *
 * @summary Evaluate a stat selection pair and return the engine-computed outcome.
 * @pseudocode
 * 1. Validate inputs (statKey optional, playerVal and opponentVal required).
 * 2. Call the engine `handleStatSelection(playerVal, opponentVal)` to compute
 *    the delta, outcome and updated scores.
 * 3. If `statKey` was provided, attach it to the returned result for caller
 *    convenience.
 *
 * @param {object} opts
 * @param {string} [opts.statKey] - Optional stat identifier selected by the player.
 * @param {number} opts.playerVal - Numeric value chosen by the player.
 * @param {number} opts.opponentVal - Numeric value chosen by the opponent.
 * @returns {{delta:number, outcome:string, matchEnded:boolean, playerScore:number, opponentScore:number, statKey?:string}}
 */
export function evaluateSelection({ statKey, playerVal, opponentVal }) {
  const result = requireEngine().handleStatSelection(playerVal, opponentVal);
  return statKey ? { ...result, statKey } : result;
}

/**
 * isMatchPoint: PRD query alias.
 *
 * @pseudocode
 * 1. Delegate to engine `isMatchPoint()` if available; otherwise return `false`.
 *
 * @returns {boolean} True when the current round could end the match for either player.
 */
export const isMatchPoint = () => requireEngine().isMatchPoint?.() ?? false;

/**
 * getSeed: PRD query to expose deterministic seed.
 *
 * @pseudocode
 * 1. Delegate to engine `getSeed()` if available and return the value used for
 *    deterministic behavior in test mode.
 *
 * @returns {number|undefined} The numeric seed when test mode is enabled; otherwise undefined.
 */
export const getSeed = () => requireEngine().getSeed?.();

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

// Internal test helper removed; tests should instantiate engines via `createBattleEngine()`.

/**
 * Note: All thin wrappers above are intentionally documented with @pseudocode
 * in their preceding blocks to satisfy the project's JSDoc + @pseudocode rule.
 */
