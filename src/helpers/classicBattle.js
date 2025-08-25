/**
 * Classic Battle public helper facade.
 *
 * @pseudocode
 * 1. Re-export the public surface of Classic Battle helpers for other modules.
 * 2. Keep this file minimal and import only stable, public APIs.
 */
export * from "./classicBattle/roundManager.js";
export * from "./classicBattle/selectionHandler.js";
export * from "./classicBattle/roundResolver.js";
export * from "./classicBattle/quitModal.js";
export {
  renderOpponentCard,
  enableNextRoundButton,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
export { getOpponentJudoka } from "./classicBattle/cardSelection.js";
export { scheduleNextRound } from "./classicBattle/timerService.js";
export { applyRoundUI } from "./classicBattle/roundUI.js";
export { getOpponentCardData } from "./classicBattle/opponentController.js";
export {
  roundOptionsReadyPromise,
  roundPromptPromise,
  nextRoundTimerReadyPromise,
  matchOverPromise
} from "./classicBattle/promises.js";
