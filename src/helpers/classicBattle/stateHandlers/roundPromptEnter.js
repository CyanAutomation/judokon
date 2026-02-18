import { setupFallbackTimer } from "../setupFallbackTimer.js";
import { isTestModeEnabled } from "../../testModeUtils.js";
import { guardAsync } from "../guard.js";
import { handleRoundError } from "../handleRoundError.js";
import { debugLog } from "../debugLog.js";

function installRoundPromptFallback(machine) {
  if (!isTestModeEnabled || !isTestModeEnabled()) return null;
  return setupFallbackTimer(50, () => {
    guardAsync(async () => {
      const state = machine.getState ? machine.getState() : null;
      if (state === "roundPrompt") await machine.dispatch("cardsRevealed");
    });
  });
}

function invokeRoundPrompt(ctx) {
  const { startRoundWrapper, doStartRound, store } = ctx;
  if (typeof startRoundWrapper === "function") return startRoundWrapper();
  if (typeof doStartRound === "function") return doStartRound(store);
  return Promise.resolve();
}

/**
 * onEnter handler for `roundPrompt` state.
 *
 * @pseudocode
 * 1. Install a test fallback timer if test mode is enabled.
 * 2. Invoke the round start routine from context.
 * 3. Clear fallback and handle errors via `handleRoundError`.
 * 4. If still in `roundPrompt`, dispatch `cardsRevealed`.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 */
export async function roundPromptEnter(machine) {
  debugLog("roundPromptEnter() called");
  const fallback = installRoundPromptFallback(machine);
  try {
    await invokeRoundPrompt(machine.context);
    if (fallback !== null && fallback !== undefined) clearTimeout(fallback);
    if (machine.getState() === "roundPrompt") {
      await machine.dispatch("cardsRevealed");
    }
  } catch (err) {
    if (fallback !== null && fallback !== undefined) clearTimeout(fallback);
    await handleRoundError(machine, "roundStartError", err);
  }
}

export default roundPromptEnter;
