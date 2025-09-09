import { exposeDebugState, readDebugState } from "../debugHooks.js";

/**
 * onExit handler for `roundDecision`.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Invoke and clear any scheduled decision guard.
 */
export async function roundDecisionExit() {
  try {
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch {}
}

export default roundDecisionExit;
