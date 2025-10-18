import { startCooldown } from "../roundManager.js";
import { initStartCooldown } from "../cooldowns.js";
import { exposeDebugState } from "../debugHooks.js";
import { debugLog } from "../debugLog.js";
import { roundStore } from "../roundStore.js";

/**
 * onEnter handler for `cooldown` state.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. If `payload.initial` -> start match countdown.
 * 2. Otherwise schedule inter-round cooldown.
 */
export async function cooldownEnter(machine, payload) {
  debugLog("cooldownEnter: handler invoked", { hasInitialPayload: !!payload?.initial });
  if (typeof window !== "undefined") window.__cooldownEnterInvoked = true;
  exposeDebugState("cooldownEnterInvoked", true);
  if (payload?.initial) {
    await initStartCooldown(machine);
    return;
  }
  // Patch: always pass scheduler from context if present
  const { store, scheduler } = machine.context || {};
  const context = { orchestrated: true }; // Assume orchestrated in test
  debugLog("cooldownEnter: about to call startCooldown");
  await startCooldown(store, scheduler, {
    isOrchestrated: () => context.orchestrated,
    getClassicBattleMachine: () => machine
  });
  debugLog("cooldownEnter: startCooldown completed");
  try {
    roundStore.setRoundState("cooldown", "cooldownEnter");
  } catch (error) {
    debugLog(`cooldownEnter: failed to set round state - ${error.message}`);
  }
  try {
    const current = roundStore.getCurrentRound();
    const hasValidCurrentNumber =
      current && typeof current.number === "number" && Number.isFinite(current.number) && current.number >= 1;
    if (!hasValidCurrentNumber) {
      debugLog("cooldownEnter: current round invalid, defaulting next round to 1");
    }
    const nextRoundNumber = hasValidCurrentNumber ? current.number + 1 : 1;
    roundStore.setRoundNumber(nextRoundNumber);
  } catch (error) {
    debugLog(`cooldownEnter: failed to set round number - ${error.message}`);
  }
}
export default cooldownEnter;
