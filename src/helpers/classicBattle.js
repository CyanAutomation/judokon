/**
 * @summary Central re-export barrel for Classic Battle helpers.
 *
 * @description This module aggregates all public-facing Classic Battle
 * utilities, providing a single import point for battle initialization,
 * round management, UI updates, and test helpers. It delegates to
 * specific implementation modules in ./classicBattle/* subdirectory.
 *
 * ⚠️ Hot Path Compliance: This is a hot-path module. All exports are static
 * and pre-loaded to avoid runtime import overhead during battle rounds.
 * No dynamic imports permitted.
 *
 * ## Primary Entry Points
 * - `createBattleStore()` — Initialize battle state
 * - `startRound()` — Begin a round
 * - `handleStatSelection()` — Process player stat choice
 * - `computeRoundResult()` — Calculate round outcome
 * - `handleReplay()` — Reset for match replay
 * - `quitMatch()` — Quit current match
 *
 * ## Secondary Utilities
 * - UI helpers (renderOpponentCard, button controls, round UI)
 * - Card utilities (stat extraction, opponent data)
 * - Cooldown & timing (startCooldown)
 * - Test coordination (event promises, debug API)
 */

// ============================================================================
// CORE ROUND MANAGEMENT — Use for round lifecycle: start, select, resolve
// ============================================================================
export * from "./classicBattle/roundManager.js";
export * from "./classicBattle/selectionHandler.js";
export * from "./classicBattle/roundResolver.js";

// ============================================================================
// QUIT & MODAL MANAGEMENT — Use to quit match or show quit confirmation
// ============================================================================
export * from "./classicBattle/quitModal.js";

// ============================================================================
// UI HELPERS & OPPONENT CARD RENDERING
// ============================================================================
export {
  renderOpponentCard,
  enableNextRoundButton,
  disableNextRoundButton
} from "./classicBattle/uiHelpers.js";

// ============================================================================
// CARD UTILITIES — Use to extract stats and opponent metadata
// ============================================================================

/**
 * @summary Get opponent's judoka selection for the current round.
 * @returns {object|null} Opponent judoka or null if not set.
 */
export { getOpponentJudoka } from "./classicBattle/cardSelection.js";

/**
 * @summary Extract numeric stat value from a judoka card.
 * @param {object} card - Judoka card object.
 * @param {string} statKey - Stat identifier.
 * @returns {number} Normalized numeric stat value.
 */
export { getCardStatValue } from "./classicBattle/cardStatUtils.js";

// ============================================================================
// ROUND UI & DISPLAY — Use to update visual state during round flow
// ============================================================================

/** Re-export: Apply UI updates to reflect current round state. */
export { applyRoundUI } from "./classicBattle/roundUI.js";

/** Re-export: Get opponent card data for display and battle logic. */
export { getOpponentCardData } from "./classicBattle/opponentController.js";

// ============================================================================
// TEST PROMISES — Event coordination for deterministic testing
// ============================================================================

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

// ============================================================================
// TEST/DEBUG HOOKS (Internal API — Prefixed with __)
// ============================================================================

export {
  ensureBindings as __ensureClassicBattleBindings,
  resetBindings as __resetClassicBattleBindings,
  triggerRoundTimeoutNow as __triggerRoundTimeoutNow,
  triggerStallPromptNow as __triggerStallPromptNow,
  setCardStatValuesForTest as __setCardStatValuesForTest
} from "./classicBattle/testHooks.js";

// ============================================================================
// ORCHESTRATOR API SHIMS — Battle integration and state access
// ============================================================================

export {
  confirmReadiness,
  requestInterrupt,
  getState as getOrchestratorState,
  injectFakeTimers
} from "./classicBattle/orchestratorApi.js";
