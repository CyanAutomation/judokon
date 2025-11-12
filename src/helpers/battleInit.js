/**
 * Valid battle readiness part names.
 *
 * @type {{ HOME: string; STATE: string }}
 */
const PARTS = {
  HOME: "home",
  STATE: "state"
};

/**
 * Root element selector for the battle screen.
 *
 * @type {string}
 */
const ROOT_SELECTOR = ".home-screen";

const readyParts = new Set();

let resolveReady;

/**
 * Promise that resolves when the battle screen has fully initialized
 * (both 'home' and 'state' parts are ready).
 *
 * @type {Promise<void>}
 */
export const battleReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

const readinessState = {
  resolved: false,
  listenerAttached: false
};

const isReady = () => readinessState.resolved;

const tryResolveReady = () => {
  if (!isReady()) {
    readinessState.resolved = true;
    resolveReady();
  }
};

const ensureBattleInitListener = () => {
  if (readinessState.listenerAttached || typeof document === "undefined") {
    return;
  }

  // { once: true } ensures listener auto-removes after first dispatch,
  // preventing memory leaks from repeated registrations
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
 * @param {"home"|"state"} part - The portion of the page that finished initializing.
 * @pseudocode
 * 1. Exit early if the readiness promise already resolved.
 * 2. Add `part` to the `readyParts` set.
 * 3. Return until both PARTS.HOME and PARTS.STATE are present.
 * 4. If the DOM is unavailable, resolve the readiness promise directly (SSR fallback).
 * 5. Otherwise, ensure the listener is attached, set the DOM ready flag, and dispatch `battle:init`.
 * @returns {void}
 */
export function markBattlePartReady(part) {
  if (isReady()) {
    return;
  }

  readyParts.add(part);
  if (!readyParts.has(PARTS.HOME) || !readyParts.has(PARTS.STATE)) {
    return;
  }

  if (typeof document === "undefined") {
    tryResolveReady();
    return;
  }

  ensureBattleInitListener();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
  if (root && root.dataset.ready !== "true") {
    root.dataset.ready = "true";
    document.dispatchEvent(new CustomEvent("battle:init"));
  }
}
