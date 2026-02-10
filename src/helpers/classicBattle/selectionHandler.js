import { STATS, stopTimer, getScores, getRoundsPlayed } from "../BattleEngine.js";
import { chooseOpponentStat } from "../api/battleUI.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { resolveRound } from "./roundResolver.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getBattleState } from "./eventBus.js";
import { getRoundEvaluatedPromise } from "./promises.js";
import * as scoreboard from "../setupScoreboard.js";
import { writeScoreDisplay } from "./scoreDisplay.js";
import { roundState } from "./roundState.js";
import { getScheduler } from "../scheduler.js";
import { debugLog } from "../debug.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { enterGuard, setHiddenStoreValue, getHiddenStoreValue } from "../guardUtils.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const SELECTION_IN_FLIGHT_GUARD = Symbol.for("classicBattle.selectionInFlight");
const ROUND_RESOLUTION_GUARD = Symbol.for("classicBattle.roundResolutionGuard");
const LAST_ROUND_RESULT = Symbol.for("classicBattle.lastResolvedRoundResult");

export const VALID_BATTLE_STATES = ["roundSelect", "roundResolve"];
const FALLBACK_BUFFER_MS = 32;
const INVALID_STATE_WARNING = (state) => `Ignored stat selection while in state=${state}`;

// Battle state constants for easier maintenance
const BATTLE_STATES = {
  ROUND_SELECT: "roundSelect",
  ROUND_RESOLVE: "roundResolve",
  ROUND_DISPLAY: "roundDisplay"
};

/**
 * Get current battle state safely without throwing.
 *
 * @returns {string|null}
 */
function getCurrentBattleState() {
  try {
    return typeof getBattleState === "function" ? getBattleState() : null;
  } catch {
    return null;
  }
}

/**
 * Update dataset battle state with optional previous state tracking.
 *
 * @param {string} newState - New battle state.
 * @param {string|null} [prevState] - Previous battle state.
 */
function setBattleStateDataset(newState, prevState) {
  try {
    if (typeof document !== "undefined" && document.body) {
      document.body.dataset.battleState = newState;
      if (prevState) {
        document.body.dataset.prevBattleState = String(prevState);
      }
    }
  } catch {}
}

/**
 * Log debug information for test environments only.
 *
 * @param {string} message - Debug message.
 * @param {any} data - Optional data to log.
 */
function logSelectionDebug(message, data) {
  // Debug logging is controlled by debugLog utility
  try {
    debugLog(message, data);
  } catch {}
}

/**
 * Trace mutations to the selection flags during Vitest runs.
 *
 * @pseudocode
 * 1. If not in Vitest environment, return immediately.
 * 2. Log selection state to console with source and extra context.
 * 3. If window is defined, push selection trace to `window.__SELECTION_FLAG_TRACE`.
 *
 * @param {string} source - Identifier describing where the mutation occurred.
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>|null|undefined} store - Store being mutated.
 * @param {Record<string, any>} [extra] - Additional context to log.
 * @returns {void}
 */
export function logSelectionMutation(source, store, extra = {}) {
  // Debug logging is controlled by debugLog utility
  try {
    debugLog(`[selectionFlag:${source}]`, {
      selectionMade: store?.selectionMade ?? null,
      lastSelectionMade: store?.__lastSelectionMade ?? null,
      playerChoice: store?.playerChoice ?? null,
      ...extra
    });

    if (typeof window !== "undefined") {
      try {
        const trace = window.__SELECTION_FLAG_TRACE || [];
        trace.push({
          source,
          selectionMade: store?.selectionMade ?? null,
          lastSelectionMade: store?.__lastSelectionMade ?? null,
          playerChoice: store?.playerChoice ?? null,
          extra
        });
        window.__SELECTION_FLAG_TRACE = trace;
      } catch {
        // Ignore window property assignment errors in restricted environments
      }
    }
  } catch {}
}

/**
 * Track debug information about selection validation in tests.
 *
 * @param {object} debugInfo - Debug information to record.
 */
function trackDebugInfo(debugInfo) {
  if (typeof window === "undefined") return;
  try {
    const arr = window.__VALIDATE_SELECTION_DEBUG || [];
    arr.push(debugInfo);
    window.__VALIDATE_SELECTION_DEBUG = arr;
    window.__VALIDATE_SELECTION_LAST = debugInfo;
  } catch {}
}

/**
 * Normalize a numeric value for scoring.
 *
 * @param {any} value - Value to normalize.
 * @param {number} [fallback=0] - Fallback if value is not finite.
 * @returns {number} Normalized number.
 */
