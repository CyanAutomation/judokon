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
import { debugLog } from "../debugLog.js";
import { reportSentryError } from "./sentryReporter.js";
import { createComponentLogger } from "../debugLogger.js";

const stateLogger = createComponentLogger("RoundDecision");

/**
 * onEnter handler for the `roundDecision` state.
 *
 * Compares the selected stat and determines the round outcome.
 * Handles immediate resolution if selection exists, or waits for player choice.
 * Implements timeout safety and error recovery.
 *
 * @param {import("../stateManager.js").ClassicBattleStateManager} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Validate machine and store parameters.
 * 2. Emit roundDecision event with player choice data.
 * 3. Set up selection resolution guard and cancel function.
 * 4. Attempt immediate resolution if selection exists.
 * 5. Fall back to awaiting player choice if needed.
 * 6. Schedule post-resolve watchdog for timeout safety.
 * 7. On timeout: interrupt with noSelection reason.
 * 8. On other errors: capture to Sentry and use standard error handling.
 */
export async function roundDecisionEnter(machine) {
  try {
    if (!machine || typeof machine.dispatch !== "function") {
      debugLog("roundDecisionEnter: invalid machine context");
      stateLogger.warn("Invalid machine context");
      return;
    }

    const store = machine?.context?.store;
    if (!store) {
      debugLog("roundDecisionEnter: missing store context");
      stateLogger.warn("Missing store context");
      return;
    }

    stateLogger.debug("Handler invoked", {
      playerChoice: store?.playerChoice
    });
    recordEntry();

    emitBattleEvent("roundDecision", {
      playerChoice: store.playerChoice,
      timestamp: Date.now()
    });

    const cancel = guardSelectionResolution(store, machine);
    let guardCanceled = false;
    const cancelGuardOnce = () => {
      if (guardCanceled) return;
      guardCanceled = true;
      cancel();
    };
    try {
      let resolved = await resolveSelectionIfPresent(store);
      if (!resolved) {
        cancelGuardOnce();
        await awaitPlayerChoice(store);
        resolved = await resolveSelectionIfPresent(store);
        if (!resolved) {
          stateLogger.warn("No player choice resolved after awaitPlayerChoice", {
            playerChoice: store?.playerChoice
          });
          cancelGuardOnce();
          guard(() =>
            emitBattleEvent("scoreboardShowMessage", "No selection detected. Interrupting round.")
          );
          guard(() => emitBattleEvent("debugPanelUpdate"));
          await guardAsync(() => machine.dispatch("interrupt", { reason: "noSelection" }));
          return;
        }
      }
      cancelGuardOnce();
      schedulePostResolveWatchdog(machine);
    } catch (err) {
      cancelGuardOnce();

      reportSentryError(err, {
        contexts: {
          location: "roundDecisionEnter",
          round: { playerChoice: store.playerChoice }
        },
        level: err?.code === "ROUND_DECISION_TIMEOUT" ? "info" : "error"
      });

      if (err?.code === "ROUND_DECISION_TIMEOUT" || err?.message === "timeout") {
        guard(() =>
          emitBattleEvent("scoreboardShowMessage", "No selection detected. Interrupting round.")
        );
        guard(() => emitBattleEvent("debugPanelUpdate"));
        await guardAsync(() => machine.dispatch("interrupt", { reason: "noSelection" }));
      } else {
        await handleRoundError(machine, "roundResolutionError", err);
      }
    }
  } catch (error) {
    reportSentryError(error, {
      contexts: { location: "roundDecisionEnter" }
    });
  }
}

export default roundDecisionEnter;
