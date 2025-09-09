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
 * Re-export: returns the opponent's judoka selection for the current match.
 *
 * This is a compatibility re-export of `getOpponentJudoka` from
 * `./classicBattle/cardSelection.js`. Documented here so public imports have
 * clear JSDoc and a high-level pseudocode overview.
 *
 * @pseudocode
 * 1. Accept a match state or player identifier (delegated to original module).
 * 2. Locate the opponent's currently-selected judoka/card.
 * 3. Normalize or map any internal properties needed by callers (if required).
 * 4. Return the opponent judoka object or `null` if none is selected.
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
 * 1. Accept a card object and the stat key to read.
 * 2. Read the stat value from the card (supporting strings, numbers, ranges).
 * 3. Normalize the value to a number (parse strings, compute averages for ranges).
 * 4. Apply any game-specific modifiers or clamps.
 * 5. Return the numeric stat value for comparison.
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
 * 1. Accept a duration and optional callbacks or a context object.
 * 2. Create or schedule a timer that will fire when the cooldown completes.
 * 3. Update any shared round state to indicate a cooldown is active.
 * 4. Return a handle or id that can be used to cancel the cooldown early.
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
 * 1. Accept the current round data and an optional DOM root.
 * 2. Update the opponent and player card visuals (highlight wins/loses).
 * 3. Show or hide countdowns, hints, and the next-round button based on state.
 * 4. Dispatch any UI events needed for tests or orchestrator integration.
 * 5. Return once DOM updates and animations are scheduled.
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
 * 1. Accept an opponent id or match state.
 * 2. Resolve which card the opponent will play this round.
 * 3. Build a display-friendly object (name, image, stats) and any engine-only
 *    metadata required for resolving the round.
 * 4. Return the composed opponent card data object.
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
 * 1. Construct an object exposing test helpers (advance timers, inject state).
 * 2. Wire helpers to the internal event emitters used by the battle engine.
 * 3. Return the debug API object for test code to call.
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
