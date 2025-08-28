import { resetStatButtons } from "../battle/index.js";
import { skipCurrentPhase } from "./skipHandler.js";
import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";

/**
 * Install test helpers on the global window.
 *
 * @pseudocode
 * 1. Expose `battleStore` and `skipBattlePhase` on `window`.
 * 2. Provide overrides to start a round and freeze/resume the header.
 * 3. Use scheduler helpers when freezing or resuming the header.
 *
 * @param {import("./view.js").ClassicBattleView} view
 */
export function setupTestHelpers(view) {
  const store = view.controller.battleStore;
  window.battleStore = store;
  window.skipBattlePhase = () => {
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

  try {
    window.startRoundOverride = () => view.startRound();
    window.freezeBattleHeader = () => {
      try {
        view.controller.timerControls.pauseTimer();
        stopScheduler();
      } catch {}
    };
    window.resumeBattleHeader = () => {
      try {
        startScheduler();
        view.controller.timerControls.resumeTimer();
      } catch {}
    };
  } catch {}
}

export default setupTestHelpers;
