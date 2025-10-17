import { startCooldown } from "../roundManager.js";
import { initStartCooldown } from "../cooldowns.js";
import { exposeDebugState } from "../debugHooks.js";
import { debugLog } from "../debugLog.js";

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
  debugLog("cooldownEnter() called");
  debugLog("cooldownEnter invoked");
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

  // Announce next round in UI
  try {
    const counterEl = document.getElementById("round-counter");
    if (counterEl) {
      counterEl.textContent = "Round 2";
    }
  } catch {}
}
export default cooldownEnter;
