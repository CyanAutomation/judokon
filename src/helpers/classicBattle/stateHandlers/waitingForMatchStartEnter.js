import { emitBattleEvent } from "../battleEvents.js";
import isStateTransition from "../isStateTransition.js";

/**
 * onEnter handler for `waitingForMatchStart`.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Skip if re-entering the same state.
 * 2. Invoke `doResetGame` from context when available.
 * 3. Clear scoreboard message and refresh debug panel.
 * 4. Import scoreboard/debug helpers to ensure initialization.
 */
export async function waitingForMatchStartEnter(machine) {
  if (isStateTransition("waitingForMatchStart", "waitingForMatchStart")) return;
  const { doResetGame } = machine.context;
  if (typeof doResetGame === "function") doResetGame();
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  try {
    const scoreboard = await import("../../setupScoreboard.js");
    scoreboard.clearMessage?.();
  } catch {}
  try {
    const helpers = await import("../debugPanel.js");
    helpers.updateDebugPanel?.();
  } catch {}
}

export default waitingForMatchStartEnter;
