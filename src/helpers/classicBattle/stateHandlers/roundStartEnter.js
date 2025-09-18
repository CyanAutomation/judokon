import { setupFallbackTimer } from "../roundManager.js";
import { isTestModeEnabled } from "../../testModeUtils.js";
import { guardAsync } from "../guard.js";
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
  const fallback = installRoundStartFallback(machine);
  try {
    await invokeRoundStart(machine.context);
    if (fallback) clearTimeout(fallback);
    if (machine.getState() === "roundStart") {
      await machine.dispatch("cardsRevealed");
    }
  } catch (err) {
    if (fallback) clearTimeout(fallback);
    await handleRoundError(machine, "roundStartError", err);
  }
}

export default roundStartEnter;
