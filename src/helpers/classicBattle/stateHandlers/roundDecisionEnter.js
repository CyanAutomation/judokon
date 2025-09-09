import {
  recordEntry,
  resolveSelectionIfPresent,
  awaitPlayerChoice,
  guardSelectionResolution,
  schedulePostResolveWatchdog
} from "./roundDecisionHelpers.js";
import { emitBattleEvent } from "../battleEvents.js";
import { guard, guardAsync } from "../guard.js";
import { handleRoundError } from "../handleRoundError.js";

/**
 * onEnter handler for `roundDecision` state.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * recordEntry()
 * cancel ← guardSelectionResolution(store, machine)
 * if !resolveSelectionIfPresent(store) → awaitPlayerChoice(store)
 * cancel()
 * schedulePostResolveWatchdog(machine)
 * on timeout → show "No selection" and interrupt
 * on other error → handleRoundError(`roundResolutionError`)
 */
export async function roundDecisionEnter(machine) {
  const { store } = machine.context;
  recordEntry();
  const cancel = guardSelectionResolution(store, machine);
  try {
    const resolved = await resolveSelectionIfPresent(store);
    if (!resolved) await awaitPlayerChoice(store);
    cancel();
    schedulePostResolveWatchdog(machine);
  } catch (err) {
    cancel();
    if (err?.message === "timeout") {
      guard(() =>
        emitBattleEvent("scoreboardShowMessage", "No selection detected. Interrupting round.")
      );
      guard(() => emitBattleEvent("debugPanelUpdate"));
      await guardAsync(() => machine.dispatch("interrupt", { reason: "noSelection" }));
    } else {
      await handleRoundError(machine, "roundResolutionError", err);
    }
  }
}

export default roundDecisionEnter;
