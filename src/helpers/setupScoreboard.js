import { realScheduler } from "./scheduler.js";
import logger from "./logger.js";
import * as scoreboardModule from "../components/Scoreboard.js";

const noop = () => {};
const domAvailable =
  typeof window !== "undefined" && typeof document !== "undefined" && document !== null;
/**
 * Expression for including the top safe area inset when computing header clearance.
 *
 * Using a constant keeps the calculation consistent between JavaScript and CSS.
 */
const SAFE_AREA_EXPRESSION = "env(safe-area-inset-top)";
const headerClearanceObserverKey = Symbol("headerClearanceObserver");
const loggedWarnings = new Set();
const loggedErrors = new Set();
const sharedScoreboardModule = scoreboardModule;
const visibilityListeners = {
  controls: undefined,
  handleVisibilityChange: undefined,
  handleFocus: undefined,
  attached: false,
  wasHidden: undefined
};
const queueableHelpers = new Set(["showMessage", "clearMessage"]);
let pendingShowMessageArgs = null;
let pendingClearMessageArgs = null;
let scoreboardInitialized = false;

/**
 * Determine whether a scoreboard helper invocation should be queued.
 *
 * @param {string} name - Helper identifier.
 * @returns {boolean} True when the call should be deferred.
 */
function shouldQueueScoreboardCall(name) {
  return domAvailable && !scoreboardInitialized && queueableHelpers.has(name);
}

/**
 * Enqueue a scoreboard helper invocation until the scoreboard initializes.
 *
 * @param {string} name - Helper identifier.
 * @param {unknown[]} args - Helper arguments.
 * @returns {boolean} True when the call was queued.
 */
function enqueueScoreboardCall(name, args) {
  if (!shouldQueueScoreboardCall(name)) {
    return false;
  }
  const clonedArgs = Array.isArray(args) ? [...args] : [];
  if (name === "showMessage") {
    pendingShowMessageArgs = clonedArgs;
    pendingClearMessageArgs = null;
    return true;
  }
  if (name === "clearMessage") {
    pendingClearMessageArgs = clonedArgs;
    pendingShowMessageArgs = null;
    return true;
  }
  return false;
}

/**
 * Flush queued scoreboard helper invocations now that the scoreboard is ready.
 *
 * @returns {void}
 */
function flushQueuedScoreboardCalls() {
  if (!domAvailable) {
    pendingShowMessageArgs = null;
    pendingClearMessageArgs = null;
    return;
  }
  if (pendingShowMessageArgs) {
    const args = pendingShowMessageArgs;
    pendingShowMessageArgs = null;
    pendingClearMessageArgs = null;
    runHelper("showMessage", getScoreboardMethod("showMessage"), args);
    return;
  }
  if (pendingClearMessageArgs) {
    const args = pendingClearMessageArgs;
    pendingClearMessageArgs = null;
    runHelper("clearMessage", getScoreboardMethod("clearMessage"), args);
  }
}

/**
 * Log a warning or error exactly once.
 *
 * @param {Set<string>} cache - Storage for previously emitted messages.
 * @param {"warn"|"error"} level - Console method to use.
 * @param {string} message - Message to emit.
 * @param {unknown} [error] - Optional error to append.
 * @returns {void}
 */
