import * as scoreboardModule from "../components/Scoreboard.js";
import { realScheduler } from "./scheduler.js";

const noop = () => {};

const scoreboardFunctionNames = [
  "initScoreboard",
  "showMessage",
  "updateScore",
  "clearMessage",
  "showTemporaryMessage",
  "clearTimer",
  "updateTimer",
  "showAutoSelect",
  "updateRoundCounter",
  "clearRoundCounter"
];

const missingScoreboardExports = [];

const scoreboardFunctions = {};
for (const name of scoreboardFunctionNames) {
  let candidate;
  try {
    candidate = scoreboardModule?.[name];
  } catch {
    candidate = undefined;
  }
  if (typeof candidate === "function") {
    scoreboardFunctions[name] = candidate;
  } else {
    scoreboardFunctions[name] = noop;
    missingScoreboardExports.push(name);
  }
}

if (
  missingScoreboardExports.length > 0 &&
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "development"
) {
  console.warn(
    "[setupScoreboard] Using fallback implementations for Scoreboard exports:",
    missingScoreboardExports.join(", ")
  );
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
  const header = document.querySelector("header");
  controls.scheduler = scheduler;
  if (!header) {
    scoreboardFunctions.initScoreboard(null, controls);
  } else {
    scoreboardFunctions.initScoreboard(header, controls);
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

/**
 * Forward the Scoreboard module's `showMessage` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `showMessage` with the provided arguments.
 *
 * @function
 */
export const showMessage = scoreboardFunctions.showMessage;

/**
 * Forward the Scoreboard module's `updateScore` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `updateScore` with the provided arguments.
 *
 * @function
 */
export const updateScore = scoreboardFunctions.updateScore;

/**
 * Forward the Scoreboard module's `clearMessage` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `clearMessage` with the provided arguments.
 *
 * @function
 */
export const clearMessage = scoreboardFunctions.clearMessage;

/**
 * Forward the Scoreboard module's `showTemporaryMessage` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `showTemporaryMessage` with the provided arguments.
 *
 * @function
 */
export const showTemporaryMessage = scoreboardFunctions.showTemporaryMessage;

/**
 * Forward the Scoreboard module's `clearTimer` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `clearTimer` with the provided arguments.
 *
 * @function
 */
export const clearTimer = scoreboardFunctions.clearTimer;

/**
 * Forward the Scoreboard module's `updateTimer` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `updateTimer` with the provided arguments.
 *
 * @function
 */
export const updateTimer = scoreboardFunctions.updateTimer;

/**
 * Forward the Scoreboard module's `showAutoSelect` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `showAutoSelect` with the provided arguments.
 *
 * @function
 */
export const showAutoSelect = scoreboardFunctions.showAutoSelect;

/**
 * Forward the Scoreboard module's `updateRoundCounter` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `updateRoundCounter` with the provided arguments.
 *
 * @function
 */
export const updateRoundCounter = scoreboardFunctions.updateRoundCounter;

/**
 * Forward the Scoreboard module's `clearRoundCounter` helper.
 *
 * @pseudocode
 * 1. Invoke the namespace export `clearRoundCounter` with the provided arguments.
 *
 * @function
 */
export const clearRoundCounter = scoreboardFunctions.clearRoundCounter;

/**
 * Aggregate the scoreboard helpers for consumers expecting an object export.
 *
 * @pseudocode
 * 1. Collect `setupScoreboard` and the forwarded helper functions in a single object.
 */
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

/**
 * Publicly exposed scoreboard helper bundle for convenience imports.
 *
 * @pseudocode
 * 1. Provide the composed scoreboard helper object to consumers.
 *
 * @type {typeof scoreboardApi}
 */
export const scoreboard = scoreboardApi;
