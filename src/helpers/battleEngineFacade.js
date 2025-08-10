import { BattleEngine } from "./BattleEngine.js";

export { BattleEngine, STATS } from "./BattleEngine.js";

export const battleEngine = new BattleEngine();

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
