import * as scoreboardComponents from "../components/Scoreboard.js";

const noop = () => {};

function getScoreboardMethod(name) {
  const method = scoreboardComponents[name];
  return typeof method === "function" ? method : noop;
}
import { realScheduler } from "./scheduler.js";

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
/**
 * Bundled scoreboard helper exports for scenarios that need a single entry point
 * (for example, unit tests mocking multiple helpers simultaneously).
 * Functions missing from the shared scoreboard module degrade to no-ops so tests
 * can safely mock a subset of helpers.
 *
 * @type {{
 *   setupScoreboard: typeof setupScoreboard
 * } & Record<string, (...args: any[]) => unknown>}
 *
 * @pseudocode
 * 1. Provide `setupScoreboard` directly from this module.
 * 2. Delegate helper lookups to `Scoreboard.js`, falling back to a no-op when a
 *    helper is not supplied by the mock.
 */
export const scoreboard = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "setupScoreboard") {
        return setupScoreboard;
      }
      if (typeof prop !== "string") {
        return Reflect.get(scoreboardComponents, prop);
      }
      return getScoreboardMethod(prop);
    }
  }
);

export * from "../components/Scoreboard.js";