function logOnce(cache, level, message, error) {
  if (cache.has(message)) {
    return;
  }
  cache.add(message);
  try {
    const logFn = level === "warn" ? logger.warn : logger.error;
    if (typeof logFn === "function") {
      if (typeof error !== "undefined") {
        logFn(message, error);
      } else {
        logFn(message);
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
 * Retrieve a scoreboard helper method by name.
 *
 * @pseudocode
 * 1. Verify the shared module exposes the requested helper.
 * 2. Attempt to resolve the helper from the global getter when absent locally.
 * 3. Return undefined so `runHelper` can handle diagnostics and fallbacks.
 *
 * @param {string} name - The helper method name to retrieve.
 * @returns {Function|undefined} The requested helper or undefined when unavailable.
 */
function getScoreboardMethod(name) {
  const directMethod =
    sharedScoreboardModule && typeof sharedScoreboardModule[name] === "function"
      ? sharedScoreboardModule[name]
      : undefined;

  if (directMethod) {
    return directMethod;
  }

  try {
    if (typeof window !== "undefined") {
      const globalGetter = window.getScoreboardMethod;
      if (typeof globalGetter === "function" && globalGetter !== getScoreboardMethod) {
        const resolved = globalGetter(name);
        if (typeof resolved === "function") {
          return resolved;
        }
      }
    }
  } catch {}

  return undefined;
}

try {
  if (typeof window !== "undefined" && typeof window.getScoreboardMethod !== "function") {
    window.getScoreboardMethod = getScoreboardMethod;
  }
} catch {}

/**
 * Reflect the rendered header height in the nearest home screen container.
 *
 * @pseudocode
 * 1. Validate header element and resolve the nearest home screen container.
 * 2. Measure the header height and clamp it to half the viewport height.
 * 3. Apply the measurement to the home screen via a CSS custom property.
 * 4. Observe future size changes with ResizeObserver when available.
 * 5. Fall back to window resize events while retaining cleanup hooks.
 *
 * @param {HTMLElement|null} header - The page header element.
 * @returns {void}
 */
function observeHeaderClearance(header) {
  if (!header || typeof header.closest !== "function") {
    return;
  }

  const homeScreen = header.closest(".home-screen");
  if (!homeScreen) {
    return;
  }

  const applyClearance = createHeaderClearanceApplier(header, homeScreen);
  applyClearance();

  if (attachHeaderResizeObserver(header, applyClearance)) {
    return;
  }

  attachHeaderResizeFallback(header, applyClearance);
}

/**
 * Clamp a measured header height to a safe viewport-relative value.
 *
 * @param {number} height - The measured header height.
 * @returns {number} A non-negative, clamped clearance value.
 */
function clampHeaderClearance(height) {
  if (!Number.isFinite(height)) {
    return 0;
  }

  let clearance = Math.max(0, height);
  if (typeof window !== "undefined" && Number.isFinite(window.innerHeight)) {
    const maxClearance = window.innerHeight * 0.5;
    clearance = Math.min(clearance, maxClearance);
  }
  return clearance;
}

/**
 * Create a function that measures and applies header clearance styles.
 *
 * @param {HTMLElement} header - The observed header element.
 * @param {HTMLElement} homeScreen - The container that consumes the CSS variable.
 * @returns {() => void} Function that updates the header clearance variable.
 */
function createHeaderClearanceApplier(header, homeScreen) {
  return () => {
    try {
      const rect = header.getBoundingClientRect();
      if (!rect || !Number.isFinite(rect.height)) {
        return;
      }

      const clearance = clampHeaderClearance(rect.height);
      homeScreen.style.setProperty(
        "--header-clearance",
        `calc(${clearance.toFixed(2)}px + ${SAFE_AREA_EXPRESSION})`
      );
    } catch {}
  };
}

/**
 * Disconnect and clear any existing header clearance observer metadata.
 *
 * @param {HTMLElement} header - The header element that may be tracked.
 * @returns {void}
 */
function disconnectHeaderClearanceObserver(header) {
  const existingObserver = header[headerClearanceObserverKey];
  if (existingObserver && typeof existingObserver.disconnect === "function") {
    try {
      existingObserver.disconnect();
    } catch {}
  }
  delete header[headerClearanceObserverKey];
}

/**
 * Observe header size changes with ResizeObserver when available.
 *
 * @param {HTMLElement} header - The header element to monitor.
 * @param {() => void} applyClearance - Callback that updates the clearance styles.
 * @returns {boolean} True when the observer was attached successfully.
 */
function attachHeaderResizeObserver(header, applyClearance) {
  if (typeof ResizeObserver !== "function") {
    return false;
  }

  try {
    disconnectHeaderClearanceObserver(header);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === header) {
          applyClearance();
          break;
        }
      }
    });
    observer.observe(header);

    let cleanupObserver;

    const disconnect = () => {
      let cleanupError;
      if (cleanupObserver && typeof cleanupObserver.disconnect === "function") {
        try {
          cleanupObserver.disconnect();
        } catch (error) {
          cleanupError = error;
        }
      }
      try {
        observer.disconnect();
      } catch {}

      if (cleanupError) {
        throw cleanupError;
      } else {
        cleanupObserver = undefined;
        delete header[headerClearanceObserverKey];
      }
    };

    cleanupObserver = observeHeaderRemoval(header, disconnect);

    header[headerClearanceObserverKey] = { disconnect };
    return true;
  } catch {}

  return false;
}

