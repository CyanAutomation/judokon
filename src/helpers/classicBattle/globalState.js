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
 * Convenient getters for frequently accessed state.
 */

export function getInitCalled() {
  return getBattleState("initCalled", false);
}

export function setInitCalled(value) {
  return setBattleState("initCalled", value);
}

export function getInitComplete() {
  return getBattleState("initComplete", false);
}

export function setInitComplete(value) {
  return setBattleState("initComplete", value);
}

export function getStopSelectionTimer() {
  return getBattleState("stopSelectionTimer", null);
}

export function setStopSelectionTimer(fn) {
  return setBattleState("stopSelectionTimer", fn);
}

export function getHighestDisplayedRound() {
  return getBattleState("highestDisplayedRound", 0);
}

export function setHighestDisplayedRound(value) {
  return setBattleState("highestDisplayedRound", value);
}

export function getLastRoundCycleTrigger() {
  return getBattleState("lastRoundCycleTrigger", { source: null, timestamp: 0 });
}

export function setLastRoundCycleTrigger(source, timestamp) {
  return setBattleState("lastRoundCycleTrigger", { source, timestamp });
}

export function getLastManualRoundStartTimestamp() {
  return getBattleState("lastManualRoundStartTimestamp", 0);
}

export function setLastManualRoundStartTimestamp(timestamp) {
  return setBattleState("lastManualRoundStartTimestamp", timestamp);
}

export function getOpponentPromptFallbackTimerId() {
  return getBattleState("opponentPromptFallbackTimerId", 0);
}

export function setOpponentPromptFallbackTimerId(id) {
  return setBattleState("opponentPromptFallbackTimerId", id);
}

export function getJudokaFailureTelemetryState() {
  return getBattleState("judokaFailureTelemetry", {
    count: 0,
    firstTimestamp: 0,
    lastTimestamp: 0,
    reported: false,
    sampled: null
  });
}

export function getDebugFlag(flagName) {
  const debugFlags = getBattleState("debugFlags", {});
  return debugFlags[flagName] || false;
}

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
