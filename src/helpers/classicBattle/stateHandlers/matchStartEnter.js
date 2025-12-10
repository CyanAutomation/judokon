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

    if (!store.winTarget || typeof store.firstPlayer === "undefined") {
      debugLog("matchStartEnter: incomplete store context", {
        winTarget: store.winTarget,
        firstPlayer: store.firstPlayer
      });
      return;
    }

    emitBattleEvent("matchStart", {
      winTarget: store.winTarget,
      firstPlayer: store.firstPlayer,
      timestamp: Date.now()
    });

    // Emit readyForCooldown event; orchestrator will dispatch "ready" from outside this context
    // This avoids nested dispatch calls which cause deadlock
    emitBattleEvent("readyForCooldown", { initial: true });
  } catch (error) {
    debugLog("matchStartEnter: error during initialization", error);
    reportSentryError(error, {
      contexts: { location: "matchStartEnter" }
    });
  }
}