/**
 * Attach a resize event fallback when ResizeObserver is unavailable.
 *
 * @param {HTMLElement} header - The header element to monitor.
 * @param {() => void} applyClearance - Callback that updates the clearance styles.
 * @returns {void}
 */
function attachHeaderResizeFallback(header, applyClearance) {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }

  try {
    disconnectHeaderClearanceObserver(header);

    const resizeHandler = () => {
      applyClearance();
    };
    const listenerOptions = { passive: true };
    window.addEventListener("resize", resizeHandler, listenerOptions);
    const cleanupObserver = observeHeaderRemoval(header, () => {
      try {
        window.removeEventListener("resize", resizeHandler, listenerOptions);
      } catch {}
      delete header[headerClearanceObserverKey];
    });

    header[headerClearanceObserverKey] = {
      disconnect: () => {
        if (cleanupObserver && typeof cleanupObserver.disconnect === "function") {
          try {
            cleanupObserver.disconnect();
          } catch {}
        }
        try {
          window.removeEventListener("resize", resizeHandler, listenerOptions);
        } catch {}
        delete header[headerClearanceObserverKey];
      }
    };
  } catch {}
}

/**
 * Observe DOM mutations to detect when the header is removed.
 *
 * @param {HTMLElement} header - The header being monitored.
 * @param {() => void} disconnect - Cleanup function invoked on removal.
 * @returns {MutationObserver|undefined} The observer used for cleanup.
 */
function observeHeaderRemoval(header, disconnect) {
  if (typeof MutationObserver !== "function") {
    return undefined;
  }

  try {
    const cleanupObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const removedNode of mutation.removedNodes) {
          if (
            removedNode === header ||
            (typeof removedNode.contains === "function" && removedNode.contains(header))
          ) {
            disconnect();
            return;
          }
        }
      }
    });
    const rootNode = typeof header.getRootNode === "function" ? header.getRootNode() : undefined;
    const container = (() => {
      if (rootNode && rootNode !== header) {
        if (rootNode.nodeType === 9 && rootNode.body) {
          return rootNode.body;
        }
        if (rootNode.nodeType === 1) {
          return rootNode;
        }
      }
      if (header.parentNode) {
        return header.parentNode;
      }
      if (typeof document !== "undefined" && document.body) {
        return document.body;
      }
      return undefined;
    })();

    if (container) {
      cleanupObserver.observe(container, { childList: true, subtree: true });
    }
    return cleanupObserver;
  } catch {}

  return undefined;
}

