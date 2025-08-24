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

/**
 * Promise that resolves once the battle screen has fully initialized.
 *
 * @pseudocode
 * 1. Create a promise and capture its resolve callback.
 * 2. Add a one-time listener for `battle:init` that resolves the promise.
 * 3. Expose the promise globally via `window.battleReadyPromise`.
 */
let resolveReady;
export const battleReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

document.addEventListener(
  "battle:init",
  () => {
    resolveReady();
  },
  { once: true }
);

if (typeof window !== "undefined") {
  window.battleReadyPromise = battleReadyPromise;
}

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
