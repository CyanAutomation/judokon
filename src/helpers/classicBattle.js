export * from "./classicBattle/roundManager.js";
export * from "./classicBattle/selectionHandler.js";
export * from "./classicBattle/roundResolver.js";
export * from "./classicBattle/quitModal.js";
export {
  renderOpponentCard,
  enableNextRoundButton,
  disableNextRoundButton
} from "./classicBattle/uiHelpers.js";
/**
 * Re-export: returns the opponent's judoka selection for the current match.
 *
 * This is a compatibility re-export of `getOpponentJudoka` from
 * `./classicBattle/cardSelection.js`. Documented here so public imports have
 * clear JSDoc and a high-level pseudocode overview.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `getOpponentJudoka` function in `cardSelection.js`.
 * 2. This function is responsible for determining the opponent's chosen judoka card for the current round.
 * 3. It may involve logic to select a card based on game state, AI, or pre-defined rules.
 * 4. The returned value is the opponent's judoka data, or `null` if no selection is made.
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
/**
 * Re-export: extract a numeric stat value from a card object.
 *
 * This re-exports `getCardStatValue` from `./classicBattle/cardStatUtils.js`.
 * The helper converts different card stat representations into a comparable
 * numeric value used by the battle resolver.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `getCardStatValue` function in `cardStatUtils.js`.
 * 2. This function takes a card object and a stat key as input.
 * 3. It extracts the raw stat value from the card, handling various data types (e.g., string, number, range).
 * 4. It then normalizes this raw value into a comparable numeric format, suitable for battle calculations.
 * 5. The normalized numeric stat value is returned.
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
/**
 * Re-export: start a round cooldown timer.
 *
 * Delegates to `startCooldown` in `./classicBattle/roundManager.js` which
 * controls timed transitions between round states.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `startCooldown` function in `roundManager.js`.
 * 2. This function initiates a timed cooldown period between battle rounds.
 * 3. It typically involves setting a timer and updating the UI to reflect the cooldown state.
 * 4. The cooldown can be configured with a specific duration and may trigger callbacks upon completion.
 */
export { startCooldown } from "./classicBattle/roundManager.js";
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
/**
 * Re-export: apply UI updates for the current round.
 *
 * This function updates the visible Classic Battle UI to reflect the
 * current round outcome, selected stats, countdowns and hinting. It is
 * implemented in `./classicBattle/roundUI.js` and re-exported here.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `applyRoundUI` function in `roundUI.js`.
 * 2. This function is responsible for updating the user interface based on the current round's state.
 * 3. It handles visual elements such as card highlights, countdown timers, and hints.
 * 4. It ensures the UI accurately reflects the progress and outcome of the battle round.
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
/**
 * Re-export: obtain opponent card metadata for display and comparison.
 *
 * Delegates to `getOpponentCardData` in `./classicBattle/opponentController.js`.
 * The returned object contains the card's display data and any internal ids
 * needed by the battle engine.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `getOpponentCardData` function in `opponentController.js`.
 * 2. This function is responsible for fetching or generating the data for the opponent's card.
 * 3. The data includes display information (e.g., name, image, stats) and any internal identifiers required by the battle engine.
 * 4. The composed opponent card data object is returned.
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
/**
 * Re-export: create a debug/test API for Classic Battle flows.
 *
 * This helper is used in tests and debugging to expose internal hooks,
 * simulate timers, and trigger orchestration events. Implementation lives in
 * `./classicBattle/setupTestHelpers.js` but the re-export makes it available
 * from the central helpers index.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `createClassicBattleDebugAPI` function in `setupTestHelpers.js`.
 * 2. This function creates and returns an object containing various utilities for debugging and testing the Classic Battle system.
 * 3. These utilities may include methods to manipulate game state, control timers, or trigger specific events for testing scenarios.
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

// PRD Orchestrator API shims
export {
  confirmReadiness,
  requestInterrupt,
  getState as getOrchestratorState,
  injectFakeTimers
} from "./classicBattle/orchestratorApi.js";
