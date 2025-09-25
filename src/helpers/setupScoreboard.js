import * as scoreboardModule from "../components/Scoreboard.js";
import { realScheduler } from "./scheduler.js";

let sharedScoreboardModule = null;

try {
  sharedScoreboardModule = await import("../components/Scoreboard.js");
} catch {
  sharedScoreboardModule = null;
}

const invokeSharedHelper = (name, args) => {
  const helper =
    sharedScoreboardModule && typeof sharedScoreboardModule[name] === "function"
      ? sharedScoreboardModule[name]
      : null;

  if (!helper) {
    return undefined;
  }

  try {
    return helper(...args);
  } catch {
    return undefined;
  }
};

const initScoreboard = (...args) => invokeSharedHelper("initScoreboard", args);
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
  if (!header) {
    init(null, controls);
  } else {
    init(header, controls);
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
const getScoreboardExport = (name) => {
  try {
    return scoreboardModule?.[name];
  } catch {
    return undefined;
  }
};

const scoreboardFunctions = {
  initScoreboard: getScoreboardExport("initScoreboard") ?? (() => {}),
  showMessage: getScoreboardExport("showMessage") ?? (() => {}),
  updateScore: getScoreboardExport("updateScore") ?? (() => {}),
  clearMessage: getScoreboardExport("clearMessage") ?? (() => {}),
  showTemporaryMessage: getScoreboardExport("showTemporaryMessage") ?? (() => {}),
  clearTimer: getScoreboardExport("clearTimer") ?? (() => {}),
  updateTimer: getScoreboardExport("updateTimer") ?? (() => {}),
  showAutoSelect: getScoreboardExport("showAutoSelect") ?? (() => {}),
  updateRoundCounter: getScoreboardExport("updateRoundCounter") ?? (() => {}),
  clearRoundCounter: getScoreboardExport("clearRoundCounter") ?? (() => {})
};

const {
  initScoreboard,
  showMessage,
  updateScore,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  updateTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
} = scoreboardFunctions;

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
  setupScoreboard,
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
