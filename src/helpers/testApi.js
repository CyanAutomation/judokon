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

import { getBattleStateMachine } from "./classicBattle/orchestrator.js";
import { getStateSnapshot } from "./classicBattle/battleDebug.js";
import { emitBattleEvent } from "./classicBattle/battleEvents.js";
import { isEnabled } from "./featureFlags.js";

// Test mode detection
function isTestMode() {
  // Check for common test environment indicators
  if (typeof process !== "undefined") {
    if (process.env?.NODE_ENV === "test") return true;
    if (process.env?.VITEST) return true;
  }

  // Check for browser test indicators
  if (typeof window !== "undefined") {
    if (window.__TEST__) return true;
    if (
      window.location?.href?.includes("127.0.0.1") ||
      window.location?.href?.includes("localhost")
    )
      return true;
  }

  // Check feature flag
  try {
    return isEnabled("enableTestMode");
  } catch {
    return false;
  }
}

// State management API
const stateApi = {
  /**
   * Get current battle state directly from state machine
   * @returns {string|null} Current state name
   */
  getBattleState() {
    try {
      const machine = getBattleStateMachine();
      return machine?.getState?.() || null;
    } catch {
      return null;
    }
  },

  /**
   * Dispatch an event to the battle state machine
   * @param {string} eventName - Event to dispatch
   * @param {any} payload - Optional payload
   * @returns {Promise<boolean>} Success status
   */
  async dispatchBattleEvent(eventName, payload) {
    try {
      const machine = getBattleStateMachine();
      if (!machine?.dispatch) return false;
      return await machine.dispatch(eventName, payload);
    } catch {
      return false;
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
   * Wait for a specific battle state to be reached
   * @param {string} stateName - Target state name
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when state reached, false on timeout
   */
  async waitForBattleState(stateName, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const check = () => {
        if (this.getBattleState() === stateName) {
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
  }
};

// Timer control API
const timerApi = {
  /**
   * Set countdown value directly without waiting for timer ticks
   * @param {number} seconds - Countdown value in seconds
   */
  setCountdown(seconds) {
    try {
      // Use existing battleCLI helper if available
      if (typeof window !== "undefined" && window.__battleCLIinit?.setCountdown) {
        window.__battleCLIinit.setCountdown(seconds);
        return;
      }

      // Direct DOM update as fallback
      const el = document.getElementById("cli-countdown");
      if (el) {
        el.dataset.remainingTime = String(seconds ?? 0);
        el.textContent = seconds !== null ? `Timer: ${String(seconds).padStart(2, "0")}` : "";
      }
    } catch {}
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
   * Clear all active timers
   */
  clearAllTimers() {
    try {
      // Clear battleCLI timers if available
      if (typeof window !== "undefined" && window.__battleCLITimers) {
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
        if (typeof window !== "undefined" && window[prop]) {
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

// Component initialization API
const initApi = {
  /**
   * Check if battle components are fully initialized
   * @returns {boolean} True when ready
   */
  isBattleReady() {
    try {
      if (typeof window !== "undefined") {
        // Check for various readiness indicators
        return !!(
          window.battleStore ||
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
   * Create a component factory for testing
   * @param {string} componentName - Name of component to create
   * @param {object} options - Component options
   * @returns {object} Component instance with test API access
   */
  createComponent(componentName) {
    try {
      const testApi = {
        getState: () => this.getComponentState(componentName),
        setState: (state) => this.setComponentState(componentName, state),
        triggerEvent: (event, data) => this.triggerComponentEvent(componentName, event, data),
        cleanup: () => this.cleanupComponent(componentName)
      };

      return {
        component: null, // Will be populated by specific component factories
        testApi,
        isTestMode: true
      };
    } catch {
      return { component: null, testApi: null, isTestMode: false };
    }
  },

  /**
   * Get internal state of a component
   * @param {string} componentName - Component identifier
   * @returns {any} Component state
   */
  getComponentState(componentName) {
    try {
      if (typeof window !== "undefined" && window.__testComponentStates) {
        return window.__testComponentStates[componentName];
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Set internal state of a component
   * @param {string} componentName - Component identifier
   * @param {any} state - New state
   */
  setComponentState(componentName, state) {
    try {
      if (typeof window !== "undefined") {
        if (!window.__testComponentStates) {
          window.__testComponentStates = {};
        }
        window.__testComponentStates[componentName] = state;
      }
    } catch {}
  },

  /**
   * Trigger component event for testing
   * @param {string} componentName - Component identifier
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  triggerComponentEvent(componentName, event, data) {
    try {
      if (typeof window !== "undefined" && window.__testComponentEvents) {
        const handler = window.__testComponentEvents[componentName]?.[event];
        if (typeof handler === "function") {
          handler(data);
        }
      }
    } catch {}
  },

  /**
   * Cleanup component test state
   * @param {string} componentName - Component identifier
   */
  cleanupComponent(componentName) {
    try {
      if (typeof window !== "undefined") {
        if (window.__testComponentStates) {
          delete window.__testComponentStates[componentName];
        }
        if (window.__testComponentEvents) {
          delete window.__testComponentEvents[componentName];
        }
      }
    } catch {}
  },

  /**
   * Get all available initialization promises
   * @returns {object} Object containing available promises
   */
  getInitPromises() {
    const promises = {};

    if (typeof window !== "undefined") {
      if (window.battleReadyPromise) promises.battle = window.battleReadyPromise;
      if (window.settingsReadyPromise) promises.settings = window.settingsReadyPromise;
      if (window.navReadyPromise) promises.nav = window.navReadyPromise;
      if (window.quoteReadyPromise) promises.quote = window.quoteReadyPromise;
      if (window.tooltipsReady) promises.tooltips = window.tooltipsReady;
    }

    return promises;
  }
};

// Component inspection API
const inspectionApi = {
  /**
   * Get battle store state for inspection
   * @returns {object|null} Battle store or null
   */
  getBattleStore() {
    try {
      return typeof window !== "undefined" ? window.battleStore : null;
    } catch {
      return null;
    }
  },

  /**
   * Get debug information about the current battle state
   * @returns {object} Debug information
   */
  getDebugInfo() {
    try {
      const store = this.getBattleStore();
      const machine = getBattleStateMachine();
      const snapshot = getStateSnapshot();

      return {
        store: store
          ? {
              selectionMade: store.selectionMade,
              playerChoice: store.playerChoice,
              roundsPlayed: store.roundsPlayed || 0
            }
          : null,
        machine: machine
          ? {
              currentState: machine.getState?.(),
              hasDispatch: typeof machine.dispatch === "function"
            }
          : null,
        snapshot,
        dom: {
          battleState: document.body?.dataset?.battleState || null,
          hasNextButton: !!document.getElementById("next-button"),
          nextButtonReady: document.getElementById("next-button")?.dataset?.nextReady === "true"
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
};

// Main test API object
const testApi = {
  state: stateApi,
  timers: timerApi,
  init: initApi,
  inspect: inspectionApi
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

  if (typeof window !== "undefined") {
    window.__TEST_API = testApi;

    // Also expose individual APIs for convenience
    window.__BATTLE_STATE_API = stateApi;
    window.__TIMER_API = timerApi;
    window.__INIT_API = initApi;
    window.__INSPECT_API = inspectionApi;
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
