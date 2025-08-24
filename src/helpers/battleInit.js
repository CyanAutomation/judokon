/**
 * Track battle page readiness and signal when complete.
 *
 * @pseudocode
 * 1. Maintain a set of completed parts.
 * 2. When a part is marked ready, add it to the set.
 * 3. If both "home" and "state" are ready:
 *    a. Set `data-ready="true"` on the `.home-screen` root (fallback to `document.body`).
 *    b. Dispatch a `battle:init` event on `document`.
 *
 * @param {"home"|"state"} part - The portion of the page that finished initializing.
 * @returns {void}
 */
const readyParts = new Set();
export function markBattlePartReady(part) {
  readyParts.add(part);
  if (readyParts.has("home") && readyParts.has("state")) {
    const root = document.querySelector(".home-screen") || document.body;
    if (root && root.dataset.ready !== "true") {
      root.dataset.ready = "true";
      document.dispatchEvent(new CustomEvent("battle:init"));
    }
  }
}
