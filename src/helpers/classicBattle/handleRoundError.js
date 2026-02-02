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
 * 4. Dispatch deterministic fallback events for non-interruptible decision states.
 */
export async function handleRoundError(machine, reason, err) {
  guard(() => emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…"));
  guard(() => emitBattleEvent("debugPanelUpdate"));
  let currentState = null;
  if (typeof machine?.getState === "function") {
    try {
      currentState = machine.getState();
    } catch {
      currentState = null;
    }
  }
  if (!currentState) {
    return;
  }
  const interruptibleStates = new Set(["roundWait", "roundSelect"]);
  if (interruptibleStates.has(currentState)) {
    await guardAsync(() => machine.dispatch("interrupt", { reason, error: err?.message }));
    return;
  }
  if (currentState === "roundResolve") {
    await guardAsync(() =>
      machine.dispatch("outcome=draw", { reason: reason ?? "roundError", error: err?.message })
    );
    return;
  }
  if (currentState === "roundPrompt") {
    await guardAsync(() => machine.dispatch("cardsRevealed", { reason: reason ?? "roundError" }));
    return;
  }
}
