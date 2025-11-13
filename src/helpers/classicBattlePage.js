/**
 * @file Compatibility shim re-exporting Classic Battle initialization and selection helpers.
 *
 * Provides stable import paths for tests and legacy code. Re-exports:
 * - setupClassicBattlePage from ./classicBattle/bootstrap.js
 * - selectStat from ./classicBattle/uiHelpers.js
 */

// ==================== Initialization ====================

/**
 * Initialize the Classic Battle page with UI bindings and event handlers.
 *
 * @pseudocode
 * 1. Delegate to setupClassicBattlePage in ./classicBattle/bootstrap.js.
 * 2. This function bootstraps DOM bindings, event listeners, and test hooks.
 * 3. Initializes UI components and prepares the page for player interaction.
 *
 * @see ./classicBattle/bootstrap.js
 * @returns {void}
 */
export { setupClassicBattlePage } from "./classicBattle/bootstrap.js";

// ==================== Runtime Helpers ====================

/**
 * Programmatically select a stat during a battle round.
 *
 * @pseudocode
 * 1. Delegate to selectStat in ./classicBattle/uiHelpers.js.
 * 2. Simulates a user selecting a stat during a battle round.
 * 3. Triggers UI updates and game logic for stat selection processing.
 *
 * @see ./classicBattle/uiHelpers.js
 * @returns {void}
 */
export { selectStat } from "./classicBattle/uiHelpers.js";
