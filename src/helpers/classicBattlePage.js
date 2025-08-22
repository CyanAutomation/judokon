// Compatibility shim for tests and legacy imports
// Re-export setupClassicBattlePage from the classicBattle bootstrap module

/**
 * Initialize the Classic Battle page.
 * @pseudocode
 * - Import `setupClassicBattlePage` from classicBattle/bootstrap
 * - Export it for callers expecting `src/helpers/classicBattlePage.js`
 */
export { setupClassicBattlePage } from "./classicBattle/bootstrap.js";

