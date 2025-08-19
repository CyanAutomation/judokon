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
 *  - `watchForDrift(...args)` -> `battleEngine.watchForDrift(...args)`
 *  - `_resetForTest()` -> `battleEngine._resetForTest()`
 */
export { BattleEngine, STATS } from "./BattleEngine.js";

export const battleEngine = new BattleEngine();

// Thin wrappers delegate directly to the underlying `battleEngine` instance.

export const setPointsToWin = (value) => battleEngine.setPointsToWin(value);
export const getPointsToWin = () => battleEngine.getPointsToWin();
export const stopTimer = () => battleEngine.stopTimer();
export const startRound = (...args) => battleEngine.startRound(...args);
export const startCoolDown = (...args) => battleEngine.startCoolDown(...args);
export const pauseTimer = () => battleEngine.pauseTimer();
export const resumeTimer = () => battleEngine.resumeTimer();
export const handleStatSelection = (...args) => battleEngine.handleStatSelection(...args);
export const quitMatch = () => battleEngine.quitMatch();
export const getScores = () => battleEngine.getScores();
export const getRoundsPlayed = () => battleEngine.getRoundsPlayed();
export const isMatchEnded = () => battleEngine.isMatchEnded();
export const getTimerState = () => battleEngine.getTimerState();
export const watchForDrift = (...args) => battleEngine.watchForDrift(...args);
export const _resetForTest = () => battleEngine._resetForTest();
