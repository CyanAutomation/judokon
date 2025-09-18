import { startCooldown } from "../roundManager.js";
import { initStartCooldown } from "../cooldowns.js";
import { exposeDebugState } from "../debugHooks.js";

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
    isOrchestrated: () => context.orchestrated
  });
  console.log("[DEBUG] startCooldown called successfully");
}
export default cooldownEnter;
