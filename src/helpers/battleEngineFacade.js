import { BattleEngine, STATS } from "./BattleEngine.js";

export { BattleEngine, STATS } from "./BattleEngine.js";

const battleEngine = new BattleEngine();

/**
 * Set the number of points required to win a match.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.setPointsToWin(value)`.
 *
 * @param {number} value
 * @returns {void}
 */
export const setPointsToWin = (value) => battleEngine.setPointsToWin(value);

/**
 * Get the current points required to win a match.
 *
 * @pseudocode
 * 1. Return `battleEngine.getPointsToWin()` result.
 *
 * @returns {number}
 */
export const getPointsToWin = () => battleEngine.getPointsToWin();

/**
 * Stop any active battle timer.
 *
 * @pseudocode
 * 1. Call `battleEngine.stopTimer()` to cancel ticks and callbacks.
 *
 * @returns {void}
 */
export const stopTimer = () => battleEngine.stopTimer();

/**
 * Start a new round via the underlying battle engine.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.startRound(...args)`.
 *
 * @param {...any} args
 * @returns {Promise<void>}
 */
export const startRound = (...args) => battleEngine.startRound(...args);

/**
 * Start the engine cooldown sequence.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.startCoolDown(...args)`.
 *
 * @param {...any} args
 * @returns {Promise<void>}
 */
export const startCoolDown = (...args) => battleEngine.startCoolDown(...args);

/**
 * Pause the current round timer.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.pauseTimer()` which saves remaining time and cancels ticks.
 *
 * @returns {void}
 */
export const pauseTimer = () => battleEngine.pauseTimer();

/**
 * Resume a previously paused round timer.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.resumeTimer()` which restores remaining time and restarts ticks.
 *
 * @returns {void}
 */
export const resumeTimer = () => battleEngine.resumeTimer();

/**
 * Forward stat selection to the engine which computes outcome and updates scores.
 *
 * @pseudocode
 * 1. Call `battleEngine.handleStatSelection(...args)` and return its result.
 *
 * @param {...any} args
 * @returns {object}
 */
export const handleStatSelection = (...args) => battleEngine.handleStatSelection(...args);

/**
 * Quit the current match via the engine.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.quitMatch()`.
 *
 * @returns {void}
 */
export const quitMatch = () => battleEngine.quitMatch();

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
export const interruptMatch = (reason) => battleEngine.interruptMatch(reason);

/**
 * Retrieve the current scores from the engine.
 *
 * @pseudocode
 * 1. Return `battleEngine.getScores()`.
 *
 * @returns {object}
 */
export const getScores = () => battleEngine.getScores();

/**
 * Retrieve how many rounds have been played.
 *
 * @pseudocode
 * 1. Return `battleEngine.getRoundsPlayed()`.
 *
 * @returns {number}
 */
export const getRoundsPlayed = () => battleEngine.getRoundsPlayed();

/**
 * Query whether the match has ended.
 *
 * @pseudocode
 * 1. Return `battleEngine.isMatchEnded()`.
 *
 * @returns {boolean}
 */
export const isMatchEnded = () => battleEngine.isMatchEnded();

/**
 * Get timer state (remaining, running, paused) from the engine.
 *
 * @pseudocode
 * 1. Return `battleEngine.getTimerState()`.
 *
 * @returns {object}
 */
export const getTimerState = () => battleEngine.getTimerState();

/**
 * Internal test helper to reset engine state between tests.
 *
 * @pseudocode
 * 1. Call `battleEngine._resetForTest()` to clear internal state.
 *
 * @returns {void}
 */
export const _resetForTest = () => battleEngine._resetForTest();

/**
 * Note: All thin wrappers above are intentionally documented with @pseudocode
 * in their preceding blocks to satisfy the project's JSDoc + @pseudocode rule.
 */