/**
 * Safely execute a scoreboard helper, providing resilience and diagnostics.
 *
 * @pseudocode
 * 1. If DOM unavailable, log warning and return fallback.
 * 2. If helper is available, execute it directly (don't queue).
 * 3. If helper is unavailable and scoreboard uninitialized, queue the call.
 * 4. If helper is unavailable and not queued, log and return fallback.
 * 5. Execute with error handling.
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
  // Queue eligible helpers until the scoreboard has initialized.
  if (enqueueScoreboardCall(name, args)) {
    return fallbackValue(name);
  }
  if (typeof helper !== "function") {
    // Helper not available; attempt to queue if scoreboard not yet initialized
    // Not queued and not available
    logOnce(loggedWarnings, "warn", `[scoreboard] Missing helper "${name}".`);
    return fallbackValue(name);
  }
  // Helper is available; execute it directly
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
 * 2. Resolve the scheduler dependency from direct arg or options object.
 * 3. Attach the scheduler to `controls` and pass both to `initScoreboard()`.
 *
 * @param {object} controls - Timer control callbacks.
 * @param {object} [schedulerOrOptions=realScheduler] - Timer scheduler or options with `scheduler`.
 * @returns {void}
 */
export function setupScoreboard(controls, schedulerOrOptions = realScheduler) {
  const safeControls = controls ?? {};
  const resolvedScheduler =
    schedulerOrOptions && typeof schedulerOrOptions.setTimeout === "function"
      ? schedulerOrOptions
      : (schedulerOrOptions?.scheduler ?? realScheduler);
  safeControls.scheduler = resolvedScheduler;
  const headerTarget = domAvailable ? document.querySelector("header") : null;
  runHelper("initScoreboard", getScoreboardMethod("initScoreboard"), [headerTarget, safeControls]);
  scoreboardInitialized = true;
  flushQueuedScoreboardCalls();

  if (!domAvailable) {
    return;
  }

  observeHeaderClearance(headerTarget);
  ensureVisibilityListeners(safeControls);
  reflectNextButtonReadiness();
}

/**
 * Ensure visibility and focus listeners are registered exactly once.
 *
 * @param {object} controls - Timer control callbacks.
 * @returns {void}
 */
function ensureVisibilityListeners(controls) {
  visibilityListeners.controls = controls;
  if (visibilityListeners.attached) {
    return;
  }

  visibilityListeners.wasHidden = Boolean(document.hidden);

  const handleVisibilityChange = () => {
    try {
      const active = visibilityListeners.controls;
      const wasHidden = visibilityListeners.wasHidden === true;
      const currentlyHidden = Boolean(document.hidden);

      if (currentlyHidden) {
        if (active && typeof active.pauseTimer === "function") {
          active.pauseTimer();
        }
      } else if (wasHidden && active && typeof active.resumeTimer === "function") {
        active.resumeTimer();
      }

      visibilityListeners.wasHidden = currentlyHidden;
    } catch {}
  };

  const handleFocus = () => {
    try {
      const active = visibilityListeners.controls;
      const shouldResume =
        !document.hidden &&
        visibilityListeners.wasHidden === true &&
        active &&
        typeof active.resumeTimer === "function";

      if (shouldResume) {
        active.resumeTimer();
        visibilityListeners.wasHidden = false;
      }
    } catch {}
  };

  try {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    visibilityListeners.handleVisibilityChange = handleVisibilityChange;
    visibilityListeners.handleFocus = handleFocus;
    visibilityListeners.attached = true;
  } catch {}
}

/**
 * Remove registered visibility and focus listeners.
 *
 * @returns {void}
 */
function detachVisibilityListeners() {
  if (!visibilityListeners.attached) {
    visibilityListeners.handleVisibilityChange = undefined;
    visibilityListeners.handleFocus = undefined;
    visibilityListeners.controls = undefined;
    visibilityListeners.attached = false;
    visibilityListeners.wasHidden = undefined;
    return;
  }

  try {
    if (visibilityListeners.handleVisibilityChange) {
      document.removeEventListener("visibilitychange", visibilityListeners.handleVisibilityChange);
    }
    if (visibilityListeners.handleFocus) {
      window.removeEventListener("focus", visibilityListeners.handleFocus);
    }
  } catch {}

  visibilityListeners.handleVisibilityChange = undefined;
  visibilityListeners.handleFocus = undefined;
  visibilityListeners.controls = undefined;
  visibilityListeners.attached = false;
  visibilityListeners.wasHidden = undefined;
}

