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
import { resolveRoundForTest as resolveRoundForCliTest } from "../pages/battleCLI/testSupport.js";

function isDevelopmentEnvironment() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    return true;
  }

  if (typeof window !== "undefined" && window.__DEV__) {
    return true;
  }

  return false;
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

function isAutomationNavigator(nav) {
  if (!nav) return false;

  try {
    if (nav.webdriver === true) {
      return true;
    }
  } catch {
    // Ignore property access errors – fall back to user agent heuristics.
  }

  let userAgent = "";

  try {
    if (typeof nav.userAgent === "string") {
      userAgent = nav.userAgent;
    }
  } catch {
    userAgent = "";
  }

  if (!userAgent) {
    try {
      const brands = nav.userAgentData?.brands;
      if (Array.isArray(brands)) {
        userAgent = brands.map((brand) => brand.brand).join(" ");
      }
    } catch {
      userAgent = "";
    }
  }

  if (!userAgent) return false;

  const normalizedAgent = userAgent.toLowerCase();
  if (normalizedAgent.includes("playwright")) {
    return true;
  }

  if (normalizedAgent.includes("headless")) {
    return true;
  }

  return false;
}

// Test mode detection
/**
 * Determine whether the runtime should expose the test API helpers.
 *
 * @pseudocode
 * 1. Check Node-based test flags (NODE_ENV, VITEST) for early exit.
 * 2. Inspect browser globals for explicit test flags or localhost URLs.
 * 3. Evaluate navigator automation hints (webdriver, headless UAs).
 * 4. Fallback to the enableTestMode feature flag toggle.
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

  // Check for browser test indicators
  if (typeof window !== "undefined") {
    if (window.__TEST__) return true;
    if (
      window.location?.href?.includes("127.0.0.1") ||
      window.location?.href?.includes("localhost")
    )
      return true;

    if (isAutomationNavigator(window.navigator)) return true;
  }

  if (
    typeof window === "undefined" &&
    typeof navigator !== "undefined" &&
    isAutomationNavigator(navigator)
  ) {
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
  },

  /**
   * Wait for the Next button to be marked ready and enabled.
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves true when ready, false on timeout
   */
  async waitForNextButtonReady(timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
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
          btn.dataset?.nextReady === "true" && btn.disabled !== true && ariaDisabled !== "true"
        );
      };

      const check = () => {
        try {
          const buttons = refreshButtons();
          if (buttons.some((btn) => isButtonReady(btn))) {
            resolve(true);
            return;
          }
        } catch {}

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
      if (typeof window !== "undefined" && window.__battleCLIinit?.setCountdown) {
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
            if (battleCLI.__freezeUntil !== undefined) {
              battleCLI.__freezeUntil = delegationSucceeded ? 0 : Date.now() + 500;
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
   * Override the simulated opponent resolution delay used by the battle engine.
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

      const numeric = Number(delayMs);
      if (!Number.isFinite(numeric) || numeric < 0) {
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

const MIN_VIEWPORT_ZOOM = 0.1;
const MAX_VIEWPORT_ZOOM = 10;

// Viewport control API
const viewportApi = {
  /**
   * Adjust the document zoom level to simulate browser zoom in tests.
   *
   * @pseudocode
   * 1. Normalize the input zoom value (default to 1 when invalid or non-positive)
   * 2. Clamp the normalized zoom within the supported safety bounds (0.1 - 10)
   * 3. Ensure the document and body elements are available before mutating styles
   * 4. Apply or remove zoom styles plus tracking attributes based on the target zoom
   * 5. Log failures during development and return a boolean success indicator
   *
   * @param {number} zoomLevel - Target zoom multiplier (1 = 100%).
   * @returns {boolean} True when zoom is applied synchronously.
   */
  setZoom(zoomLevel = 1) {
    if (typeof document === "undefined") return false;

    const root = document.documentElement;
    const body = document.body;

    if (!root || !body) {
      return false;
    }

    const numericZoom = Number(zoomLevel);
    const normalizedZoom = Number.isFinite(numericZoom) && numericZoom > 0 ? numericZoom : 1;
    const clampedZoom = Math.min(Math.max(normalizedZoom, MIN_VIEWPORT_ZOOM), MAX_VIEWPORT_ZOOM);

    if (clampedZoom !== normalizedZoom) {
      logDevWarning(
        `Viewport zoom ${normalizedZoom} outside safe bounds; clamped to ${clampedZoom}.`
      );
    }

    try {
      if (clampedZoom === 1) {
        body.style.removeProperty("zoom");
        try {
          delete root.dataset.testZoom;
        } catch {}
        try {
          root.style.removeProperty("--test-zoom-scale");
        } catch {}
        return true;
      }

      const zoomString = String(clampedZoom);

      body.style.zoom = zoomString;
      try {
        root.dataset.testZoom = zoomString;
      } catch {}
      try {
        root.style.setProperty("--test-zoom-scale", zoomString);
      } catch {}

      return true;
    } catch (error) {
      logDevWarning("Failed to set viewport zoom", error);
      return false;
    }
  },

  /**
   * Clear any simulated zoom overrides applied during a test run.
   *
   * @pseudocode
   * 1. Delegate to `setZoom(1)` so the same validation and cleanup paths are reused
   * 2. Allow the shared implementation to handle DOM availability checks
   * 3. Rely on `setZoom` for style cleanup, attribute removal, and logging
   * 4. Return the boolean success status from the delegated call
   *
   * @returns {boolean} True when cleanup is completed.
   */
  resetZoom() {
    try {
      return this.setZoom(1);
    } catch (error) {
      logDevWarning("Failed to reset viewport zoom", error);
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

// Battle CLI API
const cliApi = {
  /**
   * Resolve the active round through the classic battle machine.
   *
   * @param {object} [eventLike]
   * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
   * @pseudocode
   * dispatch = detail => stateApi.dispatchBattleEvent("roundResolved", detail)
   * emit = detail => emitBattleEvent("roundResolved", detail)
   * getStore = () => window.battleStore when available
   * return resolveRoundForCliTest(eventLike, { dispatch, emit, getStore })
   */
  async resolveRound(eventLike = {}) {
    const dispatch = (detail) => stateApi.dispatchBattleEvent("roundResolved", detail);
    const emit = (detail) => emitBattleEvent("roundResolved", detail);
    const getStore = () => {
      try {
        return typeof window !== "undefined" ? window.battleStore : null;
      } catch (error) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.debug("Failed to access battleStore:", error);
        }
        return null;
      }
    };

    return resolveRoundForCliTest(eventLike, {
      dispatch,
      emit,
      getStore
    });
  },

  /**
   * Deterministically complete the active CLI round without long waits.
   *
   * @param {object} [roundInput] - Event-like payload forwarded to resolveRound.
   * @param {{
   *   outcomeEvent?: string|null,
   *   expireSelection?: boolean,
   *   opponentResolveDelayMs?: number|undefined
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
    const { outcomeEvent = null, expireSelection = true, opponentResolveDelayMs } = options ?? {};

    if (expireSelection && typeof timerApi.expireSelectionTimer === "function") {
      try {
        timerApi.expireSelectionTimer();
      } catch {}
    }

    if (opponentResolveDelayMs !== undefined) {
      try {
        timerApi.setOpponentResolveDelay(opponentResolveDelayMs);
      } catch {}
    }

    const resolution = await this.resolveRound(roundInput);
    const detail = resolution?.detail ?? {};

    let outcomeDispatched = false;
    if (outcomeEvent) {
      try {
        const dispatched = await stateApi.dispatchBattleEvent(outcomeEvent, detail);
        outcomeDispatched = dispatched !== false;
      } catch {
        outcomeDispatched = false;
      }
    }

    return {
      detail,
      outcomeEvent,
      outcomeDispatched,
      finalState: stateApi.getBattleState(),
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
  viewport: viewportApi
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
    window.__VIEWPORT_API = viewportApi;
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
