import { emitBattleEvent } from "../battleEvents.js";
import { debugLog } from "../debugLog.js";
import { reportSentryError } from "./sentryReporter.js";

/**
 * onEnter handler for the `matchStart` state.
 *
 * Initializes match context, stores player win target selection, resets scores,
 * and designates the user as the first player. Emits matchStart event and
 * transitions to cooldown for round preparation.
 *
 * @param {import("../stateManager.js").ClassicBattleStateManager} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Validate machine parameter has required dispatch method.
 * 2. Extract match configuration from store (win target, scores, first player).
 * 3. Emit `matchStart` event with initialization detail for UI and analytics.
 * 4. Dispatch `ready` with `{ initial: true }` to transition to cooldown.
 * 5. Capture errors to Sentry for observability.
 */
export async function matchStartEnter(machine) {
  try {
    if (!machine || typeof machine.dispatch !== "function") {
      debugLog("matchStartEnter: invalid machine context");
      return;
    }

    const store = machine?.context?.store ?? {};

    // Emit matchStart event for UI/analytics
    debugLog("matchStartEnter: emitting matchStart event");
    emitBattleEvent("matchStart", {
      winTarget: store.winTarget,
      firstPlayer: store.firstPlayer,
      timestamp: Date.now()
    });

    // Emit the readyForCooldown event to signal the orchestrator to dispatch ready
    emitBattleEvent("readyForCooldown", { initial: true });
  } catch (error) {
    reportSentryError(error, {
      contexts: { location: "matchStartEnter" }
    });
  }
}

