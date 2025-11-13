/**
 * @summary Central re-export barrel for Classic Battle helpers.
 *
 * @description This module aggregates all public-facing Classic Battle
 * utilities, providing a single import point for battle initialization,
 * round management, UI updates, and test helpers. It delegates to
 * specific implementation modules in ./classicBattle/* subdirectory.
 *
 * @pseudocode
 * 1. Import specific utilities from classicBattle/* modules.
 * 2. Re-export them with consistent naming and documentation.
 * 3. Provide test helpers and orchestrator shims for integration.
 *
 * @exports {function} createBattleStore - Initialize battle game state store
 * @exports {function} startRound - Begin a new battle round
 * @exports {function} handleReplay - Reset state for match replay
 * @exports {function} computeRoundResult - Calculate round outcome from selections
 * @exports {function} handleStatSelection - Process player stat choice
 * @exports {function} quitMatch - Quit the current match
 * @exports {function} renderOpponentCard - Display opponent's judoka card
 * @exports {function} enableNextRoundButton - Unlock next round UI control
 * @exports {function} disableNextRoundButton - Lock next round UI control
 * @exports {function} getOpponentJudoka - Fetch opponent's judoka record
 * @exports {function} getCardStatValue - Extract numeric stat from card
 * @exports {function} startCooldown - Begin inter-round cooldown timer
 * @exports {function} applyRoundUI - Update UI to reflect round state
 * @exports {function} getOpponentCardData - Get opponent card display data
 * @exports {function} createClassicBattleDebugAPI - Build test/debug utilities
 * @exports {Promise} Various round event promises for test coordination
 *
 * ⚠️ Hot Path Compliance: All exports are static. No dynamic imports in this file.
 */

// ============================================================================
// CORE ROUND MANAGEMENT
// ============================================================================
export * from "./classicBattle/roundManager.js";
export * from "./classicBattle/selectionHandler.js";
export * from "./classicBattle/roundResolver.js";

// ============================================================================
// QUIT & MODAL MANAGEMENT
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

/**
 * Re-export: returns the opponent's judoka selection for the current match.
 *
 * This is a compatibility re-export of `getOpponentJudoka` from
 * `./classicBattle/cardSelection.js`. Retrieves the opponent's chosen judoka
 * card, which may be pre-selected or computed based on AI/game state rules.
 *
 * @exports {function} getOpponentJudoka
 *
 * @pseudocode
 * 1. Delegate to `getOpponentJudoka()` in `cardSelection.js`.
 * 2. Determine opponent's chosen judoka card for the current round.
 * 3. Return opponent's judoka data or `null` if no selection is available.
 *
 * @returns {JudokaRecord|null} Opponent's judoka data or null.
 */
export { getOpponentJudoka } from "./classicBattle/cardSelection.js";

/**
 * Re-export: extract a numeric stat value from a card object.
 *
 * This re-exports `getCardStatValue` from `./classicBattle/cardStatUtils.js`.
 * The helper converts different card stat representations into a comparable
 * numeric value used by the battle resolver for outcome calculation.
 *
 * @exports {function} getCardStatValue
 *
 * @pseudocode
 * 1. Delegate to `getCardStatValue(card, statKey)` in `cardStatUtils.js`.
 * 2. Extract raw stat value from card, handling various data types (string, number, range).
 * 3. Normalize raw value into comparable numeric format for battle calculations.
 * 4. Return the normalized numeric stat value.
 *
 * @param {JudokaRecord} card - Card/judoka object containing stat data.
 * @param {string} statKey - Stat identifier (e.g., 'power', 'speed', 'technique').
 * @returns {number} Normalized numeric stat value.
 */
export { getCardStatValue } from "./classicBattle/cardStatUtils.js";

// ============================================================================
// ROUND MANAGEMENT & COOLDOWN
// ============================================================================

/**
 * Re-export: start a round cooldown timer.
 *
 * Delegates to `startCooldown` in `./classicBattle/roundManager.js` which
 * controls timed transitions between round states. Used after round resolution
 * to give players visual and temporal feedback before the next round begins.
 *
 * @exports {function} startCooldown
 *
 * @pseudocode
 * 1. Delegate to `startCooldown()` in `roundManager.js`.
 * 2. Initiate a timed cooldown period between battle rounds.
 * 3. Set timer and update UI to reflect cooldown state.
 * 4. Trigger callbacks upon completion.
 *
 * @returns {void}
 */
export { startCooldown } from "./classicBattle/roundManager.js";

