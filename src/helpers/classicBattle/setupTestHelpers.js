import { resetStatButtons } from "../battle/index.js";
import { skipCurrentPhase } from "./skipHandler.js";
import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";

/**
 * Create debug helpers for Classic Battle tests.
 *
 * @pseudocode
 * 1. Reference the controller's battle store.
 * 2. Define `skipBattlePhase` that resets stat buttons after skipping.
 * 3. Expose overrides to start a round and freeze/resume the header.
 * 4. Assign the store and helpers to `window` for runtime consumers.
 * 5. Return the helpers.
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
 * Create a debug API for Classic Battle used in tests and developer tooling.
 *
 * Exposes helpers that allow tests to skip phases, override round start, and
 * pause/resume header timers. The created API is attached to `window` when
 * available to make it easy to access from test runner contexts.
 *
 * @pseudocode
 * 1. Read the battle store from `view.controller.battleStore`.
 * 2. Provide `skipBattlePhase` that calls `skipCurrentPhase()` and resets stat buttons.
 * 3. Provide `startRoundOverride` that delegates to `view.startRound()`.
 * 4. Provide `freezeBattleHeader` and `resumeBattleHeader` to pause/resume timers.
 * 5. Attach the API and store to `window` when running in a browser environment.
 *
 * @param {import("./view.js").ClassicBattleView} view - The Classic Battle view instance.
 * @returns {{battleStore: ReturnType<import("./roundManager.js").createBattleStore>, skipBattlePhase: Function, startRoundOverride: Function, freezeBattleHeader: Function, resumeBattleHeader: Function}}
 */
export function createClassicBattleDebugAPI(view) {
  const store = view.controller.battleStore;
  const skipBattlePhase = () => {
    try {
      skipCurrentPhase();
    } catch {}
    try {
      resetStatButtons();
      const c = document.querySelectorAll("#stat-buttons .selected").length;
      console.warn(`[test] skipBattlePhase: after immediate reset selected=${c}`);
    } catch {}
    return Promise.resolve();
  };

  const startRoundOverride = () => view.startRound();
  const freezeBattleHeader = () => {
    try {
      view.controller.timerControls.pauseTimer();
      stopScheduler();
    } catch {}
  };
  const resumeBattleHeader = () => {
    try {
      startScheduler();
      view.controller.timerControls.resumeTimer();
    } catch {}
  };

  const api = {
    battleStore: store,
    skipBattlePhase,
    startRoundOverride,
    freezeBattleHeader,
    resumeBattleHeader
  };

  if (typeof window !== "undefined") {
    window.battleStore = store;
    Object.assign(window, api);
  }

  return api;
}

export default createClassicBattleDebugAPI;
