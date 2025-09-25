import { realScheduler } from "./scheduler.js";

let sharedScoreboardModule = null;
let externalScoreboardGetter = null;

try {
  sharedScoreboardModule = await import("../components/Scoreboard.js");
} catch {
  sharedScoreboardModule = null;
}

try {
  if (typeof window !== "undefined" && typeof window.getScoreboardMethod === "function") {
    externalScoreboardGetter = window.getScoreboardMethod;
  }
} catch {}

/**
 * Retrieve a scoreboard helper method by name.
 *
 * @pseudocode
 * 1. Verify the shared module exists and exposes the requested method.
 * 2. Return the method when available; otherwise return null.
 *
 * @param {string} name - The helper method name to retrieve.
 * @returns {Function|null} The requested helper or null when unavailable.
 */
function getScoreboardMethod(name) {
  const directMethod =
    sharedScoreboardModule && typeof sharedScoreboardModule[name] === "function"
      ? sharedScoreboardModule[name]
      : null;

  if (directMethod) {
    return directMethod;
  }

  const resolveFromGetter = (getter) => {
    if (typeof getter !== "function") {
      return null;
    }

    try {
      const resolved = getter(name);
      return typeof resolved === "function" ? resolved : null;
    } catch {
      return null;
    }
  };

  const externalResolved = resolveFromGetter(externalScoreboardGetter);
  if (externalResolved) {
    return externalResolved;
  }

  try {
    if (typeof window !== "undefined") {
      const globalGetter = window.getScoreboardMethod;
      if (
        globalGetter &&
        globalGetter !== getScoreboardMethod &&
        globalGetter !== externalScoreboardGetter
      ) {
        const resolved = resolveFromGetter(globalGetter);
        if (resolved) {
          return resolved;
        }
      }
    }
  } catch {}

  return null;
}

try {
  if (typeof window !== "undefined" && typeof window.getScoreboardMethod !== "function") {
    window.getScoreboardMethod = getScoreboardMethod;
  }
} catch {}

const invokeSharedHelper = (name, args) => {
  const helper = getScoreboardMethod(name);

  if (typeof helper !== "function") {
    return undefined;
  }

  try {
    return helper(...args);
  } catch {
    return undefined;
  }
};

const showMessage = (...args) => invokeSharedHelper("showMessage", args);
const updateScore = (...args) => invokeSharedHelper("updateScore", args);
const clearMessage = (...args) => invokeSharedHelper("clearMessage", args);
const showTemporaryMessage = (...args) => invokeSharedHelper("showTemporaryMessage", args);
const clearTimer = (...args) => invokeSharedHelper("clearTimer", args);
const updateTimer = (...args) => invokeSharedHelper("updateTimer", args);
const showAutoSelect = (...args) => invokeSharedHelper("showAutoSelect", args);
const updateRoundCounter = (...args) => invokeSharedHelper("updateRoundCounter", args);
const clearRoundCounter = (...args) => invokeSharedHelper("clearRoundCounter", args);

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
  const header = document.querySelector("header");
  controls.scheduler = scheduler;
  const init = getScoreboardMethod("initScoreboard");
  if (typeof init === "function") {
    if (!header) {
      init(null, controls);
    } else {
      init(header, controls);
    }
  }

  // Handle visibility changes for timer pause/resume
  try {
    const handleVisibilityChange = () => {
      if (document.hidden && controls.pauseTimer) {
        controls.pauseTimer();
      }
    };

    const handleFocus = () => {
      if (!document.hidden && controls.resumeTimer) {
        controls.resumeTimer();
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

const scoreboardApi = {
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

export {
  showMessage,
  updateScore,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  updateTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter,
  scoreboardApi as scoreboard
};
