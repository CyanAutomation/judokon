import { emitBattleEvent } from "./battleEvents.js";
import { guard, guardAsync } from "./guard.js";

/**
 * Handle round-related errors in a consistent manner.
 *
 * @param {object} machine
 * @param {string} reason
 * @param {Error} err
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Show a generic round error message.
 * 2. Update the debug panel.
 * 3. Dispatch `interrupt` with the reason and error message.
 */
export async function handleRoundError(machine, reason, err) {
  guard(() => emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…"));
  guard(() => emitBattleEvent("debugPanelUpdate"));
  await guardAsync(() => machine.dispatch("interrupt", { reason, error: err?.message }));
}
