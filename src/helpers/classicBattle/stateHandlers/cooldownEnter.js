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
  if (payload?.initial) {
    return initStartCooldown(machine);
  }
  startCooldown(machine.context.store);
}

export default cooldownEnter;
