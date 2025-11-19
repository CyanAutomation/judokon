import { initDebugPanel } from "./debugPanel.js";
import { registerRoundStartErrorHandler } from "./uiHelpers.js";

/**
 * Setup debug UI hooks for the Classic Battle view.
 *
 * Initializes the debug panel and registers handlers that can retry starting
 * a round when a `roundStartError` occurs. This helps developers and tests
 * recover from transient start failures.
 *
 * @pseudocode
 * 1. Initialize the debug panel UI via `initDebugPanel()`.
 * 2. Register a handler for `roundStartError` which calls `view.startRound()`.
 *
 * @param {import("./view.js").ClassicBattleView} view - The Classic Battle view instance.
 * @returns {void}
 */
export function setupDebugHooks(view) {
  initDebugPanel();
  registerRoundStartErrorHandler(() => view.startRound());
}

export default setupDebugHooks;
