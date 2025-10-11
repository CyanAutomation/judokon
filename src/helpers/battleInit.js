/**
 * Track battle page readiness and signal when complete.
 *
 * @pseudocode
 * 1. Maintain a set of completed parts and a readiness state tracker.
 * 2. Lazily attach a one-time `battle:init` listener when the DOM exists.
 * 3. When a part is marked ready, add it to the set.
 * 4. Once both "home" and "state" are ready:
 *    a. Resolve immediately in SSR (no `document`).
 *    b. Otherwise, set `data-ready="true"` on the `.home-screen` root (fallback to `document.body`).
 *    c. Dispatch a `battle:init` event on `document`; the listener resolves the readiness promise.
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
 * 2. When the DOM is available, attach a one-time 'battle:init' listener that resolves the promise when dispatched.
 * 3. In SSR contexts, defer resolution until both parts report readiness.
 * 4. If in a browser environment, expose the promise on the `window` object for legacy consumers.
 * @type {Promise<void>}
 * @param {(value?: void) => void} resolve - Internal resolver for readiness.
 * @returns {Promise<void>}
 */
export const battleReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

const readinessState = {
  resolved: false,
  listenerAttached: false
};

const tryResolveReady = () => {
  if (!readinessState.resolved) {
    readinessState.resolved = true;
    resolveReady();
  }
};

const ensureBattleInitListener = () => {
  if (readinessState.listenerAttached || typeof document === "undefined") {
    return;
  }

  document.addEventListener(
    "battle:init",
    () => {
      tryResolveReady();
    },
    { once: true }
  );
  readinessState.listenerAttached = true;
};

ensureBattleInitListener();

if (typeof window !== "undefined") {
  window.battleReadyPromise = battleReadyPromise;
}
/**
 * Mark a named portion of the battle page as ready and dispatch `battle:init` when complete.
 *
 * @summary Add `part` to an internal set; when both `home` and `state` are ready,
 * set the DOM ready flag and dispatch `battle:init`.
 * @pseudocode
 * 1. Exit early if the readiness promise already resolved.
 * 2. Add `part` to the `readyParts` set.
 * 3. Return until both `home` and `state` are present.
 * 4. If the DOM is unavailable, resolve the readiness promise directly (SSR fallback).
 * 5. Otherwise, ensure the listener is attached, set the DOM ready flag, and dispatch `battle:init`.
 *
 * @param {"home"|"state"} part - The portion of the page that finished initializing.
 * @returns {void}
 */
export function markBattlePartReady(part) {
  if (readinessState.resolved) {
    return;
  }

  readyParts.add(part);
  if (!readyParts.has("home") || !readyParts.has("state")) {
    return;
  }

  if (typeof document === "undefined") {
    tryResolveReady();
    return;
  }

  ensureBattleInitListener();

  const root = document.querySelector(".home-screen") || document.body;
  if (root && root.dataset.ready !== "true") {
    root.dataset.ready = "true";
    document.dispatchEvent(new CustomEvent("battle:init"));
  }
}