/**
 * Re-export: apply UI updates for the current round.
 *
 * This function updates the visible Classic Battle UI to reflect the
 * current round outcome, selected stats, countdowns and hinting. It is
 * implemented in `./classicBattle/roundUI.js` and re-exported here.
 *
 * @exports {function} applyRoundUI
 *
 * @pseudocode
 * 1. Delegate to `applyRoundUI(state)` in `roundUI.js`.
 * 2. Update user interface based on current round state.
 * 3. Handle visual elements: card highlights, countdown timers, hints.
 * 4. Ensure UI accurately reflects battle progress and round outcome.
 *
 * @returns {void}
 */
export { applyRoundUI } from "./classicBattle/roundUI.js";

// ============================================================================
// OPPONENT CARD DATA & DISPLAY
// ============================================================================

/**
 * Re-export: obtain opponent card metadata for display and comparison.
 *
 * Delegates to `getOpponentCardData` in `./classicBattle/opponentController.js`.
 * The returned object contains the card's display data and any internal ids
 * needed by the battle engine for comparison and outcome calculation.
 *
 * @exports {function} getOpponentCardData
 *
 * @pseudocode
 * 1. Delegate to `getOpponentCardData()` in `opponentController.js`.
 * 2. Fetch or generate opponent's card data.
 * 3. Compose object with display information (name, image, stats) and internal identifiers.
 * 4. Return opponent card data for UI rendering and battle logic.
 *
 * @returns {OpponentCardData} Object containing card display data and internal identifiers.
 */
export { getOpponentCardData } from "./classicBattle/opponentController.js";

/**
 * Re-export: create a debug/test API for Classic Battle flows.
 *
 * This helper is used in tests and debugging to expose internal hooks,
 * simulate timers, and trigger orchestration events. Implementation lives in
 * `./classicBattle/setupTestHelpers.js` but the re-export makes it available
 * from the central helpers index.
 *
 * @exports {function} createClassicBattleDebugAPI
 *
 * @pseudocode
 * 1. Delegate to `createClassicBattleDebugAPI()` in `setupTestHelpers.js`.
 * 2. Create and return object containing debugging/testing utilities.
 * 3. Utilities include game state manipulation, timer control, event triggers.
 * 4. Return assembled debug API for test scenarios.
 *
 * @returns {DebugAPI} Object with debug utilities and test hooks.
 */
export { createClassicBattleDebugAPI } from "./classicBattle/setupTestHelpers.js";

// ============================================================================
// TEST PROMISES & EVENT COORDINATION
// ============================================================================

/**
 * Re-export: test-friendly promises for coordinating round events.
 *
 * These re-exports from `./classicBattle/promises.js` provide event promises
 * used by tests to synchronize on battle state transitions without polling
 * or hardcoded timeouts.
 *
 * @exports {function} getRoundPromptPromise - Promise that resolves when round starts
 * @exports {function} getCountdownStartedPromise - Promise for countdown timer start
 * @exports {function} getRoundResolvedPromise - Promise for round completion
 * @exports {function} getRoundTimeoutPromise - Promise for round timeout
 * @exports {function} getStatSelectionStalledPromise - Promise for selection stall
 */
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
// TEST/DEBUG HOOKS (Non-Public API — Prefixed with __)
// ============================================================================

/**
 * Re-export: internal test/debug hooks for classic battle module lifecycle.
 *
 * These hooks (prefixed with `__`) are non-public APIs used by tests to
 * reset bindings, trigger timeouts, and set card stat values for deterministic
 * testing scenarios.
 *
 * @exports {function} __ensureClassicBattleBindings - Reinitialize battle bindings
 * @exports {function} __resetClassicBattleBindings - Reset all battle state
 * @exports {function} __triggerRoundTimeoutNow - Force round timeout
 * @exports {function} __triggerStallPromptNow - Force selection stall
 * @exports {function} __setCardStatValuesForTest - Override card stats for tests
 */
export {
  ensureBindings as __ensureClassicBattleBindings,
  resetBindings as __resetClassicBattleBindings,
  triggerRoundTimeoutNow as __triggerRoundTimeoutNow,
  triggerStallPromptNow as __triggerStallPromptNow,
  setCardStatValuesForTest as __setCardStatValuesForTest
} from "./classicBattle/testHooks.js";

// ============================================================================
// ORCHESTRATOR API SHIMS (Battle Integration)
// ============================================================================

/**
 * Re-export: orchestrator API shims for battle integration and state access.
 *
 * These shims from `./classicBattle/orchestratorApi.js` provide thin adapters
 * for confirming readiness, requesting interrupts, querying state, and injecting
 * fake timers for deterministic testing.
 *
 * @exports {function} confirmReadiness - Signal player/battle readiness
 * @exports {function} requestInterrupt - Request match interruption
 * @exports {function} getOrchestratorState - Query orchestrator state machine
 * @exports {function} injectFakeTimers - Enable fake timers for tests
 */
export {
  confirmReadiness,
  requestInterrupt,
  getState as getOrchestratorState,
  injectFakeTimers
} from "./classicBattle/orchestratorApi.js";