/**
 * Synchronize the Next button readiness badge with the button state.
 *
 * @returns {void}
 */
function reflectNextButtonReadiness() {
  try {
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
 * Detach scoreboard lifecycle listeners and clear stored controls.
 *
 * @pseudocode
 * 1. Attempt to remove the visibility and focus listeners when attached.
 * 2. Reset cached listener references and active controls.
 * 3. Leave the module ready for a future `setupScoreboard` call.
 *
 * @returns {void}
 */
export function cleanupScoreboard() {
  visibilityListeners.controls = undefined;
  if (!domAvailable) {
    visibilityListeners.handleVisibilityChange = undefined;
    visibilityListeners.handleFocus = undefined;
    visibilityListeners.attached = false;
    return;
  }

  detachVisibilityListeners();
}

/**
 * Display a message on the shared scoreboard.
 *
 * @pseudocode
 * 1. Invoke `runHelper` with the helper name, implementation, and arguments.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Arguments forwarded to the scoreboard helper.
 * @returns {void}
 */
export function showMessage(...args) {
  return runHelper("showMessage", getScoreboardMethod("showMessage"), args);
}

/**
 * Update the scoreboard score counters.
 *
 * @pseudocode
 * 1. Pass the score update arguments through `runHelper` for safe execution.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function updateScore(...args) {
  return runHelper("updateScore", getScoreboardMethod("updateScore"), args);
}

/**
 * Clear any visible scoreboard message.
 *
 * @pseudocode
 * 1. Call `runHelper` to execute the clear message helper safely.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments (unused).
 * @returns {void}
 */
export function clearMessage(...args) {
  return runHelper("clearMessage", getScoreboardMethod("clearMessage"), args);
}

/**
 * Show a temporary scoreboard message and return a restore handler.
 *
 * @pseudocode
 * 1. Execute the temporary message helper through `runHelper`.
 * 2. Return the helper's restore callback or the noop fallback when unavailable.
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {() => void} Restore callback from the helper or a noop fallback.
 */
export function showTemporaryMessage(...args) {
  return runHelper("showTemporaryMessage", getScoreboardMethod("showTemporaryMessage"), args);
}

/**
 * Clear the scoreboard timer display.
 *
 * @pseudocode
 * 1. Use `runHelper` to forward the clear timer request safely.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments (unused).
 * @returns {void}
 */
export function clearTimer(...args) {
  return runHelper("clearTimer", getScoreboardMethod("clearTimer"), args);
}

/**
 * Update the scoreboard timer with the provided values.
 *
 * @pseudocode
 * 1. Forward the timer arguments through `runHelper` for guarded execution.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function updateTimer(...args) {
  return runHelper("updateTimer", getScoreboardMethod("updateTimer"), args);
}

/**
 * Highlight an auto-selected stat on the scoreboard.
 *
 * @pseudocode
 * 1. Delegate to the helper via `runHelper` to highlight the auto-selected stat.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function showAutoSelect(...args) {
  return runHelper("showAutoSelect", getScoreboardMethod("showAutoSelect"), args);
}

/**
 * Update the scoreboard round counter.
 *
 * @pseudocode
 * 1. Route the round counter update through `runHelper` safely.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments.
 * @returns {void}
 */
export function updateRoundCounter(...args) {
  return runHelper("updateRoundCounter", getScoreboardMethod("updateRoundCounter"), args);
}

/**
 * Clear the scoreboard round counter.
 *
 * @pseudocode
 * 1. Use `runHelper` to safely invoke the round counter clearing helper.
 * 2. Return the result produced by `runHelper` (void in normal operation).
 *
 * @param {...unknown} args - Helper arguments (unused).
 * @returns {void}
 */
export function clearRoundCounter(...args) {
  return runHelper("clearRoundCounter", getScoreboardMethod("clearRoundCounter"), args);
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