function normalizeScore(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Determine whether the classic battle orchestrator is actively managing state.
 *
 * @pseudocode
 * 1. Check for a battle store orchestrator object.
 * 2. Query the event bus for the current machine state when possible.
 * 3. Inspect DOM dataset markers that indicate orchestrator control.
 * 4. Fall back to scanning for data attributes when body dataset is absent.
 * 5. Return true when any signal indicates orchestrator activity.
 *
 * @param {ReturnType<typeof createBattleStore>|Record<string, any>|null|undefined} store
 * @param {string|null|undefined} currentState
 * @returns {boolean}
 */
export function isOrchestratorActive(store, currentState = undefined) {
  if (typeof document === "undefined") {
    return false;
  }

  const hasStore = store && typeof store === "object";
  const orchestratorCandidate = hasStore ? store.orchestrator : null;
  const hasOrchestratorObject = orchestratorCandidate && typeof orchestratorCandidate === "object";

  if (hasStore && !hasOrchestratorObject) {
    return false;
  }

  let state = currentState;
  if (state === undefined) {
    state = getCurrentBattleState();
  }
  const hasMachineState = typeof state === "string" && state.length > 0;

  const datasetState = document.body?.dataset?.battleState;
  const hasDatasetMarker = typeof datasetState === "string" && datasetState.length > 0;

  if (hasOrchestratorObject || hasMachineState || hasDatasetMarker) {
    return true;
  }

  try {
    const attrState = document
      .querySelector("[data-battle-state]")
      ?.getAttribute("data-battle-state");
    return typeof attrState === "string" && attrState.length > 0;
  } catch {
    return false;
  }
}

function syncRoundsPlayedFromEngine(store) {
  try {
    const engineRounds = getRoundsPlayed();
    if (Number.isFinite(engineRounds)) {
      store.roundsPlayed = engineRounds;
    }
  } catch {}
}

/**
 * Determine if selection flags can be cleared for the next round.
 *
 * @pseudocode
 * 1. If store is invalid, return false.
 * 2. Compare `roundsPlayed` to the last selection's round marker.
 * 3. Return true when the round counter has advanced.
 * 4. Default to true when no round markers exist yet.
 *
 * @param {ReturnType<typeof createBattleStore>|Record<string, any>|null|undefined} store
 * @returns {boolean}
 */
export function shouldClearSelectionForNextRound(store) {
  if (!store || typeof store !== "object") {
    return false;
  }
  const roundsPlayed = Number(store.roundsPlayed);
  const lastSelectionRound = Number(store.__lastSelectionRound);

  if (Number.isFinite(roundsPlayed) && Number.isFinite(lastSelectionRound)) {
    return roundsPlayed > lastSelectionRound;
  }

  // Only allow clearing if no selection round has been recorded yet
  return !Number.isFinite(lastSelectionRound);
}

/**
 * Determine the opponent's stat choice based on difficulty.
 *
 * This function simulates an AI opponent's stat selection strategy:
 * - **Easy**: Random selection from all available stats (unpredictable)
 * - **Medium**: Weighted selection favoring above-average stats (strategic)
 * - **Hard**: Always selects the highest stat value (optimal play)
 *
 * @pseudocode
 * 1. Validate inputs: ensure stats is an object and difficulty is valid
 * 2. Map the provided stats object into `{stat, value}` pairs
 * 3. Pass the array to `chooseOpponentStat` with the provided difficulty
 * 4. Return the chosen stat key
 *
 * @example
 * // Opponent with mixed stats
 * const stats = { power: 5, speed: 7, technique: 3, kumikata: 6, newaza: 8 };
 * simulateOpponentStat(stats, "easy");   // Random: any stat
 * simulateOpponentStat(stats, "medium"); // Likely: speed, kumikata, or newaza
 * simulateOpponentStat(stats, "hard");   // Always: newaza (highest at 8)
 *
 * @param {Record<string, number>} stats - Opponent stat values. Must be a valid object.
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] Difficulty setting. Defaults to "easy".
 * @returns {string} One of the stat keys from `STATS` array.
 * @throws {TypeError} If stats is not a valid object.
 */
export function simulateOpponentStat(stats, difficulty = "easy") {
  // Input validation: ensure stats is a valid object
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    throw new TypeError(
      `simulateOpponentStat: stats must be a valid object, received ${stats === null ? "null" : typeof stats}`
    );
  }

  // Map stats to array format expected by chooseOpponentStat
  const values = STATS.map((stat) => ({ stat, value: Number(stats?.[stat]) || 0 }));
  return chooseOpponentStat(values, difficulty);
}

/**
 * Retrieve stat values for the player and opponent cards.
 *
 * @pseudocode
 * 1. Extract active and persisted judoka stats from the provided battle store context.
 * 2. For each side, prefer the supplied value, then the store's current stats, then the persisted stats.
 * 3. Only read the DOM when no numeric value is available from store data.
 * 4. Coerce the resolved values to numbers and return them.
 *
 * @param {string} stat - Selected stat key.
 * @param {number} [playerVal] - Precomputed player stat value.
 * @param {number} [opponentVal] - Precomputed opponent stat value.
 * @param {object} [context]
 * @param {object} [context.store] - Battle store providing active judoka stats.
 * @returns {{playerVal: number, opponentVal: number}}
 */
