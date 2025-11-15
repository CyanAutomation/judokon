import { exposeDebugState, readDebugState } from "../debugHooks.js";
import { debugLog } from "../debugLog.js";

/**
 * Cancel the round decision guard to prevent duplicate selections.
 *
 * @pseudocode
 * 1. Read the round decision guard function from debug state.
 * 2. Invoke the guard if it's a function to trigger cleanup.
 * 3. Clear the guard from debug state.
 * 4. Log any errors that occur during cancellation.
 *
 * @returns {void}
 */
export function cancelRoundDecisionGuard() {
  try {
    // Read and invoke the guard function if present
    const guardFn = readDebugState("roundDecisionGuard");
    if (typeof guardFn === "function") {
      guardFn();
    }
    // Clear the guard from debug state
    exposeDebugState("roundDecisionGuard", null);
  } catch (err) {
    debugLog("Failed to cancel decision guard:", err);
  }
}
