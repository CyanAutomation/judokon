/**
 * Battle Harness: Encapsulates test setup for integration tests.
 *
 * Provides a unified way to set up JSDOM environment, wire mocks, initialize
 * the state machine, and wait for state transitions. This reduces boilerplate
 * in integration tests and ensures consistent behavior.
 *
 * @pseudocode
 * 1. Accept configuration: mock data, initial state, timeout preferences.
 * 2. Provide setup() method that:
 *    - Ensures JSDOM DOM is clean
 *    - Wires fetch mock via createMockFetchJson
 *    - Initializes state machine and orchestrator
 *    - Waits for initial state
 * 3. Provide waitForState(name, timeout) to advance state machine.
 * 4. Provide getState(), getOrchestrator(), getDom() accessors.
 * 5. Provide cleanup() for test teardown.
 */

import { vi } from "vitest";
import { resetDom } from "./utils/testUtils.js";
import { createMockFetchJson, judokaMinimalSet, gokyoFixtures } from "./testDataLoader.js";

/**
 * Default configuration for battle harness.
 * @type {object}
 */
const DEFAULT_CONFIG = {
  judoka: judokaMinimalSet,
  gokyo: gokyoFixtures,
  initialState: "waitingForMatchStart",
  stateTransitionTimeout: 5000,
  enableLogs: false
};

/**
 * Create a battle harness for integration tests.
 *
 * @param {object} [config={}] - Harness configuration.
 * @param {Array<object>} [config.judoka] - Judoka fixture data.
 * @param {Array<object>} [config.gokyo] - Gokyo fixture data.
 * @param {string} [config.initialState] - Expected initial state after setup.
 * @param {number} [config.stateTransitionTimeout] - Max time to wait for state transitions (ms).
 * @param {boolean} [config.enableLogs] - Enable debug logging.
 * @returns {object} Harness instance with setup, waitForState, and accessors.
 */
export function createBattleHarness(config = {}) {
  const opts = { ...DEFAULT_CONFIG, ...config };
  let orchestrator = null;
  let stateHistory = [];
  let currentState = null;
  let unsubscribeState = null;

  /**
   * Setup the harness: prepare DOM, mocks, and initialize state machine.
   *
   * @returns {Promise<void>}
   */
  async function setup() {
    // Reset DOM to clean state
    resetDom();

    // Ensure snackbar container exists
    if (!document.getElementById("snackbar-container")) {
      const container = document.createElement("div");
      container.id = "snackbar-container";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }

    // Wire mock fetch for dataUtils
    const mockFetch = createMockFetchJson({
      judoka: opts.judoka,
      gokyo: opts.gokyo,
      onFetch: opts.enableLogs ? (path) => console.log(`[harness] fetchJson: ${path}`) : null
    });

    // Override the global dataUtils mock with our configured instance
    vi.doMock("../src/helpers/dataUtils.js", () => ({
      fetchJson: mockFetch,
      importJsonModule: async () => ({}),
      validateWithSchema: async () => undefined
    }));

    // Import modules after mocking is set up
    const { setupClassicBattlePage } = await import("../src/pages/classic.js");

    // Create mock page structure
    if (!document.getElementById("root")) {
      const root = document.createElement("div");
      root.id = "root";
      document.body.appendChild(root);
    }

    // Initialize the battle page
    const result = await setupClassicBattlePage();
    orchestrator = result?.orchestrator;

    if (!orchestrator) {
      throw new Error("Failed to initialize battle orchestrator");
    }

    // Subscribe to state changes
    stateHistory = [];
    if (orchestrator?.subscribe) {
      unsubscribeState = orchestrator.subscribe((state) => {
        currentState = state;
        stateHistory.push(state);
        if (opts.enableLogs) {
          console.log(`[harness] state transition: ${state}`);
        }
      });
    }

    // Wait for initial state
    await waitForState(opts.initialState, opts.stateTransitionTimeout);
  }

  /**
   * Wait for a specific state, with timeout.
   *
   * @param {string} targetState - State name to wait for.
   * @param {number} [timeout] - Max wait time in milliseconds.
   * @returns {Promise<void>}
   */
  async function waitForState(targetState, timeout = opts.stateTransitionTimeout) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      // Check if already in target state
      if (currentState === targetState) {
        resolve();
        return;
      }

      // Subscribe to changes and check for target state
      const checkStateInterval = setInterval(() => {
        if (currentState === targetState) {
          clearInterval(checkStateInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkStateInterval);
          reject(
            new Error(
              `Timeout waiting for state "${targetState}" (current: "${currentState}", history: ${stateHistory.join(" → ")})`
            )
          );
        }
      }, 50);
    });
  }

  /**
   * Get the current state.
   *
   * @returns {string|null} Current state name or null if not initialized.
   */
  function getState() {
    return currentState;
  }

  /**
   * Get the orchestrator instance.
   *
   * @returns {object|null} Orchestrator or null if not initialized.
   */
  function getOrchestrator() {
    return orchestrator;
  }

  /**
   * Get the DOM root element.
   *
   * @returns {Element|null} Root element or null if not found.
   */
  function getDom() {
    return document.getElementById("root");
  }

  /**
   * Get state transition history.
   *
   * @returns {Array<string>} Array of state names visited.
   */
  function getStateHistory() {
    return [...stateHistory];
  }

  /**
   * Dispatch an event to the orchestrator.
   *
   * @param {string} eventName - Event name.
   * @param {object} [payload] - Event payload.
   * @returns {void}
   */
  function dispatchEvent(eventName, payload = {}) {
    if (!orchestrator?.dispatch) {
      throw new Error("Orchestrator not initialized or does not support dispatch");
    }
    orchestrator.dispatch(eventName, payload);
  }

  /**
   * Cleanup: unsubscribe and reset.
   *
   * @returns {void}
   */
  function cleanup() {
    if (unsubscribeState) {
      unsubscribeState();
      unsubscribeState = null;
    }
    orchestrator = null;
    currentState = null;
    stateHistory = [];
    resetDom();
  }

  return {
    setup,
    waitForState,
    getState,
    getOrchestrator,
    getDom,
    getStateHistory,
    dispatchEvent,
    cleanup
  };
}
