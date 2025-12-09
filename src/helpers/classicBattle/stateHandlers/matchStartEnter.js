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
    console.log("[matchStartEnter] ENTERING matchStartEnter handler");

    if (!machine || typeof machine.dispatch !== "function") {
      console.log("[matchStartEnter] Invalid machine context:", {
        hasMachine: !!machine,
        hasDispatch: machine?.dispatch ? "yes" : "no"
      });
      debugLog("matchStartEnter: invalid machine context");
      return;
    }

    const store = machine?.context?.store ?? {};
    console.log("[matchStartEnter] Store context:", {
      winTarget: store.winTarget,
      firstPlayer: store.firstPlayer
    });

    emitBattleEvent("matchStart", {
      winTarget: store.winTarget,
      firstPlayer: store.firstPlayer,
      timestamp: Date.now()
    });
    console.log("[matchStartEnter] emitted matchStart event");

    console.log("[matchStartEnter] about to dispatch 'ready' event");
    const dispatchResult = await machine.dispatch("ready", { initial: true });
    console.log("[matchStartEnter] machine.dispatch('ready') returned:", dispatchResult);

    if (!dispatchResult) {
      debugLog("matchStartEnter: dispatch('ready') returned false");
    }
  } catch (error) {
    console.log("[matchStartEnter] CAUGHT ERROR:", error);
    debugLog("matchStartEnter: error during dispatch", error);
    reportSentryError(error, {
      contexts: { location: "matchStartEnter" }
    });
  }
}

export default matchStartEnter;
