/**
 * Test API for direct access to battle state, timers, and component internals.
 *
 * This module exposes functions that tests can use to directly control and inspect
 * the application state without relying on DOM manipulation or timing dependencies.
 *
 * @pseudocode
 * 1. Check if running in test environment (NODE_ENV=test or feature flag enabled)
 * 2. Expose battle state machine access (get state, dispatch events, get snapshot)
 * 3. Expose timer controls (set countdown, skip cooldown, pause/resume timers)
 * 4. Expose initialization promises for reliable test setup
 * 5. Expose component state inspection helpers
 */

import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";
import { getBattleStateMachine } from "./classicBattle/orchestrator.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";
import { buildFeatureFlagSnapshot, isEnabled } from "./featureFlags.js";
import { getCachedSettings } from "./settingsCache.js";
import { resolveRoundForTest as resolveRoundForCliTest } from "../pages/battleCLI/testSupport.js";
import { isDevelopmentEnvironment } from "./environment.js";
import { getSelectionFinalized } from "./classicBattle/selectionState.js";
import {
  getPointsToWin as facadeGetPointsToWin,
  getRoundsPlayed as facadeGetRoundsPlayed,
  getScores as facadeGetScores,
  requireEngine,
  setPointsToWin as facadeSetPointsToWin
} from "./BattleEngine.js";
import { setTestMode } from "./testModeUtils.js";
import { getAutoContinue, setAutoContinue } from "./classicBattle/autoContinue.js";

const FRAME_DELAY_MS = 16;

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function waitForNextFrame() {
  try {
    if (typeof requestAnimationFrame === "function") {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      return;
    }
  } catch {}

  await new Promise((resolve) => setTimeout(resolve, FRAME_DELAY_MS));
}

function logDevWarning(message, error) {
  if (!isDevelopmentEnvironment()) return;

  try {
    console.warn(message, error);
  } catch {}
}

function logDevDebug(message, error) {
  if (!isDevelopmentEnvironment()) return;

  try {
    if (typeof console.debug === "function") {
      console.debug(message, error);
    } else {
      console.log(message, error);
    }
  } catch {}
}

/**
 * Create a promise that polls a condition with timeout and cleanup.
 * Reduces duplication of the finished flag and cleanup pattern.
 * Used by multiple waitFor* methods to eliminate boilerplate.
 *
 * @param {{
 *   condition: () => boolean,
 *   timeout?: number,
 *   pollInterval?: number,
 *   onCleanup?: () => void
 * }} config
 * @returns {Promise<boolean>} Resolves true when condition met, false on timeout
 * @internal
 */
function createPollingPromise({ condition, timeout = 5000, pollInterval = 50, onCleanup } = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let finished = false;
    let intervalId;
    let timeoutId;

    const cleanup = (result) => {
      if (finished) return;
      finished = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      if (onCleanup) {
        try {
          onCleanup();
        } catch {}
      }
      resolve(result);
    };

    const checkCondition = () => {
      if (finished) return;
      try {
        if (condition()) {
          cleanup(true);
          return;
        }
      } catch (error) {
        logDevDebug("[createPollingPromise] Condition check failed", error);
      }

      if (Date.now() - startTime > timeout) {
        cleanup(false);
      }
    };

    // Initial check
    checkCondition();

    // Setup polling if not finished
    if (!finished) {
      intervalId = setInterval(checkCondition, pollInterval);
      timeoutId = setTimeout(() => cleanup(false), timeout);
    }
  });
}

/**
 * Extract a numeric stat value from an object, trying both exact key and lowercase variant.
 * Used by stat comparison and round stats checking functions.
 *
 * @param {object} stats - Stats object to read from
 * @param {string} key - Key to look up (tried as-is first, then lowercased)
 * @returns {number} Finite number or NaN if not found or invalid
 * @internal
 */
function extractStatValue(stats, key) {
  if (!stats || typeof stats !== "object") {
    return Number.NaN;
  }

  // Try exact key match first
  if (Object.prototype.hasOwnProperty.call(stats, key)) {
    const direct = Number(stats[key]);
    if (Number.isFinite(direct)) {
      return direct;
    }
  }

  // Try lowercase variant
  const lowerKey = String(key).trim().toLowerCase();
  if (
    lowerKey &&
    lowerKey !== key &&
    Object.prototype.hasOwnProperty.call(stats, lowerKey) &&
    Number.isFinite(Number(stats[lowerKey]))
  ) {
    return Number(stats[lowerKey]);
  }

  return Number.NaN;
}

/**
 * Check if window is available (browser environment).
 * Replaces repeated "typeof window !== 'undefined'" checks throughout the file.
 *
 * @returns {boolean} True if window object is available
 * @internal
 */
function isWindowAvailable() {
  return typeof window !== "undefined";
}

// Test mode detection
/**
 * Determine whether the runtime should expose the test API helpers.
 *
 * @pseudocode
 * 1. Check Node-based test flags (NODE_ENV, VITEST) for early exit.
 * 2. Inspect browser globals for explicit test flags.
 * 3. Fallback to the enableTestMode feature flag toggle.
 *
 * @returns {boolean} True when test-only helpers should be mounted.
 * @internal
 */
export function isTestMode() {
  // Check for common test environment indicators
  if (typeof process !== "undefined") {
    if (process.env?.NODE_ENV === "test") return true;
    if (process.env?.VITEST) return true;
  }

  const runtime =
    isWindowAvailable() && window ? window : typeof globalThis !== "undefined" ? globalThis : null;

  if (runtime) {
    if (runtime.__TEST__ || runtime.__PLAYWRIGHT_TEST__) return true;
    if (runtime.__TEST_MODE?.enabled) return true;
  }

  // Check feature flag
  try {
    return isEnabled("enableTestMode");
  } catch {
    return false;
  }
}

/**
 * Validate that an object has valid scores (player and opponent as finite numbers).
 * @param {any} scores - Object to validate
 * @returns {boolean} True if scores object has valid structure
 * @pseudocode
 * 1. Check object is not null/undefined
 * 2. Check has player and opponent properties
 * 3. Check both are finite numbers
 * 4. Return true only if all checks pass
 */
function isValidScoresObject(scores) {
  if (!scores || typeof scores !== "object") return false;
  const player = toFiniteNumber(scores.player ?? scores.playerScore);
  const opponent = toFiniteNumber(scores.opponent ?? scores.opponentScore);
  return player !== null && opponent !== null && player >= 0 && opponent >= 0;
}

/**
 * Validate that an object has valid stat values (all numeric and within range).
 * @param {any} stats - Object to validate
 * @returns {boolean} True if stats object has valid structure
 * @pseudocode
 * 1. Check object is not null/undefined
 * 2. Check all values are finite numbers
 * 3. Check values are in expected range (0-9 for judoka stats typically)
 * 4. Return true only if all checks pass
 */
function isValidStatsObject(stats) {
  if (!stats || typeof stats !== "object") return false;
  const entries = Object.entries(stats);
  if (entries.length === 0) return false;
  // eslint-disable-next-line no-unused-vars
  return entries.every(([_key, value]) => {
    const num = toFiniteNumber(value);
    return num !== null && num >= 0;
  });
}

/**
 * Validate that a battle snapshot has required fields and valid values.
 * @param {any} snapshot - Snapshot to validate
 * @returns {boolean} True if snapshot has required fields with valid values
 * @pseudocode
 * 1. Check snapshot is not null/undefined
 * 2. Check required fields exist (roundsPlayed, playerScore, opponentScore)
 * 3. Check required fields have valid values
 * 4. Return true only if all checks pass
 */
function isValidBattleSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  const roundsPlayed = toFiniteNumber(snapshot.roundsPlayed);
  const playerScore = toFiniteNumber(snapshot.playerScore);
  const opponentScore = toFiniteNumber(snapshot.opponentScore);
  return (
    roundsPlayed !== null &&
    playerScore !== null &&
    opponentScore !== null &&
    roundsPlayed >= 0 &&
    playerScore >= 0 &&
    opponentScore >= 0
  );
}

// State management API
/**
 * Get current battle state from multiple sources (machine → body dataset → data attribute).
 * Tries each source in order and returns the first non-null string state found.
 * @returns {string|null} Current state name or null if unavailable
 * @pseudocode
 * 1. Try to get state from battle state machine
 * 2. Fall back to body.dataset.battleState
 * 3. Fall back to [data-battle-state] attribute
 * 4. Return null if no source provides a state
 */
function unifiedGetBattleState() {
  const tryGetState = (getter) => {
    try {
      const state = getter();
      return typeof state === "string" && state ? state : null;
    } catch {
      return null;
    }
  };

  // Try state machine first
  const machineState = tryGetState(() => {
    const machine = getBattleStateMachine();
    return machine?.getState?.();
  });
  if (machineState) return machineState;

  // Fall back to body dataset
  const bodyState = tryGetState(() => document.body?.dataset?.battleState);
  if (bodyState) return bodyState;

  // Fall back to data attribute
  const attrState = tryGetState(() =>
    document.querySelector("[data-battle-state]")?.getAttribute("data-battle-state")
  );
  if (attrState) return attrState;

  return null;
}

