/**
 * @summary Centralized state namespace for battleClassic initialization globals.
 * @description Consolidates all window.__battleClassic* globals into a single namespace
 * to reduce window pollution and improve testability.
 */

/**
 * Initialize the global battle state namespace if not already present.
 *
 * @returns {Object} The shared global state object.
 */
function getBattleClassicGlobalState() {
  if (typeof window === "undefined") {
    return {};
  }

  if (!window.__battleClassicState) {
    window.__battleClassicState = {
      initCalled: false,
      initComplete: false,
      stopSelectionTimer: null,
      highestDisplayedRound: 0,
      lastRoundCycleTrigger: {
        source: null,
        timestamp: 0
      },
      lastManualRoundStartTimestamp: 0,
      opponentPromptFallbackTimerId: 0,
      judokaFailureTelemetry: {
        count: 0,
        firstTimestamp: 0,
        lastTimestamp: 0,
        reported: false,
        sampled: null
      },
      debugFlags: {
        roundTracking: false,
        roundsSync: false,
        statButtonClick: false,
        renderStatButtons: false,
        clickListenerAttachedFor: []
      }
    };
  }

  return window.__battleClassicState;
}

/**
 * Get a specific value from the global state.
 *
 * @param {string} path - Dot-separated path to value (e.g., "highestDisplayedRound" or "lastRoundCycleTrigger.source").
 * @param {any} [defaultValue=null] - Value to return if path not found.
 * @returns {any} The value at path or defaultValue.
 *
 * @pseudocode
 * 1. Retrieve the shared battle state object.
 * 2. When no path is provided, return the entire state.
 * 3. Walk the dot-separated path, returning defaultValue if any segment is missing.
 * 4. Return the resolved value once traversal completes.
 */
export function getBattleState(path, defaultValue = null) {
  const state = getBattleClassicGlobalState();
  if (!path) return state;

  const keys = path.split(".");
  let current = state;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }

  return current;
}

/**
 * Set a specific value in the global state.
 *
 * @param {string} path - Dot-separated path to value.
 * @param {any} value - Value to set.
 * @returns {boolean} True if successful, false otherwise.
 *
 * @pseudocode
 * 1. Obtain the shared battle state object and validate the requested path.
 * 2. Create nested objects along the path as needed until the final key is reached.
 * 3. Assign the provided value to the final key within a try/catch for safety.
 * 4. Return true on success and false if assignment fails.
 */
