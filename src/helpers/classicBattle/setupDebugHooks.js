import { initDebugPanel, registerRoundStartErrorHandler } from "./uiHelpers.js";

/**
 * Attach debug panels and error hooks.
 *
 * @pseudocode
 * 1. Initialize the debug panel.
 * 2. Retry round start on `roundStartError`.
 *
 * @param {import("./view.js").ClassicBattleView} view
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
