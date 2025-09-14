/**
 * Node.js events shim for adjusting max listeners in Vitest/Node only.
 *
 * This module intentionally lives outside classicBattle hot paths so dynamic
 * imports here do not violate hot-path import policy.
 *
 * @param {EventTarget} target
 * @returns {void}
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

