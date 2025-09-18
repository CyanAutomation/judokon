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
    if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
      globalThis.__classicBattleDebugExpose("cooldownEnterInvoked", true);
    }
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
