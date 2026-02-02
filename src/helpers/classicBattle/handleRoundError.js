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
 * 3. Dispatch `interrupt` with the reason and error message when in an interruptible state.
 */
export async function handleRoundError(machine, reason, err) {
  guard(() => emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…"));
  guard(() => emitBattleEvent("debugPanelUpdate"));
  const currentState = typeof machine?.getState === "function" ? machine.getState() : null;
  const interruptibleStates = new Set(["roundWait", "roundSelect"]);
  if (!interruptibleStates.has(currentState)) {
    return;
  }
  await guardAsync(() => machine.dispatch("interrupt", { reason, error: err?.message }));
}
