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
export { getCardStatValue } from "./classicBattle/cardStatUtils.js";
export { scheduleNextRound } from "./classicBattle/timerService.js";
export { applyRoundUI } from "./classicBattle/roundUI.js";
export { getOpponentCardData } from "./classicBattle/opponentController.js";
export {
  roundOptionsReadyPromise,
  roundPromptPromise,
  nextRoundTimerReadyPromise,
  matchOverPromise,
  countdownStartedPromise,
  roundTimeoutPromise,
  statSelectionStalledPromise,
  roundResolvedPromise
} from "./classicBattle/promises.js";
export {
  ensureBindings as __ensureClassicBattleBindings,
  triggerRoundTimeoutNow as __triggerRoundTimeoutNow,
  triggerStallPromptNow as __triggerStallPromptNow
} from "./classicBattle/testHooks.js";
