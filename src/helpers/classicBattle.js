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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { getOpponentJudoka } from "./classicBattle/cardSelection.js";
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { getCardStatValue } from "./classicBattle/cardStatUtils.js";
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { scheduleNextRound } from "./classicBattle/timerService.js";
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { applyRoundUI } from "./classicBattle/roundUI.js";
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { getOpponentCardData } from "./classicBattle/opponentController.js";
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { createClassicBattleDebugAPI } from "./classicBattle/setupTestHelpers.js";
export {
  roundOptionsReadyPromise,
  roundPromptPromise,
  nextRoundTimerReadyPromise,
  matchOverPromise,
  countdownStartedPromise,
  roundTimeoutPromise,
  statSelectionStalledPromise,
  roundResolvedPromise,
  getRoundPromptPromise,
  getCountdownStartedPromise,
  getRoundResolvedPromise,
  getRoundTimeoutPromise,
  getStatSelectionStalledPromise
} from "./classicBattle/promises.js";
export {
  ensureBindings as __ensureClassicBattleBindings,
  resetBindings as __resetClassicBattleBindings,
  triggerRoundTimeoutNow as __triggerRoundTimeoutNow,
  triggerStallPromptNow as __triggerStallPromptNow
} from "./classicBattle/testHooks.js";
