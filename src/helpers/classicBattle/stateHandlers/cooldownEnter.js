import { startCooldown } from "../roundManager.js";
import { initStartCooldown } from "../cooldowns.js";

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
  try {
    if (typeof console !== "undefined")
      console.log("[TEST DEBUG] cooldownEnter invoked, payload:", payload);
  } catch {}
  if (payload?.initial) {
    await initStartCooldown(machine);
    return;
  }
  // Patch: always pass scheduler from context if present
  const { store, scheduler } = machine.context || {};
  await startCooldown(store, scheduler);
}
export default cooldownEnter;
