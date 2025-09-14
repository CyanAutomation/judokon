/**
 * Node.js events shim for adjusting max listeners in Vitest/Node only.
 *
 * This module intentionally lives outside classicBattle hot paths so dynamic
 * imports here do not violate hot-path import policy.
 *
 * @param {EventTarget} target event target whose listener limit should be removed
 * @returns {Promise<void>} resolves once the listener limit is removed in Node environments
 * @pseudocode
 * if not running under Vitest or no target: return
 * import events module dynamically
 * if module exposes setMaxListeners: call setMaxListeners(0, target)
 */
export async function setMaxListenersIfNode(target) {
  try {
    const isVitest = typeof process !== "undefined" && !!process.env?.VITEST;
    if (!isVitest || !target) return;
    const events = await import("events");
    if (typeof events.setMaxListeners === "function") {
      events.setMaxListeners(0, target);
    }
  } catch {}
}
