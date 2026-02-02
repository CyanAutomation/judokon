import { cancelRoundResolveGuard } from "./guardCancellation.js";

/**
 * onExit handler for `roundResolve` state.
 *
 * @pseudocode
 * 1. Cancel and clear any scheduled decision guard.
 *
 * @returns {Promise<void>}
 */
export async function roundResolveExit() {
  cancelRoundResolveGuard();
}
