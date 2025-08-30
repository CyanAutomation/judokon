import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";

/**
 * @summary Start the animation scheduler for the battle view.
 *
 * @pseudocode
 * 1. If `process.env.VITEST` is "true", exit early.
 * 2. Otherwise start the scheduler and stop it on `pagehide`.
 * @returns {void}
 */
export function setupScheduler() {
  if (!(typeof process !== "undefined" && process.env.VITEST === "true")) {
    startScheduler();
    window.addEventListener("pagehide", stopScheduler, { once: true });
  }
}

export default setupScheduler;