export function getPlayerAndOpponentValues(stat, playerVal, opponentVal, context = {}) {
  const { store } = typeof context === "object" && context !== null ? context : {};

  const playerStats = store?.currentPlayerJudoka?.stats;
  const opponentStats = store?.currentOpponentJudoka?.stats;
  const persistedPlayerStats = store?.lastPlayerStats;
  const persistedOpponentStats = store?.lastOpponentStats;

  const resolvedPlayer = resolveStatSide({
    value: playerVal,
    selector: "#player-card",
    stat,
    stats: playerStats,
    persistedStats: persistedPlayerStats
  });

  const resolvedOpponent = resolveStatSide({
    value: opponentVal,
    selector: "#opponent-card",
    stat,
    stats: opponentStats,
    persistedStats: persistedOpponentStats
  });

  return {
    playerVal: Number(resolvedPlayer),
    opponentVal: Number(resolvedOpponent)
  };
}

function resolveStatSide({ value, selector, stat, stats, persistedStats }) {
  if (value !== undefined && !Number.isNaN(value)) {
    return Number(value);
  }

  const storeValue = readStoreStat(stats, stat);
  if (storeValue !== undefined) {
    return storeValue;
  }

  const persistedValue = readStoreStat(persistedStats, stat);
  if (persistedValue !== undefined) {
    return persistedValue;
  }

  const container = getStatContainer(selector);
  const domValue = Number(getCardStatValue(container, stat));
  return Number.isFinite(domValue) ? domValue : 0;
}

