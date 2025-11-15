import { cancelRoundDecisionGuard } from "./guardCancellation.js";

/**
 * onExit handler for `roundDecision` state.
 *
 * @pseudocode
 * 1. Cancel and clear any scheduled decision guard.
 *
 * @returns {Promise<void>}
 */
export async function roundDecisionExit() {
  cancelRoundDecisionGuard();
}
