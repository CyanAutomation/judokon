// Compatibility shim for tests and legacy imports
// Re-export setupClassicBattlePage from the classicBattle bootstrap module

/**
 * Initialize the Classic Battle page.
 * @pseudocode
 * - Import `setupClassicBattlePage` from classicBattle/bootstrap.
 * - Re-export `selectStat` for consumers needing direct stat processing.
 */
export { setupClassicBattlePage } from "./classicBattle/bootstrap.js";
export { selectStat } from "./classicBattle.js";