const stateApi = {
  /**
   * Get current battle state directly from state machine
   * @returns {string|null} Current state name
   */
  getBattleState() {
    return unifiedGetBattleState();
  },

  /**
   * Dispatch an event to the battle state machine or emit as battle event.
   * @param {string} eventName - Event to dispatch
   * @param {any} payload - Optional payload
   * @returns {Promise<boolean>} Success status
   * @pseudocode
   * 1. Try to dispatch to state machine if it's a valid transition
   * 2. If dispatch succeeds, return true
   * 3. If dispatch fails or state machine unavailable, emit as battle event
   * 4. Battle events are listened to by UI handlers
   */
  async dispatchBattleEvent(eventName, payload) {
    try {
      const machine = getBattleStateMachine();
      if (machine?.dispatch) {
        const result = await machine.dispatch(eventName, payload);
        if (result === true) {
          return true;
        }
      }
    } catch {
      // Ignore machine dispatch errors; fall through to emitting event
    }
    // If machine dispatch failed or unavailable, emit as battle event
    try {
      emitBattleEvent(eventName, payload);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get the battle state machine for testing
   * @returns {object|null} The state machine or null if unavailable
   */
  getBattleStateMachine() {
    try {
      return getBattleStateMachine();
    } catch {
      return null;
    }
  },

  /**
   * Get complete state snapshot for testing
   * @returns {object} State snapshot with current state, previous state, event, and log
   */
  getStateSnapshot() {
    try {
      return getStateSnapshot();
    } catch {
      return { state: null, prev: null, event: null, log: [] };
    }
  },

  /**
   * Read the number of completed rounds reported by the engine.
   * @returns {number|null}
   */
  getRoundsPlayed() {
    try {
      const value = facadeGetRoundsPlayed();
      return toFiniteNumber(value);
    } catch {
      return null;
    }
  },

  /**
   * Wait for the engine to report the desired number of completed rounds.
   * @param {number} targetRounds - Desired rounds played threshold.
   * @param {number} [timeout=5000] - Timeout window in milliseconds.
   * @returns {Promise<boolean>} Resolves true when threshold met, false on timeout.
   * @pseudocode
   * 1. Normalize the requested target and bail out early when invalid.
   * 2. Observe `battleStateChange` events while polling the engine snapshot.
   * 3. Resolve as soon as the reported rounds meet or exceed the target.
   * 4. Abort with `false` when the timeout window elapses.
   */
  async waitForRoundsPlayed(targetRounds, timeout = 5000) {
    const desired = toFiniteNumber(targetRounds);
    if (desired === null || desired < 0) {
      return false;
    }

    const readCurrentRounds = () => stateApi.getRoundsPlayed();

    return new Promise((resolve) => {
      const startTime = Date.now();
      let finished = false;
      let intervalId;
      let timeoutId;
      let listener;

      const cleanup = (result) => {
        if (finished) return;
        finished = true;
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        if (listener) {
          try {
            offBattleEvent("battleStateChange", listener);
          } catch {}
        }
        resolve(result);
      };

      const checkIfSatisfied = () => {
        const rounds = readCurrentRounds();
        if (typeof rounds === "number" && rounds >= desired) {
          cleanup(true);
          return true;
        }

        if (Date.now() - startTime > timeout) {
          cleanup(false);
          return true;
        }

        return false;
      };

      listener = () => {
        checkIfSatisfied();
      };

      try {
        onBattleEvent("battleStateChange", listener);
      } catch {
        listener = undefined;
      }

      if (!checkIfSatisfied()) {
        intervalId = setInterval(checkIfSatisfied, 50);
        timeoutId = setTimeout(() => cleanup(false), timeout);
      }
    });
  },

  /**
   * Wait until both the player and opponent expose at least one finite stat value.
   * @param {number} timeout - Timeout window in milliseconds.
   * @returns {Promise<boolean>} Resolves true when stats become available.
   */
  async waitForRoundStats(timeout = 5000) {
    const readStatsReady = () => {
      try {
        const store = inspectionApi.getBattleStore();
        const playerStats = store?.currentPlayerJudoka?.stats ?? null;
        const opponentStats = store?.currentOpponentJudoka?.stats ?? null;
        if (!playerStats || !opponentStats) {
          return false;
        }

        const keys = Array.from(
          new Set([...Object.keys(playerStats ?? {}), ...Object.keys(opponentStats ?? {})])
        );
        if (keys.length === 0) {
          return false;
        }

        let playerReady = false;
        let opponentReady = false;
        for (const _key of keys) {
          const playerValue = extractStatValue(playerStats, _key);
          const opponentValue = extractStatValue(opponentStats, _key);
          if (Number.isFinite(playerValue)) {
            playerReady = true;
          }
          if (Number.isFinite(opponentValue)) {
            opponentReady = true;
          }
          if (playerReady && opponentReady) {
            return true;
          }
        }

        return playerReady && opponentReady;
      } catch {
        return false;
      }
    };

    if (readStatsReady()) {
      return true;
    }

    return await new Promise((resolve) => {
      const startTime = Date.now();
      let timeoutId;
      const intervalId = setInterval(() => {
        if (readStatsReady()) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve(false);
        }
      }, 50);

      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        resolve(false);
      }, timeout);
    });
  },

  /**
   * Wait for a specific battle state to be reached
   * @param {string|string[]} stateNames - Target state name or array of valid state names
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when state reached, throws on timeout
   * @pseudocode
   * 1. Normalize input to array for consistent handling (single string or array).
   * 2. Resolve immediately when any of the requested states is already active.
   * 3. Subscribe to `battleStateChange` to observe upcoming transitions.
   * 4. Poll the state as a safety net while tracking the timeout window.
   * 5. Resolve `true` when any target state is observed, otherwise reject when time expires.
   */
  async waitForBattleState(stateNames, timeout = 5000) {
    // Normalize to array for consistent handling
    const targetStates = Array.isArray(stateNames) ? stateNames : [stateNames];

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let finished = false,
        pollId,
        timeoutId,
        listener;
      const cleanup = (onComplete) => {
        if (finished) return;
        finished = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (pollId) clearInterval(pollId);
        if (listener) {
          try {
            offBattleEvent("battleStateChange", listener);
          } catch {}
        }
        onComplete();
      };
      const rejectWithTimeout = () =>
        cleanup(() => {
          const current = this.getBattleState();
          const stateList = targetStates.join('", "');
          const error = new Error(
            `Timed out after ${timeout}ms waiting for battle state(s): "${stateList}"\n` +
              `Current state: ${current}`
          );
          error.name = "BattleStateTimeoutError";
          error.code = "BATTLE_STATE_TIMEOUT";
          reject(error);
        });
      const resolveMatch = () => cleanup(() => resolve(true));
      const currentMatches = () => {
        try {
          const current = this.getBattleState();
          return targetStates.includes(current);
        } catch {
          return false;
        }
      };
      if (currentMatches()) {
        resolveMatch();
        return;
      }
      listener = (event) => {
        const detail = event?.detail ?? null;
        const nextState =
          typeof detail === "string"
            ? detail
            : (detail?.to ?? detail?.state ?? detail?.next ?? null);
        if (targetStates.includes(nextState)) resolveMatch();
      };
      try {
        onBattleEvent("battleStateChange", listener);
      } catch {
        listener = undefined;
      }
      pollId = setInterval(() => {
        if (currentMatches()) resolveMatch();
        else if (Date.now() - startTime > timeout) rejectWithTimeout();
      }, 50);
      timeoutId = setTimeout(() => rejectWithTimeout(), timeout);
    });
  },

  /**
   * Wait for stat buttons to become ready for selection.
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when ready, false on timeout
   */
  async waitForStatButtonsReady(timeout = 5000) {
    const startTime = Date.now();

    const getContainer = () =>
      document.querySelector("[data-testid='stat-buttons']") ??
      document.getElementById("stat-buttons");

    const buttonsInteractive = () => {
      try {
        const container = getContainer();
        if (!container || container.dataset?.buttonsReady !== "true") {
          return false;
        }

        const buttons = Array.from(
          container.querySelectorAll("[data-testid='stat-button'], button[data-stat]")
        );
        if (buttons.length === 0) {
          return false;
        }

        return buttons.some((button) => {
          const ariaDisabled =
            typeof button.getAttribute === "function" ? button.getAttribute("aria-disabled") : null;
          return button.disabled !== true && ariaDisabled !== "true";
        });
      } catch {
        return false;
      }
    };

    if (buttonsInteractive()) {
      return true;
    }

    try {
      const hydration = window.statButtonsReadyPromise;
      if (hydration && typeof hydration.then === "function") {
        const hydrationResult = await Promise.race([
          Promise.resolve(hydration)
            .then(() => true)
            .catch(() => false),
          new Promise((resolve) => setTimeout(() => resolve(false), timeout))
        ]);

        if (hydrationResult && buttonsInteractive()) {
          return true;
        }
      }
    } catch {}

    const remaining = Math.max(0, timeout - (Date.now() - startTime));
    if (remaining === 0) {
      return buttonsInteractive();
    }

    return await new Promise((resolve) => {
      const deadline = Date.now() + remaining;
      const intervalId = setInterval(() => {
        if (buttonsInteractive()) {
          clearInterval(intervalId);
          resolve(true);
          return;
        }

        if (Date.now() >= deadline) {
          clearInterval(intervalId);
          resolve(false);
        }
      }, 50);
    });
  },

  /**
   * Wait for the Next button to be marked ready and enabled.
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when ready, false on timeout
   */
  async waitForNextButtonReady(timeout = 5000) {
    const cachedButtons = [];

    const refreshButtons = () => {
      // Keep only connected references between checks.
      for (let i = cachedButtons.length - 1; i >= 0; i -= 1) {
        if (!cachedButtons[i]?.isConnected) {
          cachedButtons.splice(i, 1);
        }
      }
      if (cachedButtons.length === 0) {
        const nextById = document.getElementById("next-button");
        const nextByRole = document.querySelector("[data-role='next-round']");
        if (nextById) {
          cachedButtons.push(nextById);
        }
        if (nextByRole && nextByRole !== nextById) {
          cachedButtons.push(nextByRole);
        }
      }
      return cachedButtons;
    };

    const isButtonReady = (btn) => {
      if (!btn) return false;
      const ariaDisabled =
        typeof btn.getAttribute === "function" ? btn.getAttribute("aria-disabled") : null;
      return (
        btn.dataset?.nextReady === "true" &&
        btn.dataset?.nextFinalized === "true" &&
        btn.disabled !== true &&
        ariaDisabled !== "true"
      );
    };

    return createPollingPromise({
      condition: () => {
        try {
          const buttons = refreshButtons();
          return buttons.some((btn) => isButtonReady(btn));
        } catch {
          return false;
        }
      },
      timeout,
      pollInterval: 50
    });
  },

  /**
   * Await the match conclusion payload emitted via `match.concluded`.
   *
   * @param {number} timeout Timeout in milliseconds before aborting.
   * @returns {Promise<{eventName:string,detail:object|null,scores:{player:number,opponent:number}|null,winner:string|null,reason:string|null,elapsedMs:number,timedOut:boolean,dom:object|null}>}
   * @pseudocode
   * 1. Subscribe to `match.concluded` and start a timeout guard.
   * 2. When the event fires, capture the emitted detail and normalize scores.
   * 3. Resolve with the collected payload; on timeout resolve with `timedOut=true`.
   */
  async waitForMatchCompletion(timeout = 10000) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      let finished = false;
      let timeoutId;
      let listenerBound = false;

      const finish = (result) => {
        if (finished) return;
        finished = true;

        if (timeoutId) clearTimeout(timeoutId);
        if (listenerBound) {
          try {
            offBattleEvent("match.concluded", handleMatchConcluded);
          } catch {}
        }

        const detail = result.detail ?? null;
        const scoresCandidate = result.scores ?? detail?.scores;
        const scores = isValidScoresObject(scoresCandidate)
          ? {
              player: toFiniteNumber(scoresCandidate.player ?? scoresCandidate.playerScore),
              opponent: toFiniteNumber(scoresCandidate.opponent ?? scoresCandidate.opponentScore)
            }
          : null;

        resolve({
          eventName: "match.concluded",
          detail,
          scores,
          winner: result.winner ?? detail?.winner ?? null,
          reason: result.reason ?? detail?.reason ?? null,
          elapsedMs: Date.now() - startTime,
          timedOut: result.timedOut === true,
          dom: null
        });
      };

      const handleMatchConcluded = (event) => {
        const detail = event?.detail ?? null;
        const scores = detail?.scores ?? null;
        finish({ detail, scores, timedOut: false });
      };

      try {
        onBattleEvent("match.concluded", handleMatchConcluded);
        listenerBound = true;
      } catch (error) {
        finish({
          detail: null,
          scores: null,
          timedOut: true,
          reason: error?.message ?? "listener-error"
        });
        return;
      }

      timeoutId = setTimeout(() => {
        finish({ detail: null, scores: null, timedOut: true });
      }, timeout);
    });
  },

  /**
   * Simulate an external script reverting the round counter display.
   *
   * @param {{
   *   round?: number|null,
   *   text?: string|null,
   *   highestRound?: number|null
   * }} [options]
   * @returns {{
   *   success: boolean,
   *   previousText: string|null,
   *   previousHighest: string|null,
   *   appliedText: string|null,
   *   appliedHighest: string|null,
   *   reason?: string
   * }} Snapshot describing the interference effect.
   */
  simulateRoundCounterInterference(options = {}) {
    const { round = null, text = null, highestRound = null } = options || {};

    try {
      const counter = document.getElementById("round-counter");
      if (!counter) {
        return {
          success: false,
          previousText: null,
          previousHighest: null,
          appliedText: null,
          appliedHighest: null,
          reason: "round-counter-missing"
        };
      }

      const previousText = String(counter.textContent ?? "");
      const previousHighest = counter.dataset?.highestRound ?? null;

      let appliedText = null;
      if (typeof text === "string") {
        appliedText = text;
      } else if (Number.isFinite(Number(round)) && Number(round) > 0) {
        appliedText = `Round ${Number(round)}`;
      }

      if (appliedText !== null) {
        counter.textContent = appliedText;
      }

      let appliedHighest = null;
      const numericHighest = Number(highestRound);
      if (Number.isFinite(numericHighest) && numericHighest > 0) {
        appliedHighest = String(numericHighest);
        if (counter.dataset) {
          counter.dataset.highestRound = appliedHighest;
        }
      } else if (counter.dataset && "highestRound" in counter.dataset) {
        delete counter.dataset.highestRound;
      }

      return {
        success: true,
        previousText,
        previousHighest,
        appliedText,
        appliedHighest
      };
    } catch (error) {
      return {
        success: false,
        previousText: null,
        previousHighest: null,
        appliedText: null,
        appliedHighest: null,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Advance from roundDisplay to roundWait state by dispatching the continue event.
   *
   * This is useful for tests that disable autoContinue and need to manually
   * progress through rounds. It bypasses UI interactions (clicking Next button)
   * and directly dispatches the state machine event.
   *
   * @returns {Promise<{success: boolean, error?: string, previousState?: string, nextState?: string}>}
   * @pseudocode
   * 1. Get the battle state machine
   * 2. Check if current state is roundDisplay
   * 3. If yes, dispatch "continue" event to transition to roundWait
   * 4. Return success status with state information
   * 5. If not at roundDisplay or machine unavailable, return error
   */
  async advanceRound() {
    try {
      const machine = getBattleStateMachine();
      if (!machine) {
        return { success: false, error: "State machine unavailable" };
      }

      const previousState = machine.getState?.() ?? null;

      if (previousState !== "roundDisplay") {
        return {
          success: false,
          error: `Cannot advance: not at roundDisplay (current: ${previousState})`,
          previousState
        };
      }

      await machine.dispatch("continue");

      const nextState = machine.getState?.() ?? null;

      return {
        success: true,
        previousState,
        nextState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Timer control API
const timerApi = {
  /**
   * Set countdown value directly without waiting for timer ticks
   * @param {number} seconds - Countdown value in seconds
   */
  setCountdown(seconds) {
    const applyCountdown = (value) => {
      try {
        const el = document.getElementById("cli-countdown");
        if (!el) return;
        const normalized = value ?? 0;
        el.dataset.remainingTime = String(normalized);
        try {
          el.setAttribute("data-remaining-time", String(normalized));
        } catch (err) {
          logDevWarning("Failed to set data-remaining-time attribute", err);
        }
        el.textContent = value !== null ? `Timer: ${String(normalized).padStart(2, "0")}` : "";
      } catch (err) {
        logDevWarning("Failed to apply countdown value", err);
      }
    };

    try {
      // Use existing battleCLI helper if available
      if (isWindowAvailable() && window.__battleCLIinit?.setCountdown) {
        const battleCLI = window.__battleCLIinit;
        let delegationSucceeded = false;

        try {
          if (battleCLI.__freezeUntil !== undefined) {
            battleCLI.__freezeUntil = 0;
          }
        } catch {}

        try {
          battleCLI.setCountdown(seconds);
          delegationSucceeded = true;
        } catch (err) {
          logDevDebug("Failed to delegate countdown to battleCLI", err);
        } finally {
          try {
            if (battleCLI && battleCLI.__freezeUntil !== undefined && !delegationSucceeded) {
              battleCLI.__freezeUntil = Date.now() + 500;
            }
          } catch {}
        }

        applyCountdown(seconds);
        return;
      }

      applyCountdown(seconds);
    } catch (err) {
      logDevWarning("Failed to set countdown via timer API", err);
    }
  },

  /**
   * Retrieve the active countdown value displayed in the UI.
   *
   * @pseudocode
   * 1. Gather both CLI-specific (`#cli-countdown`) and shared scoreboard (`data-testid="next-round-timer"`) elements.
   * 2. Attempt to parse a numeric value from dataset attributes (`data-remaining-time`).
   * 3. Fallback to parsing the countdown text content ("Timer", "Time Left", etc.).
   * 4. Return the parsed integer when available; otherwise return `null` to indicate no countdown.
   *
   * @returns {number|null} Countdown seconds or `null` when unavailable.
   */
  getCountdown() {
    try {
      if (typeof document === "undefined") return null;

      const parseTimerValue = (value) => {
        const numeric = Number.parseInt(String(value ?? ""), 10);
        return Number.isNaN(numeric) ? null : numeric;
      };

      const parseFromElement = (el) => {
        if (!el) return null;

        const datasetValue = el.getAttribute("data-remaining-time") ?? el.dataset?.remainingTime;
        const fromDataset = parseTimerValue(datasetValue);
        if (fromDataset !== null) {
          return fromDataset;
        }

        const text = el.textContent || "";
        const targetedMatch = text.match(/(?:Time\s*(?:Left|remaining)?:|Timer:)\s*(\d+)/i);
        if (targetedMatch) {
          return parseTimerValue(targetedMatch[1]);
        }

        const fallbackMatch = text.match(/(\d+)s?/);
        if (!fallbackMatch) return null;

        return parseTimerValue(fallbackMatch[1]);
      };

      const elements = [];
      const cliTimer = document.getElementById("cli-countdown");
      if (cliTimer) {
        elements.push(cliTimer);
      }

      const scoreboardTimer = document.querySelector('[data-testid="next-round-timer"]');
      if (scoreboardTimer && !elements.includes(scoreboardTimer)) {
        elements.push(scoreboardTimer);
      }

      for (const el of elements) {
        const parsed = parseFromElement(el);
        if (parsed !== null) return parsed;
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * Wait for the countdown to become available or reach a specific value.
   * @param {number|string|undefined} expectedValue - Value to wait for. When undefined, waits for any countdown value.
   * @param {{ timeoutMs?: number, pollIntervalMs?: number }|null} [options]
   * @returns {Promise<number|null>} Resolves with the observed countdown value when successful.
   */
  waitForCountdown(expectedValue, options) {
    if (typeof this.getCountdown !== "function") {
      return Promise.reject(new Error("timerApi.getCountdown is not available."));
    }

    const config = options ?? {};
    const requestedTimeout = config.timeoutMs;
    const requestedPoll = config.pollIntervalMs;

    const normalizedTimeout =
      requestedTimeout === undefined
        ? 5_000
        : requestedTimeout === Infinity
          ? Infinity
          : Number.isFinite(requestedTimeout) && requestedTimeout >= 0
            ? requestedTimeout
            : 5_000;

    const normalizedPoll = Number.isFinite(requestedPoll) && requestedPoll > 0 ? requestedPoll : 50;

    const expectedProvided = typeof expectedValue !== "undefined";
    const parsedExpected = expectedProvided ? Number.parseInt(String(expectedValue), 10) : null;
    const hasNumericExpectation = expectedProvided && Number.isFinite(parsedExpected);

    return new Promise((resolve, reject) => {
      let lastObserved = null;
      let settled = false;
      let intervalId = null;
      let timeoutId = null;

      const cleanup = () => {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const settle = (callback) => (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };

      const resolveSafe = settle(resolve);
      const rejectSafe = settle(reject);

      const readCountdownValue = () => {
        try {
          return this.getCountdown();
        } catch (error) {
          logDevDebug("[timers.waitForCountdown] Failed to read countdown", error);
          return null;
        }
      };

      const matchesExpectation = (value) => {
        if (!expectedProvided) {
          return value !== null;
        }

        if (value === null) {
          return false;
        }

        return hasNumericExpectation
          ? value === parsedExpected
          : String(value) === String(expectedValue);
      };

      const checkValue = () => {
        if (settled) return;
        const current = readCountdownValue();
        if (current !== undefined) {
          lastObserved = current;
        }

        if (matchesExpectation(current ?? null)) {
          resolveSafe(current ?? null);
        }
      };

      if (normalizedTimeout !== Infinity) {
        const timeoutMs = normalizedTimeout;
        timeoutId = setTimeout(() => {
          const baseMessage = expectedProvided
            ? `Countdown did not reach ${String(expectedValue)}`
            : "Countdown value did not become available";
          const detail =
            typeof lastObserved === "number"
              ? `last observed ${lastObserved}`
              : "last observed null";
          const error = new Error(`${baseMessage} within ${timeoutMs}ms (${detail})`);
          error.name = "TimeoutError";
          rejectSafe(error);
        }, timeoutMs);
      }

      intervalId = setInterval(checkValue, normalizedPoll);
      checkValue();
    });
  },

  /**
   * Skip cooldown immediately without waiting
   */
  skipCooldown() {
    try {
      emitBattleEvent("countdownFinished");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Complete stat selection timer immediately
   */
  expireSelectionTimer() {
    try {
      emitBattleEvent("statSelectionStalled");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Override the simulated opponent message delay used by the UI layer.
   * @param {number|null|undefined} delayMs - Delay in milliseconds (reset when nullish)
   * @returns {boolean} True when the delay override is applied
   */
  setOpponentResolveDelay(delayMs) {
    try {
      if (typeof window === "undefined") return false;

      if (delayMs === null || delayMs === undefined) {
        if (Object.prototype.hasOwnProperty.call(window, "__OPPONENT_RESOLVE_DELAY_MS")) {
          delete window.__OPPONENT_RESOLVE_DELAY_MS;
        }
        return true;
      }

      const numeric = toFiniteNumber(delayMs);
      if (numeric === null || numeric < 0) {
        throw new Error(`Invalid delay value: ${delayMs}. Must be a non-negative finite number.`);
      }

      window.__OPPONENT_RESOLVE_DELAY_MS = numeric;
      return true;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to set opponent resolve delay", error);
      }
      return false;
    }
  },

  /**
   * Read the currently configured opponent message delay override when present.
   * @returns {number|null} Delay value in milliseconds or null when unset.
   */
  getOpponentResolveDelay() {
    try {
      if (typeof window === "undefined") {
        return null;
      }

      const value = window.__OPPONENT_RESOLVE_DELAY_MS;
      if (value === undefined || value === null) {
        return null;
      }

      return toFiniteNumber(value);
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to read opponent resolve delay", error);
      }
      return null;
    }
  },

  /**
   * Clear all active timers
   */
  clearAllTimers() {
    try {
      // Clear battleCLI timers if available
      if (isWindowAvailable() && window.__battleCLITimers) {
        Object.values(window.__battleCLITimers).forEach((timer) => {
          if (typeof timer === "number") {
            clearTimeout(timer);
            clearInterval(timer);
          }
        });
      }

      // Clear common timer elements
      const timerElements = ["selectionTimer", "cooldownTimer", "statTimeoutId", "autoSelectId"];
      timerElements.forEach((prop) => {
        if (isWindowAvailable() && window[prop]) {
          clearTimeout(window[prop]);
          clearInterval(window[prop]);
          window[prop] = null;
        }
      });

      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Minimal battle engine facade for Playwright specs.
 */
const engineApi = {
  /**
   * Access the current engine instance when available.
   * @returns {import("./BattleEngine.js").BattleEngine|null}
   */
  require() {
    try {
      return requireEngine();
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to require battle engine", error);
      }
      return null;
    }
  },

  /**
   * Override the points-to-win target for deterministic match setup.
   * @param {number} value - Desired target score.
   * @returns {boolean} True when the update succeeds.
   */
  setPointsToWin(value) {
    try {
      facadeSetPointsToWin(value);
      return true;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to set points to win", error);
      }
      return false;
    }
  },

  /**
   * Read the current points-to-win target from the engine.
   * @returns {number|null} Numeric target when available.
   */
  getPointsToWin() {
    try {
      const value = facadeGetPointsToWin();
      return toFiniteNumber(value);
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to get points to win", error);
      }
      return null;
    }
  },

  /**
   * Retrieve the current match score snapshot from the engine.
   * @returns {{ player: number, opponent: number }|null}
   */
  getScores() {
    try {
      const scores = facadeGetScores();
      if (!scores || typeof scores !== "object") {
        return null;
      }

      const player = Number(scores.playerScore ?? scores.player);
      const opponent = Number(scores.opponentScore ?? scores.opponent);
      if (!Number.isFinite(player) || !Number.isFinite(opponent)) {
        return null;
      }

      return { player, opponent };
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to read engine scores", error);
      }
      return null;
    }
  },

  /**
   * Expose the rounds played counter as reported by the engine.
   * @returns {number|null}
   */
  getRoundsPlayed() {
    try {
      const value = facadeGetRoundsPlayed();
      return toFiniteNumber(value);
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("Failed to read rounds played", error);
      }
      return null;
    }
  },

  /**
   * Wait for the engine to report the requested points-to-win target.
   * @param {number} target - Desired points-to-win value.
   * @param {number} timeout - Timeout window in milliseconds.
   * @returns {Promise<boolean>} Resolves true when the target is observed.
   */
  async waitForPointsToWin(target, timeout = 5000) {
    const desired = toFiniteNumber(target);
    if (desired === null) {
      return false;
    }

    const readCurrent = () => {
      try {
        const current = this.getPointsToWin();
        return typeof current === "number" && Number.isFinite(current) ? current : null;
      } catch {
        return null;
      }
    };

    if (readCurrent() === desired) {
      return true;
    }

    return await new Promise((resolve) => {
      const startTime = Date.now();
      const check = () => {
        const current = readCurrent();
        if (current === desired) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }

        setTimeout(check, 50);
      };

      check();
    });
  },

  /**
   * Wait for the engine to report the desired number of completed rounds.
   * Mirrors the state API helper so Playwright tests can rely on either entry point.
   *
   * @param {number} targetRounds - Desired rounds played threshold.
   * @param {number} [timeout=5000] - Timeout window in milliseconds.
   * @returns {Promise<boolean>} Resolves true when threshold met, false on timeout.
   */
  async waitForRoundsPlayed(targetRounds, timeout = 5000) {
    const desired = toFiniteNumber(targetRounds);
    if (desired === null || desired < 0) {
      return false;
    }

    if (stateApi && typeof stateApi.waitForRoundsPlayed === "function") {
      try {
        const satisfied = await stateApi.waitForRoundsPlayed(targetRounds, timeout);
        if (satisfied) {
          return true;
        }
      } catch (error) {
        if (isDevelopmentEnvironment()) {
          logDevDebug("[engine.waitForRoundsPlayed] state fallback failed", error);
        }
      }
    }

    const readCurrentRounds = () => this.getRoundsPlayed();

    return new Promise((resolve) => {
      const startTime = Date.now();
      const deadline = startTime + timeout;

      const checkIfSatisfied = () => {
        const rounds = readCurrentRounds();
        if (typeof rounds === "number" && rounds >= desired) {
          resolve(true);
          return true;
        }

        if (Date.now() >= deadline) {
          resolve(false);
          return true;
        }

        return false;
      };

      let timeoutId;
      if (!checkIfSatisfied()) {
        const intervalId = setInterval(() => {
          if (checkIfSatisfied()) {
            clearInterval(intervalId);
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        }, 50);

        timeoutId = setTimeout(
          () => {
            clearInterval(intervalId);
            resolve(false);
          },
          Math.max(0, deadline - Date.now())
        );
      }
    });
  }
};

const defaultBrowseSnapshot = Object.freeze({ isReady: false, cardCount: 0 });

const browseReadyState = {
  ready: false,
  snapshot: defaultBrowseSnapshot,
  resolvers: new Set()
};

function normalizeBrowseSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return { ...defaultBrowseSnapshot };
  }

  const count =
    Number.isFinite(snapshot.cardCount) && snapshot.cardCount >= 0
      ? snapshot.cardCount
      : defaultBrowseSnapshot.cardCount;
  return {
    isReady: snapshot.isReady === true,
    cardCount: count
  };
}

function publishBrowseReadySnapshot(snapshot) {
  const normalized = normalizeBrowseSnapshot(snapshot);
  browseReadyState.ready = normalized.isReady;
  browseReadyState.snapshot = normalized;

  for (const resolver of Array.from(browseReadyState.resolvers)) {
    try {
      resolver(normalized);
    } finally {
      browseReadyState.resolvers.delete(resolver);
    }
  }

  return normalized;
}

function resetBrowseReadySnapshot() {
  browseReadyState.ready = false;
  browseReadyState.snapshot = { ...defaultBrowseSnapshot };

  for (const resolver of Array.from(browseReadyState.resolvers)) {
    try {
      resolver({ ...browseReadyState.snapshot });
    } finally {
      browseReadyState.resolvers.delete(resolver);
    }
  }
}

// Component initialization API
let battleCliModuleResetCount = 0;

const initApi = {
  /**
   * Check if battle components are fully initialized
   * @returns {boolean} True when ready
   */
  isBattleReady() {
    try {
      if (isWindowAvailable()) {
        const store =
          typeof window.battleStore === "object" && window.battleStore !== null
            ? window.battleStore
            : null;
        const orchestratorAttached = !!(
          store &&
          (typeof store.orchestrator === "object" || typeof store.orchestrator === "function")
        );

        // Check for various readiness indicators
        return !!(
          orchestratorAttached ||
          window.battleReadyPromise ||
          window.__initCalled ||
          getBattleStateMachine()
        );
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Wait for battle components to be ready
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when ready, false on timeout
   */
  async waitForBattleReady(timeout = 10000) {
    return new Promise((resolve) => {
      if (this.isBattleReady()) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const check = () => {
        if (this.isBattleReady()) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }

        setTimeout(check, 100);
      };

      check();
    });
  },

  /**
   * Apply deterministic configuration for classic battle scenarios.
   * @param {{
   *   roundTimerMs?: number|null,
   *   cooldownMs?: number|null,
   *   showRoundSelectModal?: boolean,
   *   skipRoundCooldown?: boolean,
   *   enableTestMode?: boolean,
   *   seed?: number|null,
   *   pointsToWin?: number|null,
   *   confirmPointsToWin?: boolean,
   *   pointsToWinConfirmTimeout?: number,
   *   battleReadyTimeout?: number
   * }} [options]
   * @returns {Promise<{ ok: boolean, applied: object, errors: string[] }>}
   */
  async configureClassicBattle(options = {}) {
    const {
      roundTimerMs,
      cooldownMs,
      showRoundSelectModal = true,
      skipRoundCooldown = false,
      enableTestMode = true,
      seed = null,
      pointsToWin = null,
      confirmPointsToWin = true,
      pointsToWinConfirmTimeout = 5000,
      battleReadyTimeout = 10000
    } = options ?? {};

    const result = {
      ok: true,
      applied: {
        timers: false,
        cooldown: false,
        featureFlag: false,
        testMode: false,
        pointsToWin: false
      },
      errors: []
    };

    const recordError = (message) => {
      result.ok = false;
      if (message) {
        result.errors.push(String(message));
      }
    };

    const globalTarget =
      isWindowAvailable() && window
        ? window
        : typeof globalThis !== "undefined"
          ? globalThis
          : null;

    if (roundTimerMs !== undefined) {
      try {
        if (roundTimerMs === null) {
          if (globalTarget?.__OVERRIDE_TIMERS) {
            delete globalTarget.__OVERRIDE_TIMERS.roundTimer;
          }
        } else {
          const numeric = toFiniteNumber(roundTimerMs);
          if (numeric === null || numeric < 0) {
            throw new Error(`Invalid roundTimerMs value: ${roundTimerMs}`);
          }
          const existing =
            globalTarget && typeof globalTarget.__OVERRIDE_TIMERS === "object"
              ? { ...globalTarget.__OVERRIDE_TIMERS }
              : {};
          existing.roundTimer = numeric;
          if (globalTarget) {
            globalTarget.__OVERRIDE_TIMERS = existing;
          }
        }
        result.applied.timers = true;
      } catch (error) {
        recordError(error?.message ?? "roundTimerMs configuration failed");
      }
    }

    if (cooldownMs !== undefined) {
      try {
        if (cooldownMs === null) {
          if (
            globalTarget &&
            Object.prototype.hasOwnProperty.call(globalTarget, "__NEXT_ROUND_COOLDOWN_MS")
          ) {
            delete globalTarget.__NEXT_ROUND_COOLDOWN_MS;
          }
        } else {
          const numeric = toFiniteNumber(cooldownMs);
          if (numeric === null || numeric < 0) {
            throw new Error(`Invalid cooldownMs value: ${cooldownMs}`);
          }
          if (globalTarget) {
            globalTarget.__NEXT_ROUND_COOLDOWN_MS = numeric;
          }
        }
        result.applied.cooldown = true;
      } catch (error) {
        recordError(error?.message ?? "cooldown override failed");
      }
    }

    try {
      if (globalTarget) {
        const overrides =
          typeof globalTarget.__FF_OVERRIDES === "object" && globalTarget.__FF_OVERRIDES !== null
            ? { ...globalTarget.__FF_OVERRIDES }
            : {};
        if (showRoundSelectModal) {
          overrides.showRoundSelectModal = true;
        } else {
          delete overrides.showRoundSelectModal;
        }
        if (skipRoundCooldown) {
          overrides.skipRoundCooldown = true;
        } else {
          delete overrides.skipRoundCooldown;
        }
        globalTarget.__FF_OVERRIDES = overrides;
      }
      result.applied.featureFlag = true;
    } catch (error) {
      recordError(error?.message ?? "feature flag override failed");
    }

    if (enableTestMode !== undefined || seed !== undefined) {
      try {
        const numericSeed = seed === null || seed === undefined ? undefined : Number(seed);
        const resolvedSeed = Number.isFinite(numericSeed) ? numericSeed : undefined;
        setTestMode({ enabled: enableTestMode !== false, seed: resolvedSeed });
        if (globalTarget) {
          globalTarget.__TEST_MODE = { enabled: enableTestMode !== false, seed: resolvedSeed };
        }
        result.applied.testMode = true;
      } catch (error) {
        recordError(error?.message ?? "test mode configuration failed");
      }
    }

    if (typeof pointsToWin === "number" && Number.isFinite(pointsToWin)) {
      const ready = await this.waitForBattleReady(battleReadyTimeout);
      if (!ready) {
        recordError("battle did not become ready before applying pointsToWin");
      } else {
        try {
          const applied = engineApi.setPointsToWin(pointsToWin);
          if (!applied) {
            recordError("engine.setPointsToWin returned false");
          } else {
            result.applied.pointsToWin = true;
            if (
              confirmPointsToWin !== false &&
              typeof engineApi.waitForPointsToWin === "function"
            ) {
              const confirmed = await engineApi.waitForPointsToWin(
                pointsToWin,
                pointsToWinConfirmTimeout
              );
              if (!confirmed) {
                recordError("Timed out confirming pointsToWin");
              }
            }
          }
        } catch (error) {
          recordError(error?.message ?? "pointsToWin configuration failed");
        }
      }
    }

    return result;
  },

  /**
   * Determine whether the browse carousel has reported readiness.
   *
   * @pseudocode
   * 1. Return the cached readiness flag maintained by the browse fixtures.
   *
   * @returns {boolean} True when the browse page signaled readiness.
   */
  isBrowseReady() {
    return browseReadyState.ready;
  },

  /**
   * Retrieve the most recent readiness snapshot from the browse carousel.
   *
   * @pseudocode
   * 1. Return a shallow copy of the stored snapshot to prevent external mutation.
   *
   * @returns {{ isReady: boolean, cardCount: number }} Snapshot metadata.
   */
  getBrowseReadySnapshot() {
    return { ...browseReadyState.snapshot };
  },

  /**
   * Wait for the browse carousel to finish rendering.
   *
   * @pseudocode
   * 1. Resolve immediately when the cached snapshot is already marked ready.
   * 2. Otherwise register a resolver that will fire when readiness is published.
   * 3. Apply a timeout so tests receive the latest snapshot even if readiness never occurs.
   * 4. Return the snapshot that triggered resolution (ready or fallback).
   *
   * @param {number} [timeout=5000] - Timeout in milliseconds.
   * @returns {Promise<{ isReady: boolean, cardCount: number }>} Readiness snapshot.
   */
  async waitForBrowseReady(timeout = 5000) {
    const currentSnapshot = this.getBrowseReadySnapshot();
    if (currentSnapshot.isReady) {
      return currentSnapshot;
    }

    return new Promise((resolve) => {
      let finished = false;
      let timeoutId = null;

      const cleanup = (snapshot) => {
        if (finished) return;
        finished = true;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        resolve(snapshot);
      };

      const resolver = (snapshot) => {
        browseReadyState.resolvers.delete(resolver);
        cleanup(snapshot);
      };

      browseReadyState.resolvers.add(resolver);

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          browseReadyState.resolvers.delete(resolver);
          cleanup(this.getBrowseReadySnapshot());
        }, timeout);
      }
    });
  },

  /**
   * @internal
   * Update the cached browse readiness snapshot.
   * @param {{ isReady?: boolean, cardCount?: number }} snapshot
   */
  __updateBrowseReadySnapshot(snapshot) {
    publishBrowseReadySnapshot(snapshot);
  },

  /**
   * @internal
   * Reset cached browse readiness information.
   */
  __resetBrowseReadySnapshot() {
    resetBrowseReadySnapshot();
  },

  /**
   * Attempt to reset the Battle CLI module state via exposed helpers.
   *
   * @returns {Promise<{ ok: boolean, count: number, reason: string | null }>} Result metadata.
   */
  async resetBattleCliModuleState() {
    if (typeof window === "undefined") {
      return { ok: false, count: battleCliModuleResetCount, reason: "window unavailable" };
    }

    const init = window.__battleCLIinit;
    if (!init || typeof init.__resetModuleState !== "function") {
      return {
        ok: false,
        count: battleCliModuleResetCount,
        reason: "__battleCLIinit.__resetModuleState unavailable"
      };
    }

    try {
      await Promise.resolve(init.__resetModuleState());
      battleCliModuleResetCount += 1;
      return { ok: true, count: battleCliModuleResetCount, reason: null };
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : String(error ?? "unknown error");
      return { ok: false, count: battleCliModuleResetCount, reason };
    }
  },

  /**
   * Read how many times the Battle CLI module reset helper has executed.
   *
   * @returns {number} Invocation count.
   */
  getBattleCliModuleResetCount() {
    return battleCliModuleResetCount;
  },

  /**
   * Internal helper for tests to reset the Battle CLI module reset counter.
   *
   * @returns {number} The reset count (always 0).
   */
  __resetBattleCliModuleResetCount() {
    battleCliModuleResetCount = 0;
    return battleCliModuleResetCount;
  }
};

// Component inspection API
const inspectionApi = {
  /**
   * Get a snapshot of the current feature flag states.
   * @returns {Record<string, { enabled: boolean, stored: boolean, override?: boolean }>}
   */
  getFeatureFlags() {
    try {
      const cached = typeof getCachedSettings === "function" ? getCachedSettings() : null;
      const defaultFlags =
        DEFAULT_SETTINGS &&
        typeof DEFAULT_SETTINGS === "object" &&
        DEFAULT_SETTINGS !== null &&
        !Array.isArray(DEFAULT_SETTINGS.featureFlags)
          ? DEFAULT_SETTINGS.featureFlags || {}
          : {};
      const cachedFlags =
        cached &&
        typeof cached === "object" &&
        cached !== null &&
        !Array.isArray(cached) &&
        typeof cached.featureFlags === "object" &&
        cached.featureFlags !== null
          ? cached.featureFlags
          : {};
      let overrides = {};
      try {
        if (
          isWindowAvailable() &&
          window.__FF_OVERRIDES &&
          typeof window.__FF_OVERRIDES === "object"
        ) {
          overrides = window.__FF_OVERRIDES;
        }
      } catch {}

      return buildFeatureFlagSnapshot({
        defaults: defaultFlags,
        persisted: cachedFlags,
        overrides
      });
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        try {
          if (typeof console !== "undefined" && typeof console.debug === "function") {
            console.debug("testApi.inspect.getFeatureFlags failed", error);
          }
        } catch {}
      }
      return {};
    }
  },
  /**
   * Get battle store state for inspection
   * @returns {object|null} Battle store or null
   */
  getBattleStore() {
    try {
      return isWindowAvailable() ? window.battleStore : null;
    } catch {
      return null;
    }
  },

  /**
   * Read a normalized battle snapshot for assertions.
   * @returns {{ roundsPlayed: number|null, selectionMade: boolean|null, playerScore: number|null, opponentScore: number|null }|null}
   */
  getBattleSnapshot() {
    try {
      const store = this.getBattleStore();

      const normalizeBoolean = (value) => {
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (normalized === "true") return true;
          if (normalized === "false") return false;
        }
        return null;
      };

      const extract = (key, transform = (v) => v) =>
        store && Object.prototype.hasOwnProperty.call(store, key) ? transform(store[key]) : null;

      const selectionFromStore = extract("selectionMade", normalizeBoolean);
      const selectionFinalized = getSelectionFinalized(store);

      // Resolution logic: if BOTH are explicitly false, return false
      // Otherwise, if EITHER is true, return true
      const resolvedSelection =
        selectionFromStore === false && selectionFinalized === false
          ? false
          : selectionFromStore === true || selectionFinalized
            ? true
            : null;

      let playerScore = null;
      let opponentScore = null;
      try {
        const scores = facadeGetScores();
        if (scores && typeof scores === "object") {
          playerScore = toFiniteNumber(scores.playerScore ?? scores.player);
          opponentScore = toFiniteNumber(scores.opponentScore ?? scores.opponent);
        }
      } catch {
        playerScore = null;
        opponentScore = null;
      }

      const snapshot = {
        roundsPlayed: extract("roundsPlayed", (value) => toFiniteNumber(value)),
        selectionMade: resolvedSelection,
        playerScore,
        opponentScore
      };

      if (!isValidBattleSnapshot(snapshot)) {
        if (isDevelopmentEnvironment()) {
          logDevWarning("testApi.inspect.getBattleSnapshot: Invalid snapshot structure detected", {
            hasRoundsPlayed: snapshot.roundsPlayed !== null,
            hasPlayerScore: snapshot.playerScore !== null,
            hasOpponentScore: snapshot.opponentScore !== null
          });
        }
        return null;
      }

      return snapshot;
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("testApi.inspect.getBattleSnapshot failed", error);
      }
      return null;
    }
  },

  /**
   * Compute a stat comparison for the active round.
   * @returns {Array<{ key: string, normalizedKey: string, player: number, opponent: number, delta: number }>}
   */
  getRoundStatComparison() {
    try {
      const store = this.getBattleStore();
      const playerStats = store?.currentPlayerJudoka?.stats ?? null;
      const opponentStats = store?.currentOpponentJudoka?.stats ?? null;
      if (!playerStats || !opponentStats) {
        if (isDevelopmentEnvironment() && (playerStats || opponentStats)) {
          logDevWarning("testApi.getRoundStatComparison: Missing one or both stats objects", {
            hasPlayerStats: !!playerStats,
            hasOpponentStats: !!opponentStats
          });
        }
        return [];
      }

      if (!isValidStatsObject(playerStats) || !isValidStatsObject(opponentStats)) {
        if (isDevelopmentEnvironment()) {
          logDevWarning("testApi.getRoundStatComparison: Invalid stats structure detected", {
            playerValid: isValidStatsObject(playerStats),
            opponentValid: isValidStatsObject(opponentStats)
          });
        }
        return [];
      }

      const keys = Array.from(
        new Set([...Object.keys(playerStats ?? {}), ...Object.keys(opponentStats ?? {})])
      );

      const comparisons = [];
      for (const key of keys) {
        const canonicalKey = String(key ?? "").trim();
        if (!canonicalKey) {
          continue;
        }

        const playerValue = extractStatValue(playerStats, canonicalKey);
        const opponentValue = extractStatValue(opponentStats, canonicalKey);
        if (!Number.isFinite(playerValue) || !Number.isFinite(opponentValue)) {
          continue;
        }

        comparisons.push({
          key: canonicalKey,
          normalizedKey: canonicalKey.toLowerCase(),
          player: playerValue,
          opponent: opponentValue,
          delta: playerValue - opponentValue
        });
      }

      return comparisons.sort((a, b) => b.delta - a.delta);
    } catch (error) {
      if (isDevelopmentEnvironment()) {
        logDevWarning("testApi.inspect.getRoundStatComparison failed", error);
      }
      return [];
    }
  },

  /**
   * Determine which stat currently favours the player.
   * @param {{ requirePositiveDelta?: boolean }} [options]
   * @returns {{ key: string|null, normalizedKey: string|null, player: number|null, opponent: number|null, delta: number|null }}
   */
  pickAdvantagedStatKey(options = {}) {
    const { requirePositiveDelta = false } = options ?? {};
    const comparisons = this.getRoundStatComparison();
    if (!comparisons.length) {
      return { key: null, normalizedKey: null, player: null, opponent: null, delta: null };
    }

    const positive = comparisons.find((entry) => entry.delta > 0);
    const candidate = positive ?? comparisons[0];
    if (!candidate) {
      return { key: null, normalizedKey: null, player: null, opponent: null, delta: null };
    }

    if (requirePositiveDelta && !(candidate.delta > 0)) {
      return {
        key: null,
        normalizedKey: candidate.normalizedKey ?? null,
        player: candidate.player ?? null,
        opponent: candidate.opponent ?? null,
        delta: candidate.delta ?? null
      };
    }

    return {
      key: candidate.key ?? null,
      normalizedKey: candidate.normalizedKey ?? null,
      player: candidate.player ?? null,
      opponent: candidate.opponent ?? null,
      delta: candidate.delta ?? null
    };
  },

  /**
   * Get debug information about the current battle state
   * @returns {object} Debug information
   */
  getDebugInfo() {
    try {
      const store = this.getBattleStore();
      const machine = getBattleStateMachine();
      const engineRounds = stateApi.getRoundsPlayed();
      const selectionFinalized = getSelectionFinalized(store);
      const selectionFromStore =
        typeof store?.selectionMade === "boolean" ? store.selectionMade : null;
      const resolvedSelectionMade =
        selectionFromStore === true || selectionFinalized
          ? true
          : selectionFromStore === false
            ? selectionFinalized
              ? true
              : false
            : selectionFinalized
              ? true
              : null;
      const roundsPlayed =
        typeof engineRounds === "number" && Number.isFinite(engineRounds)
          ? engineRounds
          : toFiniteNumber(store?.roundsPlayed);
      let snapshot = null;

      if (machine) {
        try {
          snapshot = getStateSnapshot();
        } catch {
          snapshot = null;
        }
      }

      return {
        store: store
          ? {
              selectionMade: resolvedSelectionMade,
              playerChoice: store.playerChoice,
              roundsPlayed
            }
          : null,
        machine: machine
          ? {
              currentState: machine.getState?.(),
              hasDispatch: typeof machine.dispatch === "function"
            }
          : null,
        snapshot
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

/**
 * Wait for battle state to transition into a target set of states.
 * Handles both "outcome dispatch" case (waiting for success states) and
 * "no outcome" case (waiting for non-transitional states).
 *
 * @param {boolean} outcomePending - Whether an outcome event was dispatched
 * @param {Set<string>} successStates - States that indicate completion when outcome pending
 * @param {Set<string>} transitionalStates - Transitional states to skip when no outcome
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<{finalState: string|null, lastSuccessfulState: string|null, roundDisplayObserved: boolean, timedOut: boolean}>}
 * @internal
 */
async function waitForStateTransition(
  outcomePending,
  successStates,
  transitionalStates,
  timeoutMs
) {
  const readCurrentState = () => {
    try {
      return stateApi.getBattleState();
    } catch (error) {
      logDevDebug("[waitForStateTransition] Failed to read battle state", error);
      return null;
    }
  };

  const captureState = (tracker, state) => {
    if (!state) return;
    if (state === "roundDisplay") {
      tracker.roundDisplayObserved = true;
    }
    if (successStates.has(state)) {
      tracker.lastSuccessfulState = state;
    }
  };

  const tracker = { finalState: null, lastSuccessfulState: null, roundDisplayObserved: false };
  const deadline = Date.now() + timeoutMs;
  let timedOut = false;

  while (true) {
    tracker.finalState = readCurrentState();
    captureState(tracker, tracker.finalState);

    if (outcomePending && successStates.has(tracker.finalState)) {
      break;
    }
    if (!outcomePending && !transitionalStates.has(tracker.finalState)) {
      break;
    }
    if (Date.now() >= deadline) {
      timedOut = true;
      break;
    }

    await waitForNextFrame();
  }

  return { ...tracker, timedOut };
}

/**
 * Map outcome result to a state machine event name.
 * Handles various outcome formats returned from round resolution.
 *
 * @param {string|null|undefined} outcome - Outcome string from result
 * @returns {string|null} Event name like "outcome=winPlayer" or null
 * @internal
 */
function mapOutcomeToEvent(outcome) {
  if (typeof outcome !== "string" || outcome.length === 0) {
    return null;
  }
  if (outcome === "winPlayer" || outcome === "matchWinPlayer") {
    return "outcome=winPlayer";
  }
  if (outcome === "winOpponent" || outcome === "matchWinOpponent") {
    return "outcome=winOpponent";
  }
  if (outcome === "draw") {
    return "outcome=draw";
  }
  return null;
}

// Battle CLI API
const cliApi = {
  /**
   * Resolve the active round through the classic battle machine.
   *
   * @param {object} [eventLike]
   * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
   * @pseudocode
   * get battle store and player choice
   * import roundResolver and call resolveRound with proper values
   * this executes full resolution pipeline including opponent reveal
   * return resolution details
   */
  async resolveRound(eventLike = {}) {
    try {
      const store = isWindowAvailable() ? window.battleStore : null;
      if (!store || !store.playerChoice) {
        // Fall back to event-only resolution if no selection made
        const dispatch = (detail) => stateApi.dispatchBattleEvent("round.evaluated", detail);
        const emitOpponentReveal = (detail) => emitBattleEvent("opponentReveal", detail);
        const emit = (detail) => emitBattleEvent("round.evaluated", detail);
        const getStore = () => store;

        return resolveRoundForCliTest(eventLike, {
          dispatch,
          emitOpponentReveal,
          emit,
          getStore
        });
      }

      // Import and call actual resolution logic
      const { resolveRound: resolveRoundLogic } = await import(
        "/src/helpers/classicBattle/roundResolver.js"
      );
      const { getStatValue } = await import("/src/helpers/battle/index.js");

      const stat = store.playerChoice;
      // Cache player card element for efficient repeated access
      const playerCard =
        store.playerCardEl || (store.playerCardEl = document.getElementById("player-card"));
      // Cache opponent card element for efficient repeated access
      const opponentCard =
        store.opponentCardEl || (store.opponentCardEl = document.getElementById("opponent-card"));

      if (!playerCard || !opponentCard) {
        throw new Error("Missing player or opponent card");
      }

      const playerVal = getStatValue(playerCard, stat);
      const opponentVal = getStatValue(opponentCard, stat);

      // Execute full resolution: evaluates outcome, increments roundsPlayed, emits events
      const result = await resolveRoundLogic(store, stat, playerVal, opponentVal);

      return {
        detail: {
          store,
          stat,
          playerVal,
          opponentVal,
          result
        },
        dispatched: true,
        emitted: true
      };
    } catch (error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
        console.error("Failed to resolve round:", error);
      }
      throw error;
    }
  },

  /**
   * Read the CLI verbose log and normalize the text entries.
   *
   * @returns {string[]} Array of timestamped state transition lines.
   * @pseudocode
   * 1. If `document` is unavailable, return an empty array.
   * 2. Locate `<pre id="cli-verbose-log">`; return empty array when missing.
   * 3. Split `textContent` into lines, trimming whitespace around each.
   * 4. Filter blank lines and return the resulting array.
   */
  readVerboseLog() {
    try {
      if (
        typeof document === "undefined" ||
        !document ||
        typeof document.getElementById !== "function"
      ) {
        return [];
      }

      const pre = document.getElementById("cli-verbose-log");
      if (!pre) return [];

      const textContent = pre.textContent;
      if (textContent === null || textContent === undefined) {
        return [];
      }

      return String(textContent)
        .split(/\r?\n/)
        .map((line) => String(line).trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      logDevWarning("Failed to read CLI verbose log", error);
      return [];
    }
  },

  /**
   * Deterministically complete the active CLI round without long waits.
   *
   * @param {object} [roundInput] - Event-like payload forwarded to resolveRound.
   * @param {{
   *   outcomeEvent?: string|null,
   *   expireSelection?: boolean,
   *   opponentResolveDelayMs?: number|undefined,
   *   autoWaitTimeoutMs?: number|undefined
   * }} [options]
   * @returns {Promise<{
   *   detail: object,
   *   outcomeEvent: string|null,
   *   outcomeDispatched: boolean,
   *   finalState: string|null,
   *   dispatched: boolean,
   *   emitted: boolean
   * }>}
   * @pseudocode
   * if options.expireSelection -> timerApi.expireSelectionTimer()
   * if options.opponentResolveDelayMs defined -> timerApi.setOpponentResolveDelay(value)
   * resolution = await resolveRound(roundInput)
   * if options.outcomeEvent -> dispatch outcome event with resolution.detail
   * return detail + dispatch flags + current battle state
   */
  async completeRound(roundInput = {}, options = {}) {
    const {
      outcomeEvent = null,
      expireSelection = true,
      opponentResolveDelayMs,
      autoWaitTimeoutMs
    } = options ?? {};

    if (expireSelection && typeof timerApi.expireSelectionTimer === "function") {
      try {
        timerApi.expireSelectionTimer();
      } catch (error) {
        logDevDebug("Failed to expire selection timer", error);
      }
    }

    if (opponentResolveDelayMs !== undefined) {
      try {
        timerApi.setOpponentResolveDelay(opponentResolveDelayMs);
      } catch (error) {
        logDevDebug("Failed to set opponent resolve delay", error);
      }
    }

    const resolution = await this.resolveRound(roundInput);
    const detail = resolution?.detail ?? {};

    // Determine outcome event to dispatch
    const detailOutcomeEvent =
      typeof detail?.result?.outcomeEvent === "string" && detail?.result?.outcomeEvent?.length
        ? detail.result.outcomeEvent
        : null;
    const derivedOutcomeEvent =
      detailOutcomeEvent ?? mapOutcomeToEvent(detail?.result?.outcome ?? detail?.outcome);
    const resolvedOutcomeEvent = outcomeEvent ?? derivedOutcomeEvent ?? null;

    let outcomeDispatched = false;

    // Dispatch outcome event if needed
    if (resolvedOutcomeEvent) {
      try {
        const dispatched = await stateApi.dispatchBattleEvent(resolvedOutcomeEvent, detail);
        outcomeDispatched = dispatched !== false;

        // If auto-dispatched, handle follow-up events
        if (!outcomeEvent && outcomeDispatched) {
          const postOutcomeState = stateApi.getBattleState();
          if (postOutcomeState === "roundDisplay") {
            const followupEvent = detail?.result?.matchEnded ? "matchPointReached" : "continue";
            if (followupEvent) {
              try {
                await stateApi.dispatchBattleEvent(followupEvent, detail);
              } catch (error) {
                logDevDebug("[completeRound] Follow-up event dispatch error", {
                  followupEvent,
                  error
                });
              }
            }
          }
        }
      } catch (error) {
        logDevDebug("[completeRound] Outcome dispatch error", {
          outcomeEvent: resolvedOutcomeEvent,
          error
        });
        outcomeDispatched = false;
      }
    }

    // Wait for state transitions
    const successStates = new Set(["roundDisplay", "roundWait", "matchDecision", "matchOver"]);
    const transitionalStates = new Set(["roundResolve", "roundDisplay"]);
    const timeoutMs = autoWaitTimeoutMs ?? 2_000;

    const stateResult = await waitForStateTransition(
      !!resolvedOutcomeEvent,
      successStates,
      transitionalStates,
      timeoutMs
    );

    const normalizedState =
      stateResult.lastSuccessfulState ?? stateResult.finalState ?? stateApi.getBattleState();

    return {
      detail,
      outcomeEvent: resolvedOutcomeEvent,
      outcomeDispatched,
      finalState: normalizedState ?? null,
      roundDisplayObserved: stateResult.roundDisplayObserved,
      dispatched: resolution?.dispatched ?? false,
      emitted: resolution?.emitted ?? false
    };
  }
};

// Main test API object
const testApi = {
  state: stateApi,
  cli: cliApi,
  timers: timerApi,
  init: initApi,
  inspect: inspectionApi,
  engine: engineApi,
  autoSelect: {
    /**
     * Force the stat selection timer to expire when auto-select is enabled.
     *
     * @param {{ awaitCompletion?: boolean }} [options] - Optional behavior overrides.
     * @param {boolean} [options.awaitCompletion=true] - Whether to await auto-select completion.
     * @returns {Promise<boolean>} Resolves true when the auto-select flow runs.
     */
    async triggerAutoSelect(options) {
      try {
        const store = inspectionApi.getBattleStore();
        if (!store) return false;
        const { triggerRoundTimeoutNow } = await import("./classicBattle/testHooks.js");
        await triggerRoundTimeoutNow(store, options);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Control whether rounds automatically continue after completion.
     *
     * @param {boolean} enabled - Whether to enable automatic continuation between rounds.
     * @returns {void}
     * @pseudocode
     * 1. Call setAutoContinue with the provided value.
     * 2. When enabled=false, rounds will pause at roundDisplay state.
     * 3. When enabled=true, rounds will automatically transition to cooldown.
     */
    setAutoContinue(enabled) {
      setAutoContinue(enabled);
    },

    /**
     * Get the current autoContinue setting.
     *
     * @returns {boolean} Current autoContinue value.
     */
    getAutoContinue() {
      return getAutoContinue();
    }
  }
};

/**
 * Initialize the test API by exposing it on the window object.
 *
 * @pseudocode
 * 1. If not in test mode, exit early.
 * 2. If running in a browser, attach the `testApi` and its sub-APIs to
 *    properties on `window` for debugging.
 *
 * @returns {void}
 */
export function exposeTestAPI() {
  if (!isTestMode()) return;

  if (isWindowAvailable()) {
    window.__TEST_API = testApi;

    // Initialize stat buttons ready promise if not already set
    if (!window.statButtonsReadyPromise) {
      window.statButtonsReadyPromise = new Promise((resolve) => {
        window.__resolveStatButtonsReady = resolve;
      });
    }

    // Also expose individual APIs for convenience
    window.__BATTLE_STATE_API = stateApi;
    window.__TIMER_API = timerApi;
    window.__INIT_API = initApi;
    window.__INSPECT_API = inspectionApi;
    window.__ENGINE_API = engineApi;

    // Expose emitBattleEvent for test compatibility
    window.emitBattleEvent = emitBattleEvent;
  }
}

/**
 * Get the test API object (works in both browser and Node environments).
 *
 * @pseudocode
 * 1. Return the pre-created `testApi` singleton.
 *
 * @returns {object} Test API object
 */
export function getTestAPI() {
  return testApi;
}

// Auto-expose in test environments
if (isTestMode()) {
  exposeTestAPI();
}

export default testApi;
