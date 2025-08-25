// Compatibility shim for tests and legacy imports
// Re-export setupClassicBattlePage and related helpers

/**
 * Initialize the Classic Battle page and expose stat selection.
 * @pseudocode
 * - Import and re-export `setupClassicBattlePage` from classicBattle/bootstrap.
 * - Re-export `selectStat` from classicBattle/uiHelpers for callers needing direct access.
 */
export { setupClassicBattlePage } from "./classicBattle/bootstrap.js";
export { selectStat } from "./classicBattle/uiHelpers.js";
