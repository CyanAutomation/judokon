import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";

/**
 * Start the animation scheduler for the battle view.
 *
 * @pseudocode
 * 1. Skip when running under Vitest.
 * 2. Start the scheduler and stop it on `pagehide`.
 */
export function setupScheduler() {
  if (!(typeof process !== "undefined" && process.env.VITEST)) {
    startScheduler();
    window.addEventListener("pagehide", stopScheduler, { once: true });
  }
}

export default setupScheduler;
