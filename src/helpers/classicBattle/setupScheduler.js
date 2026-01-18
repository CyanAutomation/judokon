/**
 * @fileoverview Initialize animation scheduler for Classic Battle mode.
 *
 * **Purpose:**
 * Manages the global requestAnimationFrame-based scheduler for continuous
 * animations in Classic Battle. The scheduler provides frame-based timing
 * for UI transitions, timer displays, scoreboard animations, and header
 * orientation updates.
 *
 * **Lifecycle Management:**
 * - Starts scheduler during battle initialization
 * - Registers `pagehide` cleanup handler (one-time)
 * - Implements visibility handling to pause/resume on tab switching
 *
 * **Test Environment Detection:**
 * Prevents scheduler activation during unit tests via multiple guards:
 * - `globalThis.__TEST__`, `__VITEST__`, `__PLAYWRIGHT__`, `__PLAYWRIGHT_TEST__` flags
 * - `process.env.VITEST` indicator
 * - `isTestModeEnabled()` flag from test mode utilities
 * - `requestAnimationFrame` availability check
 *
 * **Integration:**
 * Called by battle initialization in `initClassicBattle()` and related
 * setup functions. Not in hot paths—only invoked once per battle session.
 *
 * @module helpers/classicBattle/setupScheduler
 */

import {
  start as startScheduler,
  stop as stopScheduler,
  pause,
  resume
} from "../../utils/scheduler.js";
import { isTestModeEnabled } from "../testModeUtils.js";

/**
 * @summary Start the animation scheduler for the battle view.
 *
 * @pseudocode
 * 1. If running under tests or `requestAnimationFrame` is unavailable, exit early.
 * 2. Otherwise start the scheduler and stop it on `pagehide`.
 * 3. Add visibilitychange listener to pause/resume.
 * @returns {void}
 */
export function setupScheduler() {
  const hasGlobalTestFlag = Boolean(
    typeof globalThis !== "undefined" &&
      (globalThis.__TEST__ ||
        globalThis.__VITEST__ ||
        globalThis.__PLAYWRIGHT__ ||
        globalThis.__PLAYWRIGHT_TEST__)
  );
  const hasVitestEnv = Boolean(typeof process !== "undefined" && process.env?.VITEST);
  const hasTestMode = typeof isTestModeEnabled === "function" && isTestModeEnabled();

  if (hasGlobalTestFlag || hasVitestEnv || hasTestMode || typeof requestAnimationFrame !== "function") {
    return;
  }

  startScheduler();
  window.addEventListener("pagehide", stopScheduler, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
    } else {
      resume();
    }
  });
}

export default setupScheduler;
