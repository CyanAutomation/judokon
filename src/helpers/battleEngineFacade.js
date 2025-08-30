import { BattleEngine } from "./BattleEngine.js";

/**
 * Facade for a singleton BattleEngine instance.
 *
 * @pseudocode
 * Import and re-export `BattleEngine` and `STATS`.
 * Instantiate `battleEngine`.
 * Export wrappers:
 *  - `setPointsToWin(value)` -> `battleEngine.setPointsToWin(value)`
 *  - `getPointsToWin()` -> `battleEngine.getPointsToWin()`
 *  - `stopTimer()` -> `battleEngine.stopTimer()`
 *  - `startRound(...args)` -> `battleEngine.startRound(...args)`
 *  - `startCoolDown(...args)` -> `battleEngine.startCoolDown(...args)`
 *  - `pauseTimer()` -> `battleEngine.pauseTimer()`
 *  - `resumeTimer()` -> `battleEngine.resumeTimer()`
 *  - `handleStatSelection(...args)` -> `battleEngine.handleStatSelection(...args)`
 *  - `quitMatch()` -> `battleEngine.quitMatch()`
 *  - `getScores()` -> `battleEngine.getScores()`
 *  - `getRoundsPlayed()` -> `battleEngine.getRoundsPlayed()`
 *  - `isMatchEnded()` -> `battleEngine.isMatchEnded()`
 *  - `getTimerState()` -> `battleEngine.getTimerState()`
 *  - `_resetForTest()` -> `battleEngine._resetForTest()`
 */
export { BattleEngine, STATS } from "./BattleEngine.js";

export const battleEngine = new BattleEngine();

// Thin wrappers delegate directly to the underlying `battleEngine` instance.

/**
 * Sets the number of points required to win a match in the battle engine.
 *
 * @param {number} value - The new points threshold to win.
 * @returns {void}
 * @pseudocode
 * 1. Delegate the call to `battleEngine.setPointsToWin()` with the provided `value`.
 */
export const setPointsToWin = (value) => battleEngine.setPointsToWin(value);
/**
 * Retrieves the number of points currently required to win a match from the battle engine.
 *
 * @returns {number} The current points threshold to win.
 * @pseudocode
 * 1. Delegate the call to `battleEngine.getPointsToWin()` and return its result.
 */
export const getPointsToWin = () => battleEngine.getPointsToWin();
/**
 * Stop any active battle timer and clear round callbacks.
 *
 * @pseudocode
 * 1. Call the underlying engine to stop its timer immediately.
 * 2. Ensure any scheduled callbacks are cancelled so no late transitions occur.
 */
export const stopTimer = () => battleEngine.stopTimer();
/**
 * Starts a new round in the battle engine, initiating its timer and associated callbacks.
 *
 * @param {...any} args - Arguments to pass to the underlying `battleEngine.startRound` method.
 * @returns {Promise<void>} A promise that resolves when the round timer starts.
 * @pseudocode
 * 1. Delegate the call to `battleEngine.startRound()` with all provided arguments (`...args`).
 */
export const startRound = (...args) => battleEngine.startRound(...args);
export const startCoolDown = (...args) => battleEngine.startCoolDown(...args);
/**
 * Pause the current round timer.
 *
 * @pseudocode
 * 1. Delegate pause to the engine which records remaining time and cancels ticks.
 */
export const pauseTimer = () => battleEngine.pauseTimer();
/**
 * Resume a previously paused round timer.
 *
 * @pseudocode
 * 1. Delegate resume to the engine which restores remaining time and restarts ticks.
 */
export const resumeTimer = () => battleEngine.resumeTimer();
/**
 * Handles the selection of a stat in the battle engine, comparing player and opponent stats
 * and updating the match state accordingly.
 *
 * @param {...any} args - Arguments to pass to the underlying `battleEngine.handleStatSelection` method.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, opponentScore: number}} The result of the stat selection, including round outcome and updated scores.
 * @pseudocode
 * 1. Delegate the call to `battleEngine.handleStatSelection()` with all provided arguments (`...args`).
 */
export const handleStatSelection = (...args) => battleEngine.handleStatSelection(...args);
export const quitMatch = () => battleEngine.quitMatch();
export const getScores = () => battleEngine.getScores();
export const getRoundsPlayed = () => battleEngine.getRoundsPlayed();
export const isMatchEnded = () => battleEngine.isMatchEnded();
export const getTimerState = () => battleEngine.getTimerState();
export const _resetForTest = () => battleEngine._resetForTest();
