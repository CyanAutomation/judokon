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
    console.log("[matchStartEnter] ENTERING handler");
    
    if (!machine || typeof machine.dispatch !== "function") {
      console.log("[matchStartEnter] EARLY RETURN: invalid machine context");
      debugLog("matchStartEnter: invalid machine context");
      return;
    }

    const store = machine?.context?.store ?? {};
    console.log("[matchStartEnter] Store context:", {
      hasStore: !!store,
      winTarget: store.winTarget,
      firstPlayer: store.firstPlayer
    });

    // Note: winTarget and firstPlayer may not be set yet; that's OK
    // The onEnter handler just needs to emit the event
    // The actual values will be populated by other handlers

    console.log("[matchStartEnter] About to emit matchStart and readyForCooldown events");

    emitBattleEvent("matchStart", {
      winTarget: store.winTarget,
      firstPlayer: store.firstPlayer,
      timestamp: Date.now()
    });

    console.log("[matchStartEnter] Emitted matchStart, about to emit readyForCooldown");

    // Emit readyForCooldown event; orchestrator will dispatch "ready" from outside this context
    // This avoids nested dispatch calls which cause deadlock
    emitBattleEvent("readyForCooldown", { initial: true });

    console.log("[matchStartEnter] Successfully emitted readyForCooldown event");
  } catch (error) {
    debugLog("matchStartEnter: error during initialization", error);
    reportSentryError(error, {
      contexts: { location: "matchStartEnter" }
    });
  }
}