function readStoreStat(stats, stat) {
  const numeric = Number(stats?.[stat]);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function getStatContainer(selector) {
  try {
    return document?.querySelector?.(selector) || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the round directly without the battle state machine.
 *
 * @pseudocode
 * 1. In Vitest, use a deterministic delay of 0ms.
 * 2. Call `resolveRound` and clear `store.playerChoice`.
 * 3. Return the result.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @param {object} [opts] - Resolver options.
 * @returns {Promise<ReturnType<typeof resolveRound>>}
 */
export async function resolveRoundDirect(store, stat, playerVal, opponentVal, opts = {}) {
  // When forceDirectResolution is true, ensure delayMs is 0 for immediate resolution
  const resolveOpts =
    opts.forceDirectResolution && !("delayMs" in opts) ? { ...opts, delayMs: 0 } : opts;
  const result = await resolveRound(store, stat, playerVal, opponentVal, resolveOpts);
  store.playerChoice = null;
  return result;
}

/**
 * Validate that stat selection is allowed in the current battle state.
 *
 * @pseudocode
 * 1. Check if selection has already been made to prevent duplicates.
 * 2. If duplicate, emit input.ignored event and return false.
 * 3. Check current battle state to ensure it's valid for selection.
 * 4. If in invalid state, log warning and emit input.ignored event.
 * 5. Return true if selection is allowed, false otherwise.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store
 * @returns {boolean} True if selection is allowed, false otherwise
 */
export function validateSelectionState(store) {
  const debugInfo = {
    timestamp: Date.now(),
    selectionMade: !!(store && store.selectionMade),
    current: null,
    allowed: true
  };

  // Check for duplicate selection
  if (store.selectionMade) {
    debugInfo.current = "selectionMade";
    debugInfo.allowed = false;
    trackDebugInfo(debugInfo);
    logSelectionDebug(
      "[validateSelectionState] REJECTED: duplicateSelection - selectionMade already true"
    );
    try {
      emitBattleEvent("input.ignored", { kind: "duplicateSelection" });
    } catch {}
    return false;
  }

  // Check battle state validity
  try {
    const current = typeof getBattleState === "function" ? getBattleState() : null;
    const datasetState = (() => {
      try {
        return document?.body?.dataset?.battleState ?? null;
      } catch {
        return null;
      }
    })();
    const broadcastState = (() => {
      try {
        return window?.__LAST_BATTLE_STATE_DETAIL?.to ?? null;
      } catch {
        return null;
      }
    })();

    // First try to find a valid state from the available sources
    const validState = [current, datasetState, broadcastState].find((state) =>
      VALID_BATTLE_STATES.includes(state)
    );

    // If no valid state found, use the first non-null state to report the error
    const resolvedState =
      validState ?? [current, datasetState, broadcastState].find((state) => state !== null) ?? null;

    debugLog(
      "[DIAGNOSTIC] validateSelectionState: current machine state =",
      resolvedState,
      "VALID_BATTLE_STATES =",
      VALID_BATTLE_STATES
    );
    debugInfo.current = resolvedState;
    if (resolvedState && !VALID_BATTLE_STATES.includes(resolvedState)) {
      debugInfo.allowed = false;
      trackDebugInfo(debugInfo);
      logSelectionDebug("[validateSelectionState] REJECTED: invalidState", resolvedState);
      debugLog(INVALID_STATE_WARNING(resolvedState));
      try {
        emitBattleEvent("input.ignored", { kind: "invalidState", state: resolvedState });
      } catch {}
      return false;
    }
  } catch (error) {
    logSelectionDebug("[validateSelectionState] ERROR checking battle state:", error);
  }

  trackDebugInfo(debugInfo);
  logSelectionDebug("[validateSelectionState] ALLOWED - state is valid:", debugInfo.current);
  return true;
}

/**
 * Record the player's selection on the store and coerce stat values.
 *
 * @pseudocode
 * 1. Mark `store.selectionMade` and store the chosen stat.
 * 2. Resolve missing stat values via `getPlayerAndOpponentValues`.
 * 3. Return the coerced `{playerVal, opponentVal}`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} [playerVal] - Optional player stat value.
 * @param {number} [opponentVal] - Optional opponent stat value.
 * @returns {{playerVal: number, opponentVal: number}}
 */
function applySelectionToStore(store, stat, playerVal, opponentVal) {
  logSelectionDebug("[applySelectionToStore] BEFORE:", {
    selectionMade: store.selectionMade,
    playerChoice: store.playerChoice
  });

  store.selectionMade = true;
  store.__lastSelectionMade = true;
  store.__lastSelectionRound = Number.isFinite(Number(store.roundsPlayed))
    ? Number(store.roundsPlayed)
    : 0;
  store.playerChoice = stat;

  logSelectionMutation("applySelectionToStore", store, { stat });

  // Mirror selection to round state
  try {
    try {
      roundState.setSelectedStat(stat, { emitLegacyEvent: false });
    } catch {
      // swallow to preserve legacy behaviour
    }
  } catch {
    // featureFlags may be uninitialised in some test harnesses
  }
  return getPlayerAndOpponentValues(stat, playerVal, opponentVal, { store });
}

function clearNextRoundTimerFallback() {
  try {
    if (typeof scoreboard?.clearTimer === "function") {
      scoreboard.clearTimer();
    }
  } catch {}
  try {
    if (typeof document !== "undefined") {
      const timerEl = document.getElementById("next-round-timer");
      if (timerEl) {
        const valueSpan = timerEl.querySelector('[data-part="value"]');
        if (valueSpan) valueSpan.textContent = "";
        const labelSpan = timerEl.querySelector('[data-part="label"]');
        if (labelSpan) labelSpan.textContent = "";
        const separator = labelSpan?.nextSibling;
        if (separator && separator.nodeType === 3) {
          timerEl.removeChild(separator);
        }
        if (!valueSpan && !labelSpan) {
          timerEl.textContent = "";
        }
      }
    }
  } catch {}
}

function clearRoundMessageFallback() {
  try {
    if (typeof scoreboard?.clearMessage === "function") {
      scoreboard.clearMessage();
    }
  } catch {}
  try {
    if (typeof document !== "undefined") {
      const roundMessage = document.getElementById("round-message");
      if (roundMessage) {
        roundMessage.textContent = "";
      }
      const headerRoundMessage = document.querySelector("header #round-message");
      if (headerRoundMessage) {
        headerRoundMessage.textContent = "";
      }
    }
  } catch {}
}

function shouldClearRoundArtifactsInTests() {
  const hasVitest = typeof process !== "undefined" && Boolean(process.env && process.env.VITEST);
  const globalTestFlag =
    typeof globalThis !== "undefined" &&
    Boolean(globalThis.__TEST__ || globalThis.__PLAYWRIGHT_TEST__ || globalThis.__testMode);
  let testModeActive = false;
  try {
    testModeActive = typeof isTestModeEnabled === "function" && Boolean(isTestModeEnabled());
  } catch {}
  return hasVitest || testModeActive || globalTestFlag;
}

function collectSelectionSchedulers(store) {
  const candidates = [];
  if (store && typeof store === "object") {
    const { selectionTimeoutScheduler, statTimeoutScheduler, autoSelectScheduler } =
      /** @type {Record<string, any>} */ (store);
    if (selectionTimeoutScheduler) candidates.push(selectionTimeoutScheduler);
    if (statTimeoutScheduler) candidates.push(statTimeoutScheduler);
    if (autoSelectScheduler) candidates.push(autoSelectScheduler);
  }
  try {
    const active = getScheduler();
    if (active) candidates.push(active);
  } catch {}
  return candidates;
}

function clearTimerHandle(handle, schedulers) {
  if (!handle) {
    return;
  }

  let schedulerProvidesClear = false;

  for (const scheduler of schedulers) {
    if (scheduler && typeof scheduler.clearTimeout === "function") {
      schedulerProvidesClear = true;
      try {
        scheduler.clearTimeout(handle);
        return;
      } catch {}
    }
  }

  if (!schedulerProvidesClear && typeof clearTimeout === "function") {
    try {
      clearTimeout(handle);
    } catch {}
  }
}

/**
 * Stop countdown timers and clear pending selection timeouts on the store.
 *
 * This halts the engine countdown and removes any scheduled auto-select or
 * stall timeouts so they cannot fire after the player has made a selection.
 *
 * @pseudocode
 * 1. Call engine `stopTimer()` to pause/stop the round countdown.
 * 2. Invoke `scoreboard.clearTimer` when available to reset the scoreboard display.
 * 3. Invoke `window.__battleClassicStopSelectionTimer` when present to ensure
 *    the orchestrator cancels any in-flight countdown controller.
 * 4. Blank the DOM fallback `#next-round-timer` node when direct helpers are
 *    unavailable.
 * 5. Clear `store.statTimeoutId`, `store.autoSelectId`, `store.autoSelectCountdownId`,
 *    and `store.autoSelectExecuteId` via `clearTimeout`.
 * 6. Null out the stored ids and round token so subsequent cleanup calls are safe.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @returns {void}
 */
export function cleanupTimers(store) {
  try {
    stopTimer();
  } catch {}
  try {
    scoreboard.clearTimer?.();
  } catch {}
  try {
    if (typeof window !== "undefined" && window.__battleClassicStopSelectionTimer) {
      window.__battleClassicStopSelectionTimer();
    }
  } catch {}
  clearNextRoundTimerFallback();
  const schedulers = collectSelectionSchedulers(store);
  clearTimerHandle(store?.selectionFallbackTimeoutId, schedulers);
  if (store) {
    store.selectionFallbackTimeoutId = null;
  }
  clearTimerHandle(store?.statTimeoutId, schedulers);
  store.statTimeoutId = null;
  clearTimerHandle(store?.autoSelectId, schedulers);
  store.autoSelectId = null;
  clearTimerHandle(store?.autoSelectCountdownId, schedulers);
  store.autoSelectCountdownId = null;
  clearTimerHandle(store?.autoSelectExecuteId, schedulers);
  store.autoSelectExecuteId = null;
  if (store && typeof store === "object" && "autoSelectRoundToken" in store) {
    store.autoSelectRoundToken = null;
  }
  if (store && typeof store === "object") {
    if ("selectionTimeoutScheduler" in store) store.selectionTimeoutScheduler = null;
    if ("statTimeoutScheduler" in store) store.statTimeoutScheduler = null;
    if ("autoSelectScheduler" in store) store.autoSelectScheduler = null;
  }
}

/**
 * Emit the selection event and apply test-mode shortcuts.
 *
 * @pseudocode
 * 1. Emit `statSelected` via `emitBattleEvent`.
 * 2. In Vitest, clear the next-round timer and round message elements.
 * 3. Dynamically show the opponent delay snackbar.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 */
async function emitSelectionEvent(store, stat, playerVal, opponentVal, opts) {
  // Delay opponent message when not using direct resolution to let orchestrator handle countdown
  const forceDirectResolution = opts.forceDirectResolution || store.forceDirectResolution;
  const selectionSource = opts?.selectionSource ?? "player";
  const eventOpts = {
    ...opts,
    delayOpponentMessage: opts?.delayOpponentMessage ?? !forceDirectResolution,
    selectionSource
  };
  try {
    document.body?.setAttribute?.("data-stat-selected", "true");
  } catch {}
  emitBattleEvent("statSelected", { store, stat, playerVal, opponentVal, opts: eventOpts });
  // PRD taxonomy: mirror selection lock event
  try {
    emitBattleEvent("round.selection.locked", { statKey: stat, source: selectionSource });
  } catch {}

  // Emit a roundReset signal immediately after selection to allow UI to clear
  // previous-round artifacts deterministically before resolution proceeds.
  try {
    emitBattleEvent("roundReset", { reason: "playerSelection" });
  } catch {}
  try {
    if (shouldClearRoundArtifactsInTests()) {
      clearRoundMessageFallback();
      clearNextRoundTimerFallback();
    }
  } catch {}
  // Timer clearing and message display handled by event orchestrator
}

/**
 * Validate the selection state and apply the selection to the store.
 *
 * @pseudocode
 * 1. Log debug information if in test environment.
 * 2. Validate that selection is allowed in current state.
 * 3. If validation fails and selection was already made, dispatch round.evaluated.
 * 4. If validation fails, return null to indicate failure.
 * 5. If validation passes, apply selection to store and return values.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store
 * @param {string} stat - Chosen stat key
 * @param {number} playerVal - Player stat value
 * @param {number} opponentVal - Opponent stat value
 * @returns {Promise<{playerVal: number, opponentVal: number}|null>} Selection values or null if invalid
 */
export async function validateAndApplySelection(store, stat, playerVal, opponentVal) {
  logSelectionDebug("[DEBUG] handleStatSelection called", {
    stat,
    playerVal,
    opponentVal,
    selectionMade: store.selectionMade
  });

  if (!validateSelectionState(store)) {
    const currentState = typeof getBattleState === "function" ? getBattleState() : null;
    debugLog("[DIAGNOSTIC] *** VALIDATION FAILED *** Machine state:", currentState);
    logSelectionDebug("[test] handleStatSelection: validateSelectionState returned FALSE");
    if (store.selectionMade) {
      try {
        await dispatchBattleEvent("round.evaluated");
      } catch {}
    }
    return null;
  }

  logSelectionDebug(
    "[test] handleStatSelection: validateSelectionState PASSED, calling applySelectionToStore"
  );
  return applySelectionToStore(store, stat, playerVal, opponentVal);
}

/**
 * Emit selection events and dispatch `statSelected` to the orchestrator.
 *
 * @pseudocode
 * 1. Halt timers by calling `cleanupTimers`.
 * 2. Emit the `statSelected` battle event with selection metadata.
 * 3. Dispatch `statSelected` to the orchestrator unless tests force direct resolution.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player stat value.
 * @param {number} opponentVal - Opponent stat value.
 * @param {Record<string, any>} opts - Optional configuration flags.
 * @returns {Promise<boolean|undefined>} Result from `dispatchBattleEvent`.
 */
export async function dispatchStatSelected(store, stat, playerVal, opponentVal, opts = {}) {
  logSelectionDebug("[dispatchStatSelected] START:", {
    stat,
    playerVal,
    opponentVal,
    storeSelectionMade: store.selectionMade,
    storePlayerChoice: store.playerChoice
  });

  cleanupTimers(store);
  await emitSelectionEvent(store, stat, playerVal, opponentVal, opts);

  logSelectionDebug("[dispatchStatSelected] After emitSelectionEvent:", {
    storeSelectionMade: store.selectionMade,
    storePlayerChoice: store.playerChoice
  });

  try {
    const forceDirectResolution = opts.forceDirectResolution || store.forceDirectResolution;
    if (forceDirectResolution) {
      logSelectionDebug("[dispatchStatSelected] Returning false (forceDirectResolution)");
      return false;
    }
    const result = await dispatchBattleEvent("statSelected");
    logSelectionDebug("[dispatchStatSelected] dispatchBattleEvent returned:", result);
    return result;
  } catch (error) {
    logSelectionDebug("[dispatchStatSelected] Error caught:", error?.message);
    return undefined;
  }
}

/**
 * Handle the fallback timeout when orchestrator doesn't resolve the round.
 *
 * Sets battle state to roundResolve, syncs result display, then transitions to roundDisplay.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} currentState - Current battle state.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player stat value.
 * @param {number} opponentVal - Opponent stat value.
 * @param {Record<string, any>} opts - Optional configuration flags.
 * @param {number} normalizedDelay - Normalized delay in ms.
 */
async function handleFallbackResolution(
  store,
  currentState,
  stat,
  playerVal,
  opponentVal,
  opts,
  normalizedDelay
) {
  const latestState = getCurrentBattleState();
  const selectionReset = store?.playerChoice === null && !store?.selectionMade;
  if (selectionReset || (typeof latestState === "string" && latestState.startsWith("interrupt"))) {
    return;
  }
  const selectionWasMade = !!store?.selectionMade;
  let previousState = currentState;
  if (previousState === undefined) {
    previousState = getCurrentBattleState() ?? null;
  }

  // Transition to roundResolve
  setBattleStateDataset(BATTLE_STATES.ROUND_RESOLVE, previousState);

  try {
    emitBattleEvent("battleStateChange", {
      from: previousState ?? null,
      to: BATTLE_STATES.ROUND_RESOLVE
    });
  } catch {}

  // Sync result display
  try {
    await syncResultDisplay(store, stat, playerVal, opponentVal, {
      ...opts,
      delayMs: normalizedDelay,
      forceOpponentPrompt: true
    });
  } catch {
  } finally {
    if (store && typeof store === "object") {
      store.playerChoice = null;
    }
  }

  if (selectionWasMade) {
    try {
      if (store && typeof store === "object") {
        store.selectionMade = true;
      }
    } catch {}
  }

  // Transition to roundDisplay
  setBattleStateDataset(BATTLE_STATES.ROUND_DISPLAY, BATTLE_STATES.ROUND_RESOLVE);

  try {
    emitBattleEvent("battleStateChange", {
      from: BATTLE_STATES.ROUND_RESOLVE,
      to: BATTLE_STATES.ROUND_DISPLAY
    });
  } catch {}
}

/**
 * Prefer orchestrator resolution and install a fallback when required.
 *
 * @pseudocode
 * 1. Detect whether the orchestrator is active via DOM dataset markers.
 * 2. When active but not handling the event, install a deterministic fallback timer.
 * 3. Bail out early if the orchestrator already handled resolution.
 * 4. Skip direct resolution when the battle state machine is not in `roundResolve`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player stat value.
 * @param {number} opponentVal - Opponent stat value.
 * @param {Record<string, any>} opts - Optional configuration flags.
 * @param {boolean|undefined} handledByOrchestrator - Result from dispatching `statSelected`.
 * @returns {Promise<boolean>} `true` when the round should stop processing locally.
 */
export async function resolveWithFallback(
  store,
  stat,
  playerVal,
  opponentVal,
  opts,
  handledByOrchestrator
) {
  try {
    let currentState = getCurrentBattleState();

    const orchestrated = isOrchestratorActive(store, currentState);

    if (handledByOrchestrator === true) {
      logSelectionDebug("[test] handleStatSelection: handledByOrchestrator true");
      return true;
    }

    if (orchestrated && handledByOrchestrator !== true) {
      const normalizedDelay = 0;
      const fallbackDelay = FALLBACK_BUFFER_MS;
      const schedulers = collectSelectionSchedulers(store);
      clearTimerHandle(store?.selectionFallbackTimeoutId, schedulers);
      if (store) {
        store.selectionFallbackTimeoutId = null;
      }

      const timeoutId = setTimeout(async () => {
        if (store && store.selectionFallbackTimeoutId === timeoutId) {
          store.selectionFallbackTimeoutId = null;
        }
        await handleFallbackResolution(
          store,
          currentState,
          stat,
          playerVal,
          opponentVal,
          opts,
          normalizedDelay
        );
      }, fallbackDelay);
      if (store && typeof store === "object") {
        store.selectionFallbackTimeoutId = timeoutId;
      }

      try {
        getRoundEvaluatedPromise()
          .then(() => {
            clearTimeout(timeoutId);
            if (store && store.selectionFallbackTimeoutId === timeoutId) {
              store.selectionFallbackTimeoutId = null;
            }
          })
          .catch(() => {});
      } catch {}

      logSelectionDebug("[test] handleStatSelection: orchestrated path; scheduling fallback");
      return true;
    }

    if (store.playerChoice === null) {
      return true;
    }

    if (orchestrated) {
      if (currentState && currentState !== BATTLE_STATES.ROUND_RESOLVE) {
        logSelectionDebug(
          "[test] handleStatSelection: machine in non-decision state",
          currentState
        );
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Resolve the round directly and synchronise DOM/test utilities.
 *
 * @pseudocode
 * 1. Show the "opponent choosing" snackbar in Vitest environments.
 * 2. Resolve the round deterministically via `resolveRoundDirect`.
 * 3. Update DOM nodes for Vitest compatibility and scoreboard state.
 * 4. Dispatch `round.evaluated` for downstream listeners.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player stat value.
 * @param {number} opponentVal - Opponent stat value.
 * @param {Record<string, any>} opts - Optional configuration flags.
 * @returns {Promise<ReturnType<typeof resolveRound>>} Resolution result.
 */
export async function syncResultDisplay(store, stat, playerVal, opponentVal, opts) {
  const guard = enterGuard(store, ROUND_RESOLUTION_GUARD);
  if (!guard.entered) {
    return getHiddenStoreValue(store, LAST_ROUND_RESULT) ?? null;
  }

  try {
    if (store && typeof store === "object" && opts?.delayOpponentMessage === true) {
      store.__delayOpponentMessage = true;
    }

    const result = await resolveRoundDirect(store, stat, playerVal, opponentVal, opts);
    setHiddenStoreValue(store, LAST_ROUND_RESULT, result);

    try {
      if (typeof process !== "undefined" && process.env && process.env.VITEST) {
        const messageEl = document.querySelector("header #round-message");
        const scoreEl = document.querySelector("header #score-display");

        if (result && result.message && messageEl) {
          messageEl.textContent = result.message;
        }

        if (result && scoreEl) {
          writeScoreDisplay(
            normalizeScore(result.playerScore),
            normalizeScore(result.opponentScore)
          );
        }
      }
    } catch {}

    let playerScore = normalizeScore(result?.playerScore);
    let opponentScore = normalizeScore(result?.opponentScore);

    if (playerScore === 0 && opponentScore === 0) {
      try {
        const engineScores = getScores();
        playerScore = normalizeScore(engineScores?.playerScore);
        opponentScore = normalizeScore(engineScores?.opponentScore);
      } catch {
        // Falls back to 0/0 from normalizeScore
      }
    }

    try {
      scoreboard.updateScore(playerScore, opponentScore);
    } catch {}

    try {
      writeScoreDisplay(playerScore, opponentScore);
    } catch {}

    try {
      await dispatchBattleEvent("round.evaluated");
    } catch {}

    return result;
  } finally {
    guard.release();
  }
}

/**
 * Handle the complete stat selection flow from validation to resolution.
 *
 * This function coordinates validation, applying selection to the store,
 * stopping timers, emitting the `statSelected` event, and ensuring the round
 * is resolved either by the state machine or directly by calling the resolver.
 *
 * @pseudocode
 * 1. Validate selection state and apply selection to store.
 * 2. If validation fails, return early.
 * 3. Dispatch statSelected event to orchestrator.
 * 4. Resolve round with fallback mechanisms if needed.
 * 5. If already handled, return early.
 * 6. Synchronize result display for DOM and test utilities.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store
 * @param {string} stat - Chosen stat key
 * @param {object} options - Selection options
 * @param {number} [options.playerVal] - Player stat value
 * @param {number} [options.opponentVal] - Opponent stat value
 * @returns {Promise<ReturnType<typeof resolveRound>|void>}
 */
export function handleStatSelection(store, stat, { playerVal, opponentVal, ...opts } = {}) {
  const selectionApplied = createDeferred();
  let selectionAppliedResolved = false;
  const resolveSelectionApplied = (value) => {
    if (selectionAppliedResolved) return;
    selectionAppliedResolved = true;
    selectionApplied.resolve?.(value);
  };

  const roundResolutionPromise = (async () => {
    logSelectionDebug("[handleStatSelection] Called with:", {
      stat,
      playerVal,
      opponentVal,
      storeId: store?.__testId ?? "no-id",
      storeSelectionMadeBefore: store?.selectionMade
    });

    const guard = enterGuard(store, SELECTION_IN_FLIGHT_GUARD);
    if (!guard.entered) {
      try {
        emitBattleEvent("input.ignored", { kind: "selectionInProgress" });
      } catch {}
      resolveSelectionApplied({ playerVal, opponentVal });
      return getHiddenStoreValue(store, LAST_ROUND_RESULT);
    }

    try {
      const values = await validateAndApplySelection(store, stat, playerVal, opponentVal);
      if (!values) {
        logSelectionDebug("[handleStatSelection] validateAndApplySelection returned falsy");
        resolveSelectionApplied(null);
        return;
      }

      resolveSelectionApplied(values || { playerVal, opponentVal });

      logSelectionDebug("[handleStatSelection] After validateAndApplySelection:", {
        storeSelectionMade: store.selectionMade,
        storePlayerChoice: store.playerChoice,
        valuesReturned: values
      });

      logSelectionMutation("handleStatSelection.afterApply", store, {
        stat,
        playerVal,
        opponentVal
      });

      ({ playerVal, opponentVal } = values);

      const handledByOrchestrator = await dispatchStatSelected(
        store,
        stat,
        playerVal,
        opponentVal,
        opts
      );

      logSelectionDebug("[handleStatSelection] After dispatchStatSelected:", {
        handledByOrchestrator,
        storeSelectionMade: store.selectionMade,
        storePlayerChoice: store.playerChoice
      });

      const handled = await resolveWithFallback(
        store,
        stat,
        playerVal,
        opponentVal,
        opts,
        handledByOrchestrator
      );

      if (handled) {
        logSelectionDebug("[handleStatSelection] resolveWithFallback returned true (handled)");
        try {
          const roundEvaluatedPromise = getRoundEvaluatedPromise?.();
          if (roundEvaluatedPromise && typeof roundEvaluatedPromise.then === "function") {
            await Promise.race([
              roundEvaluatedPromise,
              new Promise((resolve) => setTimeout(resolve, 5000)) // 5s timeout
            ]);
          }
        } catch {}
        syncRoundsPlayedFromEngine(store);
        logSelectionMutation("handleStatSelection.handled", store, {
          stat,
          playerVal,
          opponentVal,
          roundsPlayed: store.roundsPlayed
        });
        return;
      }

      const forceDirectResolution = opts.forceDirectResolution || store?.forceDirectResolution;
      const shouldForceOpponentPrompt = handledByOrchestrator === false || forceDirectResolution;
      const result = await syncResultDisplay(
        store,
        stat,
        playerVal,
        opponentVal,
        shouldForceOpponentPrompt ? { ...opts, forceOpponentPrompt: true } : opts
      );
      syncRoundsPlayedFromEngine(store);

      logSelectionDebug("[handleStatSelection] After syncResultDisplay:", {
        storeSelectionMade: store.selectionMade,
        storePlayerChoice: store.playerChoice,
        roundsPlayed: store.roundsPlayed,
        resultMessage: result?.message
      });

      logSelectionMutation("handleStatSelection.afterSync", store, {
        stat,
        playerVal,
        opponentVal,
        roundsPlayed: store.roundsPlayed
      });
      return result;
    } catch (error) {
      resolveSelectionApplied(null);
      throw error;
    } finally {
      guard.release();
      logSelectionMutation("handleStatSelection.guardReleased", store, {
        selectionInFlight: !!store?.[SELECTION_IN_FLIGHT_GUARD]
      });
    }
  })();

  roundResolutionPromise.selectionAppliedPromise = selectionApplied.promise;

  return roundResolutionPromise;
}
