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

let isSchedulerWired = false;

function visibilityHandler() {
  if (document.hidden) {
    pause();
  } else {
    resume();
  }
}

function teardownScheduler() {
  if (!isSchedulerWired) {
    return;
  }

  document.removeEventListener("visibilitychange", visibilityHandler);
  window.removeEventListener("pagehide", teardownScheduler);
  stopScheduler();
  isSchedulerWired = false;
}

/**
 * @summary Decide whether the animation scheduler should start.
 *
 * @pseudocode
 * 1. Read the global test flags from `globals`.
 * 2. Read the Vitest environment indicator from `env`.
 * 3. Return false if any test flag is set, test mode is enabled, or RAF is missing.
 * 4. Otherwise return true.
 * @param {object} params
 * @param {object} [params.env] - Environment variables (e.g. process.env).
 * @param {object} [params.globals] - Global flags (e.g. globalThis).
 * @param {boolean} params.testModeEnabled - Whether test mode is enabled.
 * @param {boolean} params.hasRAF - Whether requestAnimationFrame is available.
 * @returns {boolean}
 */
export function shouldStartScheduler({ env, globals, testModeEnabled, hasRAF }) {
  const hasGlobalTestFlag = Boolean(
    globals &&
      (globals.__TEST__ ||
        globals.__VITEST__ ||
        globals.__PLAYWRIGHT__ ||
        globals.__PLAYWRIGHT_TEST__)
  );
  const hasVitestEnv = Boolean(env?.VITEST);

  return !(hasGlobalTestFlag || hasVitestEnv || testModeEnabled || !hasRAF);
}

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
  const globals = typeof globalThis !== "undefined" ? globalThis : undefined;
  const env = typeof process !== "undefined" ? process.env : undefined;
  let hasTestMode = false;
  try {
    hasTestMode = typeof isTestModeEnabled === "function" && isTestModeEnabled();
  } catch {
    // isTestModeEnabled not available or failed, continue with false
  }
  const hasRAF = typeof requestAnimationFrame === "function";

  if (!shouldStartScheduler({ env, globals, testModeEnabled: hasTestMode, hasRAF })) {
    return;
  }

  if (isSchedulerWired) {
    return;
  }

  startScheduler();
  isSchedulerWired = true;
  window.addEventListener("pagehide", teardownScheduler, { once: true });
  document.addEventListener("visibilitychange", visibilityHandler);
}

export default setupScheduler;
