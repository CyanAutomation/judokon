// Compatibility shim for tests and legacy imports
// Re-export setupClassicBattlePage and related helpers

/**
 * Initialize the Classic Battle page and expose stat selection.
 * @pseudocode
 * - Import and re-export `setupClassicBattlePage` from classicBattle/bootstrap.
 * - Re-export `selectStat` from classicBattle/uiHelpers for callers needing direct access.
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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Re-export: initialize the Classic Battle page and bind UI behaviors.
 *
 * This re-export forwards to `setupClassicBattlePage` in
 * `./classicBattle/bootstrap.js`. The function bootstraps DOM bindings,
 * event listeners, and any test hooks required for the Classic Battle page.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `setupClassicBattlePage` function in `bootstrap.js`.
 * 2. This function is responsible for setting up the entire Classic Battle page.
 * 3. It initializes UI components, binds event handlers, and prepares the game for interaction.
 * 4. It may also expose certain elements or functions for testing and debugging purposes.
 *
 * @returns {void}
 */
export { setupClassicBattlePage } from "./classicBattle/bootstrap.js";
/**
 * Re-export: programmatically select a stat during a round.
 *
 * Delegates to `selectStat` in `./classicBattle/uiHelpers.js`. Used by the
 * UI and tests to trigger the stat selection flow which starts the round
 * resolution process.
 *
 * @pseudocode
 * 1. Delegate the call to the underlying `selectStat` function in `uiHelpers.js`.
 * 2. This function simulates a user selecting a stat during a battle round.
 * 3. It triggers the necessary UI updates and game logic to process the stat selection.
 * 4. This is useful for automated testing or for programmatic control of the battle.
 *
 * @returns {void}
 */
export { selectStat } from "./classicBattle/uiHelpers.js";
