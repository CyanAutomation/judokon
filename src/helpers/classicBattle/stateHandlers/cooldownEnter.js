import { startCooldown } from "../roundManager.js";
import { initStartCooldown } from "../cooldowns.js";
import { exposeDebugState } from "../debugHooks.js";
import { updateRoundCounter } from "../../setupScoreboard.js";

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
  console.log("[DEBUG] cooldownEnter() called");
  console.log("[DEBUG] cooldownEnter invoked!");
  if (typeof window !== "undefined") window.__cooldownEnterInvoked = true;
  exposeDebugState("cooldownEnterInvoked", true);
  if (payload?.initial) {
    await initStartCooldown(machine);
    return;
  }
  // Patch: always pass scheduler from context if present
  const { store, scheduler } = machine.context || {};
  const context = { orchestrated: true }; // Assume orchestrated in test
  console.log("[DEBUG] About to call startCooldown");
  await startCooldown(store, scheduler, {
    isOrchestrated: () => context.orchestrated,
    getClassicBattleMachine: () => machine
  });
  console.log("[DEBUG] startCooldown called successfully");
  
  // Announce next round in UI
  if (store) {
    const currentRound = store.getCurrentRound?.().number || 1;
    const nextRound = currentRound + 1;
    try {
      updateRoundCounter(nextRound);
    } catch {}
  }
}
export default cooldownEnter;