export function setBattleState(path, value) {
  const state = getBattleClassicGlobalState();
  if (!path) return false;

  const keys = path.split(".");
  const lastKey = keys.pop();

  let current = state;
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  try {
    current[lastKey] = value;
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve the initCalled flag from the global state.
 *
 * @returns {boolean} True when initialization has been invoked.
 *
 * @pseudocode
 * 1. Request the `initCalled` flag from the shared state.
 * 2. Fall back to false when unset.
 */
export function getInitCalled() {
  return getBattleState("initCalled", false);
}

/**
 * Persist the initCalled flag to the global state.
 *
 * @param {boolean} value - Whether initialization has been invoked.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Forward the provided value to setBattleState under the `initCalled` path.
 * 2. Return the success indicator from setBattleState.
 */
export function setInitCalled(value) {
  return setBattleState("initCalled", value);
}

/**
 * Retrieve the initComplete flag from the global state.
 *
 * @returns {boolean} True once initialization is fully complete.
 *
 * @pseudocode
 * 1. Read the `initComplete` flag from the shared state store.
 * 2. Use false as the default when no value has been set.
 */
export function getInitComplete() {
  return getBattleState("initComplete", false);
}

/**
 * Persist the initComplete flag to the global state.
 *
 * @param {boolean} value - Whether initialization has fully completed.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Store the provided value under the `initComplete` path.
 * 2. Return the boolean result from the set operation.
 */
export function setInitComplete(value) {
  return setBattleState("initComplete", value);
}

/**
 * Retrieve the stopSelectionTimer reference.
 *
 * @returns {Function|null} The timer clear function or null when unset.
 *
 * @pseudocode
 * 1. Look up `stopSelectionTimer` within the shared state.
 * 2. Provide null when the timer has not been set.
 */
export function getStopSelectionTimer() {
  return getBattleState("stopSelectionTimer", null);
}

/**
 * Store the stopSelectionTimer reference.
 *
 * @param {Function|null} fn - Function to cancel the selection timer.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Write the provided function reference to `stopSelectionTimer` in state.
 * 2. Return the result of the write operation.
 */
export function setStopSelectionTimer(fn) {
  return setBattleState("stopSelectionTimer", fn);
}

/**
 * Get the highest round value that has been displayed.
 *
 * @returns {number} Highest displayed round number.
 *
 * @pseudocode
 * 1. Fetch `highestDisplayedRound` from the shared state store.
 * 2. Default to 0 when a value has not been recorded.
 */
export function getHighestDisplayedRound() {
  return getBattleState("highestDisplayedRound", 0);
}

/**
 * Update the highest displayed round value.
 *
 * @param {number} value - Round number that was most recently shown.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Store the provided round number under `highestDisplayedRound`.
 * 2. Return whether the underlying state assignment succeeded.
 */
export function setHighestDisplayedRound(value) {
  return setBattleState("highestDisplayedRound", value);
}

/**
 * Retrieve the last round cycle trigger metadata.
 *
 * @returns {{source: string|null, timestamp: number}} Cycle trigger source and timestamp.
 *
 * @pseudocode
 * 1. Read the `lastRoundCycleTrigger` object from state.
 * 2. Provide a default payload with null source and zero timestamp when absent.
 */
export function getLastRoundCycleTrigger() {
  return getBattleState("lastRoundCycleTrigger", { source: null, timestamp: 0 });
}

/**
 * Update the last round cycle trigger metadata.
 *
 * @param {string|null} source - Originating source for the trigger.
 * @param {number} timestamp - Millisecond timestamp when triggered.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Construct the trigger metadata object from the provided source and timestamp.
 * 2. Persist the object under `lastRoundCycleTrigger`.
 * 3. Return the success indicator from the write operation.
 */
export function setLastRoundCycleTrigger(source, timestamp) {
  return setBattleState("lastRoundCycleTrigger", { source, timestamp });
}

/**
 * Retrieve the timestamp for the last manual round start.
 *
 * @returns {number} Millisecond timestamp of the manual start event.
 *
 * @pseudocode
 * 1. Access `lastManualRoundStartTimestamp` from the shared state object.
 * 2. Use 0 as a default value when no timestamp has been captured.
 */
export function getLastManualRoundStartTimestamp() {
  return getBattleState("lastManualRoundStartTimestamp", 0);
}

/**
 * Record the timestamp for the last manual round start.
 *
 * @param {number} timestamp - Millisecond timestamp of the manual start event.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Write the provided timestamp to `lastManualRoundStartTimestamp`.
 * 2. Return whether the state write was successful.
 */
export function setLastManualRoundStartTimestamp(timestamp) {
  return setBattleState("lastManualRoundStartTimestamp", timestamp);
}

/**
 * Retrieve the timer ID used for opponent prompt fallback handling.
 *
 * @returns {number} Timeout identifier or 0 when unset.
 *
 * @pseudocode
 * 1. Read `opponentPromptFallbackTimerId` from state.
 * 2. Provide 0 when the timer has not been scheduled.
 */
export function getOpponentPromptFallbackTimerId() {
  const id = getBattleState("opponentPromptFallbackTimerId", 0);
  const normalizedId =
    typeof id === "object" && id !== null ? Number(id) : Number(id);

  return Number.isFinite(normalizedId) && normalizedId !== 0 ? normalizedId : 0;
}

/**
 * Store the timer ID used for opponent prompt fallback handling.
 *
 * @param {number} id - Timeout identifier returned from setTimeout.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Persist the timer identifier under `opponentPromptFallbackTimerId`.
 * 2. Return the success status from the write operation.
 */
export function setOpponentPromptFallbackTimerId(id) {
  return setBattleState("opponentPromptFallbackTimerId", id);
}

/**
 * Retrieve the telemetry tracking state for judoka load failures.
 *
 * @returns {Object} Current telemetry counters and timestamps.
 *
 * @pseudocode
 * 1. Read `judokaFailureTelemetry` from the shared state object.
 * 2. Default to the initial telemetry structure when absent.
 */
export function getJudokaFailureTelemetryState() {
  return getBattleState("judokaFailureTelemetry", {
    count: 0,
    firstTimestamp: 0,
    lastTimestamp: 0,
    reported: false,
    sampled: null
  });
}

/**
 * Read a specific debug flag value.
 *
 * @param {string} flagName - Name of the debug flag to inspect.
 * @returns {boolean} True when the flag is enabled, otherwise false.
 *
 * @pseudocode
 * 1. Retrieve the debugFlags object from shared state.
 * 2. Return the boolean value for the requested flag, defaulting to false.
 */
export function getDebugFlag(flagName) {
  const debugFlags = getBattleState("debugFlags", {});
  return debugFlags[flagName] || false;
}

/**
 * Set a specific debug flag value.
 *
 * @param {string} flagName - Name of the debug flag to mutate.
 * @param {boolean} value - Desired flag state.
 * @returns {boolean} True when the state was updated successfully.
 *
 * @pseudocode
 * 1. Ensure the `debugFlags` bag exists on the shared state object.
 * 2. Assign the requested flag value.
 * 3. Return true to indicate the mutation succeeded.
 */
export function setDebugFlag(flagName, value) {
  const state = getBattleClassicGlobalState();
  if (!state.debugFlags) {
    state.debugFlags = {};
  }
  state.debugFlags[flagName] = value;
  return true;
}

/**
 * Reset the entire global state (useful for tests).
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. If the window object is present, replace its __battleClassicState bag with defaults.
 * 2. Reinitialize telemetry and debug flag structures to their baseline values.
 */
export function resetBattleClassicGlobalState() {
  if (typeof window !== "undefined") {
    window.__battleClassicState = {
      initCalled: false,
      initComplete: false,
      stopSelectionTimer: null,
      highestDisplayedRound: 0,
      lastRoundCycleTrigger: {
        source: null,
        timestamp: 0
      },
      lastManualRoundStartTimestamp: 0,
      opponentPromptFallbackTimerId: 0,
      judokaFailureTelemetry: {
        count: 0,
        firstTimestamp: 0,
        lastTimestamp: 0,
        reported: false,
        sampled: null
      },
      debugFlags: {
        roundTracking: false,
        roundsSync: false
      }
    };
  }
}
