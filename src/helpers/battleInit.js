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

let resolveReady;
/**
 * Promise that resolves when the battle screen has fully initialized.
 *
 * @summary A promise consumers can await to know when the battle UI has finished
 * initializing (both 'home' and 'state' parts are ready).
 * @pseudocode
 * 1. Create a new Promise and store its `resolve` function in `resolveReady`.
 * 2. If `document` exists, add a 'battle:init' event listener that calls `resolveReady` when the event is dispatched;
 *    otherwise defer to direct resolution in SSR contexts.
 * 3. If in a browser environment, expose the promise on the `window` object for legacy consumers.
 * @type {Promise<void>}
 * @param {(value?: void) => void} resolve - Internal resolver for readiness.
 * @returns {Promise<void>}
 */
export const battleReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

let readyResolved = false;
let listenerAttached = false;

const resolveReadyOnce = () => {
  if (!readyResolved) {
    readyResolved = true;
    resolveReady();
  }
};

const attachBattleInitListener = () => {
  if (listenerAttached || typeof document === "undefined") {
    return;
  }

  document.addEventListener(
    "battle:init",
    () => {
      resolveReadyOnce();
    },
    { once: true }
  );

  listenerAttached = true;
};

attachBattleInitListener();

if (typeof window !== "undefined") {
  window.battleReadyPromise = battleReadyPromise;
}
/**
 * Mark a named portion of the battle page as ready and dispatch `battle:init` when complete.
 *
 * @summary Add `part` to an internal set; when both `home` and `state` are ready,
 * set the DOM ready flag and dispatch `battle:init`.
 * @pseudocode
 * 1. Add `part` to the `readyParts` set.
 * 2. If both `home` and `state` are present:
 *    a. When the DOM is available, ensure the ready flag is set and dispatch `battle:init`.
 *    b. Otherwise, resolve the readiness promise directly (SSR fallback).
 *
 * @param {"home"|"state"} part - The portion of the page that finished initializing.
 * @returns {void}
 */
export function markBattlePartReady(part) {
  readyParts.add(part);
  if (readyParts.has("home") && readyParts.has("state")) {
    attachBattleInitListener();

    if (typeof document === "undefined") {
      resolveReadyOnce();
      return;
    }

    const root = document.querySelector(".home-screen") || document.body;
    if (root && root.dataset.ready !== "true") {
      root.dataset.ready = "true";
      document.dispatchEvent(new CustomEvent("battle:init"));
    }

    resolveReadyOnce();
  }
}
