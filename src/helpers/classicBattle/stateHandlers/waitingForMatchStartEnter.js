import { emitBattleEvent } from "../battleEvents.js";
import isStateTransition from "../isStateTransition.js";
import * as scoreboard from "../../setupScoreboard.js";
import { updateDebugPanel } from "../debugPanel.js";

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
    scoreboard.clearMessage?.();
  } catch {}
  try {
    updateDebugPanel?.();
  } catch {}
}

export default waitingForMatchStartEnter;
