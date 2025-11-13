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
 * Event name dispatched when all battle parts are ready.
 *
 * @type {string}
 */
const BATTLE_INIT_EVENT = "battle:init";

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
 * @pseudocode
 * 1. Create a deferred promise.
 * 2. Capture the resolve handler.
 * 3. Export the promise for readiness consumers.
 */
export const battleReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});

const readinessState = {
  resolved: false,
  listenerAttached: false
};

const isReady = () => readinessState.resolved;

const allPartsBattleReady = () => Object.values(PARTS).every((part) => readyParts.has(part));

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
    BATTLE_INIT_EVENT,
    () => {
      tryResolveReady();
    },
    { once: true }
  );
  readinessState.listenerAttached = true;
};

ensureBattleInitListener();

if (
  typeof window !== "undefined" &&
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "development"
) {
  window.battleReadyPromise = battleReadyPromise;
}
/**
 * Mark a named portion of the battle page as ready and dispatch `battle:init` when complete.
 *
 * @param {"home"|"state"} part - The portion of the page that finished initializing.
 * @pseudocode
 * 1. Exit early if the readiness promise already resolved.
 * 2. Validate that `part` is a recognized battle part.
 * 3. Add `part` to the `readyParts` set.
 * 4. Return until both PARTS.HOME and PARTS.STATE are present.
 * 5. If the DOM is unavailable, resolve the readiness promise directly (SSR fallback).
 * 6. Ensure the listener is attached, set the DOM ready flag, and dispatch `battle:init`.
 * @returns {void}
 */
export function markBattlePartReady(part) {
  if (isReady()) {
    return;
  }

  if (!Object.values(PARTS).includes(part)) {
    console.warn(
      `Invalid battle part: "${part}". Expected one of: ${Object.values(PARTS).join(", ")}`
    );
    return;
  }

  readyParts.add(part);
  if (!allPartsBattleReady()) {
    return;
  }

  if (typeof document === "undefined") {
    // In SSR/non-DOM environments, resolve immediately since listeners won't work
    tryResolveReady();
    return;
  }

  ensureBattleInitListener();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
  if (root && root.dataset.ready !== "true") {
    root.dataset.ready = "true";
    // The listener resolves the promise, which already checked that both parts are ready
    // via the allPartsBattleReady() guard above
    document.dispatchEvent(new CustomEvent(BATTLE_INIT_EVENT));
  }
}
