/**
 * Integration Test Harness for JU-DO-KON!
 *
 * Provides a reusable template for integration-style tests that boot real modules
 * with deterministic externalities (timers, RAF, fixtures) instead of heavy mocking.
 *
 * @module tests/helpers/integrationHarness
 */

import { vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import installRAFMock from "./rafMock.js";

/**
 * Normalizes mock implementations for Vitest's factory contract.
 *
 * @pseudocode
 * ```
 * if typeof mockImpl === "function":
 *   return mockImpl
 * return () => mockImpl
 * ```
 * @param {*} mockImpl - Value or factory used to mock a module
 * @returns {Function} Mock factory compatible with `vi.doMock`
 */
export function createMockFactory(mockImpl) {
  return typeof mockImpl === "function" ? mockImpl : () => mockImpl;
}

/**
 * Configuration options for the integration harness
 * @typedef {Object} HarnessConfig
 * @property {boolean} [useFakeTimers=true] - Whether to use fake timers
 * @property {boolean} [useRafMock=true] - Whether to use RAF mock
 * @property {Object} [fixtures={}] - Test fixtures to inject
 * @property {Object} [mocks={}] - Selective mocks for externalities only
 * @property {Function} [mockRegistrar] - Custom registration function for mocks (defaults to vi.doMock)
 * @property {Function} [setup] - Custom setup function
 * @property {Function} [teardown] - Custom teardown function
 */

/**
 * Creates an integration test harness that boots real modules with controlled externalities.
 *
 * @param {HarnessConfig} config - Harness configuration
 * @returns {Object} Harness control object with setup/cleanup methods
 *
 * @example
 * ```js
 * const harness = createIntegrationHarness({
 *   fixtures: { judokaData: mockJudokaData },
 *   mocks: {
 *     fetch: mockFetch,
 *     localStorage: mockLocalStorage
 *   }
 * });
 *
 * describe("My Integration Test", () => {
 *   beforeEach(async () => {
 *     await harness.setup();
 *     // Real modules are now loaded with controlled externalities
 *   });
 *
 *   afterEach(() => {
 *     harness.cleanup();
 *   });
 *
 *   it("tests real behavior", () => {
 *     // Test real module interactions
 *   });
 * });
 * ```
 */
export function createIntegrationHarness(config = {}) {
  const {
    useFakeTimers = true,
    useRafMock = true,
    fixtures = {},
    mocks = {},
    mockRegistrar = vi.doMock,
    setup: customSetup,
    teardown: customTeardown
  } = config;

  let timerControl;
  let rafControl;
  let moduleCache = new Map();

  /**
   * Sets up the integration environment
   */
  async function setup() {
    // Reset modules to ensure clean state
    vi.resetModules();

    // Setup deterministic timers if requested
    if (useFakeTimers) {
      timerControl = useCanonicalTimers();
    }

    // Setup RAF mock if requested
    if (useRafMock) {
      rafControl = installRAFMock();
    }

    // Apply selective mocks for externalities only
    for (const [modulePath, mockImpl] of Object.entries(mocks)) {
      /**
       * Vitest executes factories returned to `vi.doMock`. Function mocks are
       * therefore passed through directly so they are returned as-is, while
       * non-function mocks are wrapped in a factory closure.
       */
      const mockFactory = createMockFactory(mockImpl);

      mockRegistrar(modulePath, mockFactory);
    }

    // Inject fixtures into global scope or modules as needed
    for (const [key, value] of Object.entries(fixtures)) {
      // Inject fixtures - implementation depends on how fixtures are used
      injectFixture(key, value);
    }

    // Run custom setup if provided
    if (customSetup) {
      await customSetup();
    }
  }

  /**
   * Cleans up the integration environment
   */
  function cleanup() {
    // Restore timers
    if (timerControl) {
      timerControl.cleanup();
      timerControl = null;
    }

    // Restore RAF
    if (rafControl) {
      rafControl.restore();
      rafControl = null;
    }

    // Clear module mocks
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // Clear DOM
    document.body.innerHTML = "";

    // Run custom teardown if provided
    if (customTeardown) {
      customTeardown();
    }

    // Clear module cache
    moduleCache.clear();
  }

  /**
   * Dynamically imports a module with harness context
   * @param {string} modulePath - Path to the module to import
   * @returns {Promise<Module>} The imported module
   */
  async function importModule(modulePath) {
    if (!moduleCache.has(modulePath)) {
      const module = await import(modulePath);
      moduleCache.set(modulePath, module);
    }
    return moduleCache.get(modulePath);
  }

  /**
   * Injects a fixture into the test environment
   * @private
   * @param {string} key - Fixture key
   * @param {*} value - Fixture value
   */
  function injectFixture(key, value) {
    // Common injection patterns - extend as needed
    switch (key) {
      case "localStorage":
        Object.defineProperty(window, "localStorage", {
          value,
          writable: true
        });
        break;
      case "fetch":
        global.fetch = value;
        break;
      case "matchMedia":
        global.matchMedia = value;
        break;
      default:
        // Inject into global scope for custom fixtures
        global[key] = value;
    }
  }

  return {
    setup,
    cleanup,
    importModule,
    get timerControl() {
      return timerControl;
    },
    get rafControl() {
      return rafControl;
    }
  };
}

/**
 * Pre-configured harness for classic battle integration tests
 */
export function createClassicBattleHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      // Default fixtures for classic battle tests
      matchMedia: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
      ...customFixtures
    },
    mocks: {
      // Mock only true externalities, not internal modules
      "../../../src/helpers/showSnackbar.js": () => ({
        showSnackbar: vi.fn(),
        updateSnackbar: vi.fn()
      }),
      ...customMocks
    }
  });
}

/**
 * Pre-configured harness for settings page integration tests
 */
export function createSettingsHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      ...customFixtures
    },
    mocks: {
      // Mock tooltip system as external dependency
      "../../src/helpers/tooltip.js": () => ({
        initTooltips: vi.fn().mockResolvedValue(vi.fn()),
        getTooltips: vi.fn()
      }),
      ...customMocks
    }
  });
}
