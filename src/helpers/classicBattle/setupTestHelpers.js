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
