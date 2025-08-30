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
export function setupDebugHooks(view) {
  initDebugPanel();
  registerRoundStartErrorHandler(() => view.startRound());
}

export default setupDebugHooks;
