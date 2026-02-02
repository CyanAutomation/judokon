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
  const safeReason = reason ?? "roundError";
  const interruptibleStates = new Set(["roundWait", "roundSelect"]);
  const interruptPayload = { reason: safeReason, error: err?.message };
  const canDispatchEvent = (eventName) => {
    if (typeof machine?.getAvailableTransitions !== "function") return false;
    const available = machine.getAvailableTransitions() || [];
    return available.some((transition) => transition.event === eventName);
  };
  const dispatchIfAvailable = async (eventName, payload) => {
    if (!canDispatchEvent(eventName)) return false;
    await guardAsync(() => machine.dispatch(eventName, payload));
    return true;
  };
  if (interruptibleStates.has(currentState)) {
    await guardAsync(() => machine.dispatch("interrupt", interruptPayload));
    return;
  }
  if (currentState === "roundResolve") {
    await guardAsync(() =>
      machine.dispatch("outcome=draw", { reason: safeReason, error: err?.message })
    );
    return;
  }
  if (currentState === "roundPrompt") {
    if (safeReason === "roundStartError") {
      if (await dispatchIfAvailable("interrupt", interruptPayload)) {
        return;
      }
    }
    await guardAsync(() => machine.dispatch("cardsRevealed", { reason: safeReason }));
    return;
  }
  if (await dispatchIfAvailable("interrupt", interruptPayload)) {
    return;
  }
  if (await dispatchIfAvailable("error", interruptPayload)) {
    return;
  }
}
