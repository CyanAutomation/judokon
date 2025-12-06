import { BattleEngine, STATS } from "./BattleEngine.js";
import { setTestMode } from "./testModeUtils.js";
import { CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";
import logger from "./logger.js";

/**
 * Re-exports `BattleEngine`, `STATS`, and `OUTCOME` from the engine implementation.
 *
 * @summary Provides thin re-exports so callers import from the facade instead of
 * the implementation module directly. This keeps call sites stable if the
 * implementation file is refactored.
 *
 * @description
 * - **BattleEngine**: The class implementing match flow and timer control.
 * - **STATS**: The canonical stats enumeration used when creating engines.
 * - **OUTCOME**: Enumerates possible round/match outcomes.
 *
 * @pseudocode
 * 1. Import `BattleEngine`, `STATS`, and `OUTCOME` from `./BattleEngine.js`.
 * 2. Re-export these symbols so other modules consume a stable facade.
 *
 * @returns {void}
 */
export { BattleEngine, STATS, OUTCOME } from "./BattleEngine.js";

/**
 * @typedef {object} IBattleEngine
 * @property {(value:number) => void} setPointsToWin
 * @property {() => number} getPointsToWin
 * @property {() => void} stopTimer
 * @property {(...args:any[]) => Promise<void>} startRound
 * @property {(...args:any[]) => Promise<void>} startCoolDown
 * @property {() => void} pauseTimer
 * @property {() => void} resumeTimer
 * @property {(...args:any[]) => {delta:number, outcome:keyof typeof OUTCOME, matchEnded:boolean, playerScore:number, opponentScore:number}} handleStatSelection
 * @property {() => {outcome:keyof typeof OUTCOME, matchEnded:boolean, playerScore:number, opponentScore:number}} quitMatch
 * @property {(reason?:string) => {outcome:keyof typeof OUTCOME, matchEnded:boolean, playerScore:number, opponentScore:number}} interruptMatch
 * @property {() => object} getScores
 * @property {() => number} getRoundsPlayed
 * @property {() => boolean} isMatchEnded
 * @property {() => object} getTimerState
 */

/** @type {IBattleEngine|undefined} */
/**
 * Internal reference to the active BattleEngine instance.
 *
 * @summary Holds the engine instance created by `createBattleEngine()` so
 * thin wrapper helpers can delegate to it.
 * @pseudocode
 * 1. Initially undefined until `createBattleEngine()` constructs an engine.
 * 2. Wrappers call `requireEngine()` which throws if this value is unset.
 * @type {IBattleEngine|undefined}
 */
let battleEngine = null;

// Use a WeakMap to store battle engines per window to avoid sharing across pages.
//
// **Design Rationale:**
// - Isolates engines in multi-window environments (e.g., Playwright tests with context switching).
// - WeakMap keys are garbage-collected when windows are closed, preventing memory leaks.
// - Circular reference safety: WeakMap does not prevent GC even if the window holds a reference
//   to data that references the engine. This is safe because we intentionally keep engines
//   alive via explicit `createBattleEngine()` calls; the WeakMap cleanup is secondary.
//
// **Fallback for Node.js:**
// - The module-level `battleEngine` variable provides fallback storage when `window` is unavailable.
// - This enables both browser and server-side testing without conditional imports.
// - Trade-off: In Node.js, only one engine per process; multi-window benefit is browser-only.
//
const battleEngines = new WeakMap();

/** @type {Set<(engine: IBattleEngine|null) => void>} */
const engineCreatedListeners = new Set();

/**
 * Get the current engine instance from either window-isolated storage or module fallback.
 *
 * @returns {IBattleEngine|null}
 */
function getCurrentEngine() {
  if (typeof window !== "undefined") {
    return battleEngines.get(window) ?? null;
  }
  return battleEngine;
}

function shouldLogEngineListenerErrors() {
  return (
    (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") ||
    (typeof window !== "undefined" && window.__TEST__)
  );
}

function invokeEngineCreatedListener(listener, engine) {
  try {
    listener(engine);
  } catch (error) {
    if (shouldLogEngineListenerErrors()) {
      console.warn("Engine creation listener failed:", error);
    }
  }
}

function notifyEngineCreated(engine) {
  if (engineCreatedListeners.size === 0) return;

  for (const listener of engineCreatedListeners) {
    invokeEngineCreatedListener(listener, engine);
  }
}

/**
 * Register a callback invoked whenever a battle engine instance is created.
 *
 * @pseudocode
 * 1. Ignore registrations when `listener` is not a function.
 * 2. Add the listener to an internal `Set`.
 * 3. Return an unsubscribe function that removes the listener.
 *
 * @param {(engine: IBattleEngine|null) => void} listener
 * @returns {() => void} Unsubscribe handle.
 */
export function onEngineCreated(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  engineCreatedListeners.add(listener);
  const currentEngine = getCurrentEngine();
  if (currentEngine) {
    invokeEngineCreatedListener(listener, currentEngine);
  }
  return () => {
    engineCreatedListeners.delete(listener);
  };
}

/**
 * Internal guard that returns the active engine or throws if none exists.
 *
 * @summary Ensures the engine has been created before helper functions delegate to it.
 * @pseudocode
 * 1. If the current engine is undefined, throw an Error instructing callers to initialize it.
 * 2. Otherwise, return the engine instance.
 *
 * @throws {Error} When no engine has been created.
 * @returns {IBattleEngine}
 */
export function requireEngine() {
  const engine = getCurrentEngine();
  if (!engine) {
    // Provide a clear error for consumers that call helpers before
    // initialization.
    throw new Error("Battle engine not initialized. Call createBattleEngine() first.");
  }
  return engine;
}

/**
 * Detect if code is running in a test environment.
 *
 * @returns {boolean}
 */
function isTestEnvironment() {
  const isWindowTest =
    typeof window !== "undefined" && (window.__TEST__ || window.__ENGINE_CONFIG?.forceCreate);
  const isNodeTest =
    typeof window === "undefined" &&
    typeof process !== "undefined" &&
    Boolean(
      process?.env?.VITEST ||
        process?.env?.NODE_ENV === "test" ||
        process?.env?.JEST_WORKER_ID ||
        process?.env?.BABEL_ENV === "test"
    );
  return isWindowTest || isNodeTest;
}

/**
 * Attempt to reset an engine via its internal _resetForTest method.
 *
 * @param {IBattleEngine|null} engine
 * @returns {IBattleEngine|null} The reset engine, or null if reset failed.
 */
function attemptInternalReset(engine) {
  if (engine && typeof engine._resetForTest === "function") {
    try {
      engine._resetForTest();
      return engine;
    } catch (error) {
      logger.warn("Engine _resetForTest failed:", error);
      return null;
    }
  }
  return null;
}

/**
 * Create a new battle engine instance.
 *
 * @summary Factory returning a fresh `BattleEngine` instance.
 * @pseudocode
 * 1. Check if an engine already exists and reuse it if forceCreate is not set.
 * 2. Construct a new `BattleEngine` with default classic config merged with `config`.
 * 3. Store the instance for use by exported wrapper helpers.
 * 4. Apply seed configuration if provided.
 * 5. Notify listeners that engine was created.
 * 6. Return the new instance.
 *
 * @param {object} [config]
 * @returns {IBattleEngine}
 */
export function createBattleEngine(config = {}) {
  logger.log("battleEngineFacade: createBattleEngine called with config:", config);
  const forceCreate = config.forceCreate || isTestEnvironment();
  const currentEngine = getCurrentEngine();

  if (currentEngine && !forceCreate) {
    logger.log("battleEngineFacade: returning existing engine instance");
    notifyEngineCreated(currentEngine);
    return currentEngine;
  }

  battleEngine = new BattleEngine({
    pointsToWin: CLASSIC_BATTLE_POINTS_TO_WIN,
    maxRounds: CLASSIC_BATTLE_MAX_ROUNDS,
    stats: STATS,
    debugHooks: { getStateSnapshot },
    ...config
  });
  if (typeof window !== "undefined") {
    battleEngines.set(window, battleEngine);
  }
  logger.log("battleEngineFacade: battleEngine set to", battleEngine);
  try {
    if (typeof config?.seed === "number") {
      setTestMode({ enabled: true, seed: Number(config.seed) });
    }
  } catch (error) {
    logger.warn("Failed to set test mode seed:", error);
  }
  notifyEngineCreated(battleEngine);
  return battleEngine;
}

/**
 * Reset the battle engine to a fresh instance while preserving overrides.
 *
 * @summary Rebuilds the engine so match state (scores, rounds, flags) returns
 * to defaults while reapplying configuration tweaks such as `pointsToWin`.
 *
 * @pseudocode
 * 1. Attempt to capture the current `pointsToWin` value when an engine exists.
 * 2. Try to reset the existing engine via `_resetForTest()` method.
 * 3. If that fails, create a fresh engine via `createBattleEngine({ forceCreate: true })`.
 * 4. Reapply captured overrides like `pointsToWin` on the engine before returning.
 *
 * @returns {IBattleEngine} Refreshed engine instance.
 */
export function resetBattleEnginePreservingConfig() {
  let preservedPointsToWin = null;
  let existingEngine = null;

  try {
    existingEngine = requireEngine();
    if (existingEngine && typeof existingEngine.getPointsToWin === "function") {
      const candidate = Number(existingEngine.getPointsToWin());
      if (Number.isFinite(candidate)) {
        preservedPointsToWin = candidate;
      }
    }
  } catch {
    existingEngine = null;
  }

  let engine = attemptInternalReset(existingEngine);
  if (!engine) {
    engine = createBattleEngine({ forceCreate: true });
  }

  // Update module-level reference to ensure all subsequent calls get the reset engine
  battleEngine = engine;

  if (typeof preservedPointsToWin === "number" && Number.isFinite(preservedPointsToWin)) {
    try {
      engine?.setPointsToWin?.(preservedPointsToWin);
    } catch (error) {
      // Ignore failures so replay flow can proceed with default thresholds.
      logger.warn("Failed to restore pointsToWin after reset:", error);
    }
  }
  return engine;
}

/**
 * Set the number of points required to win a match.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.setPointsToWin(value)`.
 *
 * @param {number} value
 * @returns {void}
 */
export const setPointsToWin = (value) => requireEngine().setPointsToWin(value);

/**
 * Get the current points required to win a match.
 *
 * @pseudocode
 * 1. Return `battleEngine.getPointsToWin()` result.
 *
 * @returns {number}
 */
export const getPointsToWin = () => requireEngine().getPointsToWin();

/**
 * Stop any active battle timer.
 *
 * @pseudocode
 * 1. Call `battleEngine.stopTimer()` to cancel ticks and callbacks.
 *
 * @returns {void}
 */
export const stopTimer = () => requireEngine().stopTimer();

/**
 * Start a new round via the underlying battle engine.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.startRound(...args)`.
 *
 * @param {...any} args
 * @returns {Promise<void>}
 */
export const startRound = (...args) => requireEngine().startRound(...args);

/**
 * Start the engine cooldown sequence.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.startCoolDown(...args)`.
 *
 * @param {...any} args
 * @returns {Promise<void>}
 */
export const startCoolDown = (...args) => requireEngine().startCoolDown(...args);

/**
 * Pause the current round timer.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.pauseTimer()` which saves remaining time and cancels ticks.
 *
 * @returns {void}
 */
export const pauseTimer = () => requireEngine().pauseTimer();

/**
 * Resume a previously paused round timer.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.resumeTimer()` which restores remaining time and restarts ticks.
 *
 * @returns {void}
 */
export const resumeTimer = () => requireEngine().resumeTimer();

/**
 * Forward stat selection to the engine which computes outcome and updates scores.
 *
 * @pseudocode
 * 1. Call `battleEngine.handleStatSelection(...args)` and return its result.
 *
 * @param {...any} args
 * @returns {{delta: number, outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
 */
export const handleStatSelection = (...args) => {
  logger.log("battleEngineFacade: handleStatSelection called with args:", args);
  return requireEngine().handleStatSelection(...args);
};

/**
 * Quit the current match via the engine.
 *
 * @pseudocode
 * 1. Delegate to `battleEngine.quitMatch()`.
 *
 * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
 */
export const quitMatch = () => requireEngine().quitMatch();

/**
 * Interrupt the entire match (admin/test/error/quit).
 *
 * @pseudocode
 * 1. Stop the timer and set matchEnded to true.
 * 2. Optionally log or store the reason.
 * 3. Return an interrupt outcome and current scores.
 *
 * @param {string} [reason] - Reason for interruption.
 * @returns {{outcome: keyof typeof OUTCOME, matchEnded: boolean, playerScore: number, opponentScore: number}}
 */
export const interruptMatch = (reason) => requireEngine().interruptMatch(reason);

/**
 * Retrieve the current scores from the engine.
 *
 * @pseudocode
 * 1. Get engine via requireEngine().
 * 2. Call getScores() if available, otherwise return object with safe defaults.
 * 3. Freeze and return the scores to prevent external mutation.
 *
 * @returns {object}
 */
export const getScores = () => {
  const engine = requireEngine();
  const scores = engine.getScores?.() ?? { playerScore: 0, opponentScore: 0 };
  return Object.freeze({ ...scores });
};

/**
 * Get a shallow, immutable snapshot of current stat values if exposed.
 *
 * @pseudocode
 * 1. Prefer engine.getCurrentStats if present.
 * 2. Otherwise, return an empty object to avoid null checks in consumers.
 * 3. Freeze a shallow copy to prevent external mutation.
 *
 * @returns {Readonly<object>} Frozen snapshot object.
 */
export const getCurrentStats = () => {
  const engine = requireEngine();
  const raw = engine.getCurrentStats?.() || {};
  return Object.freeze({ ...raw });
};

/**
 * Retrieve how many rounds have been played.
 *
 * @pseudocode
 * 1. Get the engine via requireEngine().
 * 2. Call getRoundsPlayed() if available, otherwise return 0 as safe default.
 * 3. Ensure return value is numeric to prevent NaN propagation.
 *
 * @returns {number}
 */
export const getRoundsPlayed = () => {
  const engine = requireEngine();
  const count = engine.getRoundsPlayed?.() ?? 0;
  return typeof count === "number" ? count : 0;
};

/**
 * Query whether the match has ended.
 *
 * @pseudocode
 * 1. Get engine via requireEngine().
 * 2. Call isMatchEnded() if available, otherwise return false as safe default.
 * 3. Ensure return value is boolean to prevent truthy/falsy bugs.
 *
 * @returns {boolean}
 */
export const isMatchEnded = () => {
  const engine = requireEngine();
  const ended = engine.isMatchEnded?.() ?? false;
  return Boolean(ended);
};

/**
 * Get timer state (remaining, running, paused) from the engine.
 *
 * @pseudocode
 * 1. Get engine via requireEngine().
 * 2. Call getTimerState() if available, otherwise return safe default state.
 * 3. Freeze and return to prevent external mutation.
 *
 * @returns {object}
 */
export const getTimerState = () => {
  const engine = requireEngine();
  const state = engine.getTimerState?.() ?? { remaining: 0, paused: false };
  return Object.freeze({ ...state });
};

/**
 * Subscribe to battle engine events.
 *
 * @pseudocode
 * 1. Ensure an engine exists via `requireEngine()`.
 * 2. Delegate to `battleEngine.on(type, handler)`.
 *
 * @param {string} type - Event name.
 * @param {(payload: any) => void} handler - Callback for the event.
 * @returns {void}
 */
export const on = (type, handler) => requireEngine().on(type, handler);

/**
 * Unsubscribe from battle engine events.
 *
 * @pseudocode
 * 1. Ensure an engine exists via `requireEngine()`.
 * 2. Delegate to `battleEngine.off(type, handler)`.
 *
 * @param {string} type - Event name.
 * @param {(payload: any) => void} handler - Callback for the event.
 * @returns {void}
 */
export const off = (type, handler) => requireEngine().off(type, handler);

/**
 * PRD Alias Metadata for Timer Control Functions
 *
 * @summary Defines timer-control aliases (PRD compatibility) mapping export names
 * to their corresponding engine method names. This reduces duplication and makes
 * the alias→implementation mapping explicit.
 *
 * @description
 * - **startRoundTimer** → `startRound` (accepts variadic args, returns Promise)
 * - **pauseRoundTimer** → `pauseTimer`
 * - **resumeRoundTimer** → `resumeTimer`
 * - **stopRoundTimer** → `stopTimer`
 *
 * @type {Object<string, {engineMethod: string, acceptsArgs: boolean, description: string}>}
 */
const timerAliasMetadata = {
  startRoundTimer: {
    engineMethod: "startRound",
    acceptsArgs: true,
    description: "PRD alias for starting the round timer"
  },
  pauseRoundTimer: {
    engineMethod: "pauseTimer",
    acceptsArgs: false,
    description: "PRD alias for pausing the round timer"
  },
  resumeRoundTimer: {
    engineMethod: "resumeTimer",
    acceptsArgs: false,
    description: "PRD alias for resuming the round timer"
  },
  stopRoundTimer: {
    engineMethod: "stopTimer",
    acceptsArgs: false,
    description: "PRD alias for stopping the round timer"
  }
};

/**
 * startRoundTimer: PRD alias for starting the round timer.
 *
 * @summary Alias kept for Product Requirements Document (PRD) compatibility.
 * It forwards its arguments to the engine `startRound` implementation.
 *
 * @pseudocode
 * 1. Ensure an engine instance exists via `requireEngine()`.
 * 2. Call the engine's `startRound(...args)` passing through all arguments.
 * 3. Return the engine promise so callers may await round start completion.
 *
 * @param {...any} args - All arguments are forwarded to `BattleEngine.startRound`.
 * @returns {Promise<void>} Resolves when the engine has started the round.
 */
export const startRoundTimer = (...args) => {
  const engine = requireEngine();
  const metadata = timerAliasMetadata.startRoundTimer;
  return engine[metadata.engineMethod](...args);
};

/**
 * pauseRoundTimer: PRD alias for pausing the round timer.
 *
 * @pseudocode
 * 1. Delegate to `pauseTimer` on the active engine instance which saves remaining
 *    time and cancels any running tick callbacks.
 *
 * @returns {void}
 */
export const pauseRoundTimer = () => {
  const engine = requireEngine();
  const metadata = timerAliasMetadata.pauseRoundTimer;
  return engine[metadata.engineMethod]();
};

/**
 * resumeRoundTimer: PRD alias for resuming the round timer.
 *
 * @pseudocode
 * 1. Delegate to `resumeTimer` on the active engine instance which restores
 *    remaining time and restarts tick callbacks.
 *
 * @returns {void}
 */
export const resumeRoundTimer = () => {
  const engine = requireEngine();
  const metadata = timerAliasMetadata.resumeRoundTimer;
  return engine[metadata.engineMethod]();
};

/**
 * stopRoundTimer: PRD alias for stopping the round timer.
 *
 * @pseudocode
 * 1. Delegate to `stopTimer` on the active engine instance which cancels the
 *    timer and clears scheduled callbacks.
 *
 * @returns {void}
 */
export const stopRoundTimer = () => {
  const engine = requireEngine();
  const metadata = timerAliasMetadata.stopRoundTimer;
  return engine[metadata.engineMethod]();
};

/**
 * evaluateSelection: PRD-shaped wrapper for stat evaluation.
 *
 * @summary Evaluate a stat selection pair and return the engine-computed outcome.
 * @pseudocode
 * 1. Validate inputs (statKey optional, playerVal and opponentVal required).
 * 2. Call the engine `handleStatSelection(playerVal, opponentVal)` to compute
 *    the delta, outcome and updated scores.
 * 3. If `statKey` was provided, attach it to the returned result for caller
 *    convenience.
 * 4. Provide explicit error context if stat evaluation fails.
 *
 * @param {object} opts
 * @param {string} [opts.statKey] - Optional stat identifier selected by the player.
 * @param {number} opts.playerVal - Numeric value chosen by the player.
 * @param {number} opts.opponentVal - Numeric value chosen by the opponent.
 * @returns {{delta:number, outcome:string, matchEnded:boolean, playerScore:number, opponentScore:number, statKey?:string}}
 * @throws {Error} If engine has no handleStatSelection method or inputs are invalid.
 */
export function evaluateSelection({ statKey, playerVal, opponentVal }) {
  const engine = requireEngine();
  if (typeof engine.handleStatSelection !== "function") {
    throw new Error(
      "Engine does not support stat selection (handleStatSelection method not found)"
    );
  }
  const result = engine.handleStatSelection(playerVal, opponentVal);
  return statKey ? { ...result, statKey } : result;
}

/**
 * isMatchPoint: PRD query alias.
 *
 * @pseudocode
 * 1. Delegate to engine `isMatchPoint()` if available; otherwise return `false`.
 *
 * @returns {boolean} True when the current round could end the match for either player.
 */
export const isMatchPoint = () => requireEngine().isMatchPoint?.() ?? false;

/**
 * getSeed: PRD query to expose deterministic seed.
 *
 * @pseudocode
 * 1. Delegate to engine `getSeed()` if available and return the value used for
 *    deterministic behavior in test mode.
 *
 * @returns {number|undefined} The numeric seed when test mode is enabled; otherwise undefined.
 */
export const getSeed = () => requireEngine().getSeed?.();

/**
 * Get the active battle engine instance.
 *
 * @pseudocode
 * 1. Call requireEngine() to get the active engine.
 * 2. Return the engine instance.
 *
 * @returns {IBattleEngine} The active battle engine instance.
 * @throws {Error} When no engine has been created.
 */
export const getEngine = () => requireEngine();

// Internal test helper removed; tests should instantiate engines via `createBattleEngine()`.

/**
 * Note: All thin wrappers above are intentionally documented with @pseudocode
 * in their preceding blocks to satisfy the project's JSDoc + @pseudocode rule.
 */
