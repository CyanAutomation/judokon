import { setupFallbackTimer } from "../roundManager.js";
import { isTestModeEnabled } from "../../testModeUtils.js";
import { guard, guardAsync } from "../guard.js";
import { handleRoundError } from "../handleRoundError.js";

function installRoundStartFallback(machine) {
  if (!isTestModeEnabled || !isTestModeEnabled()) return null;
  return setupFallbackTimer(50, () => {
    guardAsync(async () => {
      const state = machine.getState ? machine.getState() : null;
      if (state === "roundStart") await machine.dispatch("cardsRevealed");
    });
  });
}

function invokeRoundStart(ctx) {
  const { startRoundWrapper, doStartRound, store } = ctx;
  if (typeof startRoundWrapper === "function") return startRoundWrapper();
  if (typeof doStartRound === "function") return doStartRound(store);
  return Promise.resolve();
}

/**
 * onEnter handler for `roundStart` state.
 *
 * @pseudocode
 * 1. Install a test fallback timer if test mode is enabled.
 * 2. Invoke the round start routine from context.
 * 3. Clear fallback and handle errors via `handleRoundError`.
 * 4. If still in `roundStart`, dispatch `cardsRevealed`.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 */
export async function roundStartEnter(machine) {
  try {
    await Promise.resolve(invokeRoundStart(machine.context));
    console.error("[TEST DEBUG] roundStartEnter: State before cardsRevealed dispatch:", machine.getState());
    await machine.dispatch("cardsRevealed");
  } catch (err) {
    await handleRoundError(machine, "roundStartError", err);
  }
}

export default roundStartEnter;
