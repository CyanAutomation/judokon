import {
  initScoreboard as initScoreboardImpl,
  showMessage as showMessageImpl,
  updateScore as updateScoreImpl,
  clearMessage as clearMessageImpl,
  showTemporaryMessage as showTemporaryMessageImpl,
  clearTimer as clearTimerImpl,
  updateTimer as updateTimerImpl,
  showAutoSelect as showAutoSelectImpl,
  updateRoundCounter as updateRoundCounterImpl,
  clearRoundCounter as clearRoundCounterImpl
} from "../components/Scoreboard.js";
import { realScheduler } from "./scheduler.js";

const noop = () => {};
const domAvailable =
  typeof window !== "undefined" && typeof document !== "undefined" && document !== null;
const isTestEnv = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
const loggedWarnings = new Set();
const loggedErrors = new Set();

/**
 * Log a warning or error exactly once when outside of the test environment.
 *
 * @param {Set<string>} cache - Storage for previously emitted messages.
 * @param {"warn"|"error"} level - Console method to use.
 * @param {string} message - Message to emit.
 * @param {unknown} [error] - Optional error to append.
 * @returns {void}
 */
function logOnce(cache, level, message, error) {
  if (isTestEnv || cache.has(message)) {
    return;
  }
  cache.add(message);
  try {
    const logger = typeof console !== "undefined" ? console[level] : undefined;
    if (typeof logger === "function") {
      if (typeof error !== "undefined") {
        logger(message, error);
      } else {
        logger(message);
      }
    }
  } catch {}
}

/**
 * Determine the fallback return value for a scoreboard helper.
 *
 * @param {string} name - Helper name.
 * @returns {unknown} fallback return value.
 */
function fallbackValue(name) {
  if (name === "showTemporaryMessage") {
    return noop;
  }
  return undefined;
}

/**
 * Safely execute a scoreboard helper, providing resilience and diagnostics.
 *
 * @param {string} name - Helper identifier.
 * @param {Function|undefined} helper - Helper implementation.
 * @param {unknown[]} args - Arguments for the helper.
 * @returns {unknown} Helper result or fallback value.
 */
function runHelper(name, helper, args) {
  if (!domAvailable) {
    logOnce(loggedWarnings, "warn", "[scoreboard] DOM unavailable; scoreboard helpers disabled.");
    return fallbackValue(name);
  }
  if (typeof helper !== "function") {
    logOnce(loggedWarnings, "warn", `[scoreboard] Missing helper "${name}".`);
    return fallbackValue(name);
  }
  try {
    return helper(...args);
  } catch (error) {
    logOnce(loggedErrors, "error", `[scoreboard] Helper "${name}" threw.`, error);
    return fallbackValue(name);
  }
}

/**
 * Locate the page header and initialize scoreboard element references.
 *
 * @pseudocode
 * 1. Locate the `<header>` element.
 * 2. Attach the scheduler to `controls` and pass both to `initScoreboard()` so
 *    the module can query its children.
 *
 * @param {object} controls - Timer control callbacks.
 * @param {object} [scheduler=realScheduler] - Timer scheduler.
 * @returns {void}
 */
export function setupScoreboard(controls, scheduler = realScheduler) {
  const safeControls = controls ?? {};
  safeControls.scheduler = scheduler;
  const headerTarget = domAvailable ? document.querySelector("header") : null;
  runHelper("initScoreboard", initScoreboardImpl, [headerTarget, safeControls]);

  if (!domAvailable) {
    return;
  }

  // Handle visibility changes for timer pause/resume
  try {
    const handleVisibilityChange = () => {
      if (document.hidden && safeControls.pauseTimer) {
        safeControls.pauseTimer();
      }
    };

    const handleFocus = () => {
      if (!document.hidden && safeControls.resumeTimer) {
        safeControls.resumeTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
  } catch {}

  try {
    // Passively reflect Next button readiness to the badge without announcements.
    const nextButton = document.getElementById("next-button");
    const badge = document.getElementById("next-ready-badge");
    if (nextButton && badge) {
      const update = () => {
        const fromData = nextButton.getAttribute("data-next-ready");
        const isReadyAttr = fromData === "true" || fromData === true;
        const isReady = typeof fromData === "string" ? isReadyAttr : !nextButton.disabled;
        badge.hidden = !isReady;
      };
      update();
      const mo = new MutationObserver(() => update());
      mo.observe(nextButton, {
        attributes: true,
        attributeFilter: ["disabled", "data-next-ready", "aria-busy"]
      });
    }
  } catch {}
}

/**
 * Display a message on the shared scoreboard.
 *
 * @pseudocode
 * 1. Execute the scoreboard helper with resilience safeguards.
 * 2. Return the helper result (void).
 *
 * @param {...unknown} args - Arguments forwarded to the scoreboard helper.
 * @returns {void}
 */
export function showMessage(...args) {
  return runHelper("showMessage", showMessageImpl, args);
}

/**
 * Update the scoreboard score counters.
 *
 * @pseudocode
 * 1. Forward the score arguments to the scoreboard helper safely.
 * 2. Return the helper result (void).
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function updateScore(...args) {
  return runHelper("updateScore", updateScoreImpl, args);
}

/**
 * Clear any visible scoreboard message.
 *
 * @pseudocode
 * 1. Invoke the scoreboard helper with runtime safeguards.
 * 2. Return the helper result (void).
 *
 * @param {...unknown} args - Helper arguments (unused).
 * @returns {void}
 */
export function clearMessage(...args) {
  return runHelper("clearMessage", clearMessageImpl, args);
}

/**
 * Show a temporary scoreboard message and return a restore handler.
 *
 * @pseudocode
 * 1. Execute the helper; on failure, return a noop restore function.
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {() => void} Restore callback from the helper or a noop fallback.
 */
export function showTemporaryMessage(...args) {
  return runHelper("showTemporaryMessage", showTemporaryMessageImpl, args);
}

/**
 * Clear the scoreboard timer display.
 *
 * @pseudocode
 * 1. Forward the request to the scoreboard helper with safeguards.
 *
 * @param {...unknown} args - Helper arguments (unused).
 * @returns {void}
 */
export function clearTimer(...args) {
  return runHelper("clearTimer", clearTimerImpl, args);
}

/**
 * Update the scoreboard timer with the provided values.
 *
 * @pseudocode
 * 1. Call the scoreboard helper safely with the timer arguments.
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function updateTimer(...args) {
  return runHelper("updateTimer", updateTimerImpl, args);
}

/**
 * Highlight an auto-selected stat on the scoreboard.
 *
 * @pseudocode
 * 1. Delegate to the scoreboard helper with resilience handling.
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function showAutoSelect(...args) {
  return runHelper("showAutoSelect", showAutoSelectImpl, args);
}

/**
 * Update the scoreboard round counter.
 *
 * @pseudocode
 * 1. Execute the scoreboard helper with safeguards.
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function updateRoundCounter(...args) {
  return runHelper("updateRoundCounter", updateRoundCounterImpl, args);
}

/**
 * Clear the scoreboard round counter.
 *
 * @pseudocode
 * 1. Safely invoke the scoreboard helper to clear the display.
 *
 * @param {...unknown} args - Helper arguments (unused).
 * @returns {void}
 */
export function clearRoundCounter(...args) {
  return runHelper("clearRoundCounter", clearRoundCounterImpl, args);
}

export const scoreboard = {
  setupScoreboard,
  showMessage,
  updateScore,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  updateTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
};
