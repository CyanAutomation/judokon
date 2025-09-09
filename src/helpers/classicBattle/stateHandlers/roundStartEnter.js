import { setupFallbackTimer } from "../roundManager.js";
import { isTestModeEnabled } from "../../testModeUtils.js";
import { guard, guardAsync } from "../guard.js";
import { handleRoundError } from "../handleRoundError.js";

/**
 * onEnter handler for `roundStart` state.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Install test fallback to advance if stalled.
 * 2. Invoke round start routine from context.
 * 3. On failure -> clear fallback and handle round error.
 * 4. If still in `roundStart` -> dispatch `cardsRevealed`.
 */
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

export async function roundStartEnter(machine) {
  const fallback = installRoundStartFallback(machine);
  try {
    await Promise.resolve(invokeRoundStart(machine.context));
    guard(() => {
      if (fallback) clearTimeout(fallback);
    });
    await guardAsync(async () => {
      const state = machine.getState ? machine.getState() : null;
      if (state === "roundStart") await machine.dispatch("cardsRevealed");
    });
  } catch (err) {
    guard(() => {
      if (fallback) clearTimeout(fallback);
    });
    await handleRoundError(machine, "roundStartError", err);
  }
}

export default roundStartEnter;
