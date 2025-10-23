/**
 * Integration Test Harness for JU-DO-KON!
 *
 * Provides a reusable template for integration-style tests that boot real modules
 * with deterministic externalities (timers, RAF, fixtures) instead of heavy mocking.
 *
 * @module tests/helpers/integrationHarness
 */

import { pathToFileURL } from "node:url";
import { vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import installRAFMock from "./rafMock.js";

const REPO_ROOT_URL = new URL("../..", import.meta.url);
const WINDOWS_DRIVE_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const VITE_SRC_ALIAS_PREFIX = "/src/";

/**
 * Resolves mock module specifiers to repository-rooted URLs for consistent mock registration.
 *
 * @pseudocode
 * ```
 * if modulePath is not string: return as-is
 * if modulePath uses the Vite `/src/` alias: return as-is
 * if modulePath is Windows drive path: convert to file URL
 * if modulePath is absolute path: convert to file URL
 * if modulePath looks like URL or is bare: return as-is
 * sanitize relative path and resolve against repository root
 * ```
 *
 * @param {string|*} modulePath - Module path specifier to resolve.
 * @returns {string|*} Resolved module specifier as URL or original value.
 * @throws {Error} When the sanitized relative path is empty or unsafe.
 */
function resolveMockModuleSpecifier(modulePath) {
  if (typeof modulePath !== "string") {
    return modulePath;
  }

  if (modulePath.startsWith(VITE_SRC_ALIAS_PREFIX)) {
    return modulePath;
  }

  if (WINDOWS_DRIVE_PATH_PATTERN.test(modulePath)) {
    return pathToFileURL(modulePath).href;
  }

  if (modulePath.startsWith("/")) {
    return pathToFileURL(modulePath).href;
  }

  if (looksLikeUrl(modulePath) || isBareModuleSpecifier(modulePath)) {
    return modulePath;
  }

  const sanitizedPath = clampModulePath(modulePath);

  if (!sanitizedPath) {
    throw new Error(
      `Unable to resolve mock module path "${modulePath}" relative to repository root. ` +
        `Expected formats: relative paths (e.g., "src/module.js"), bare specifiers (e.g., "lodash"), ` +
        `or absolute URLs (e.g., "https://example.com/module.js").`
    );
  }

  return new URL(sanitizedPath, REPO_ROOT_URL).href;
}

function clampModulePath(specifier) {
  const parts = specifier.replace(/\\/g, "/").split("/");
  const resolved = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      if (resolved.length > 0) {
        resolved.pop();
      }
      continue;
    }

    resolved.push(part);
  }

  const result = resolved.join("/");

  if (result.includes("..") || result.startsWith("/")) {
    throw new Error(`Invalid module path after normalization: "${result}"`);
  }

  return result;
}

function looksLikeUrl(value) {
  if (!URL_SCHEME_PATTERN.test(value)) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isBareModuleSpecifier(specifier) {
  if (!specifier) {
    return false;
  }

  if (specifier === "." || specifier === "..") {
    return false;
  }

  if (specifier.startsWith("@")) {
    const slashIndex = specifier.indexOf("/");
    return slashIndex > 1 && slashIndex < specifier.length - 1;
  }

  if (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/") ||
    specifier.startsWith("\\")
  ) {
    return false;
  }

  if (WINDOWS_DRIVE_PATH_PATTERN.test(specifier)) {
    return false;
  }

  if (specifier.includes("\\")) {
    return false;
  }

  return true;
}

const CLASSIC_BATTLE_SNACKBAR_MODULE = resolveMockModuleSpecifier(
  "../../../src/helpers/showSnackbar.js"
);

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

    // Apply mocks before importing any modules
    for (const [modulePath, mockImpl] of Object.entries(mocks)) {
      const resolvedPath = resolveMockModuleSpecifier(modulePath);
      mockRegistrar(resolvedPath, createMockFactory(mockImpl));
    }

    // Setup deterministic timers if requested
    if (useFakeTimers) {
      timerControl = useCanonicalTimers();
    }

    // Setup RAF mock if requested
    if (useRafMock) {
      rafControl = installRAFMock();
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
      [CLASSIC_BATTLE_SNACKBAR_MODULE]: () => ({
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
        removeItem: vi.fn(),
        clear: vi.fn()
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

/**
 * Pre-configured harness for browse judoka page integration tests
 */
export function createBrowseJudokaHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      ...customFixtures
    },
    mocks: {
      // Mock tooltip system as external dependency
      "../../src/helpers/tooltip.js": () => ({
        initTooltips: vi.fn().mockResolvedValue(vi.fn()),
        getTooltips: vi.fn()
      }),
      // Mock data utilities for fetching
      "../../src/helpers/dataUtils.js": () => ({
        fetchJson: vi.fn()
      }),
      // Mock hover zoom setup
      "../../src/helpers/setupHoverZoom.js": () => ({
        setupHoverZoom: vi.fn()
      }),
      // Mock judoka utilities
      "../../src/helpers/judokaUtils.js": () => ({
        getJudokaDisplayName: vi.fn(),
        getJudokaStats: vi.fn()
      }),
      ...customMocks
    }
  });
}

/**
 * Pre-configured harness for timer service integration tests
 */
export function createTimerServiceHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createClassicBattleHarness({
    ...restConfig,
    fixtures: {
      ...customFixtures
    },
    mocks: {
      // Mock timer service dependencies
      "../../src/helpers/classicBattle/orchestrator.js": () => ({
        dispatchBattleEvent: vi.fn()
      }),
      "../../src/helpers/setupScoreboard.js": () => ({
        showMessage: vi.fn(),
        showTemporaryMessage: vi.fn(() => () => {}),
        showAutoSelect: vi.fn(),
        clearTimer: vi.fn(),
        updateTimer: vi.fn(),
        updateRoundCounter: vi.fn(),
        clearRoundCounter: vi.fn()
      }),
      "../../src/helpers/timerUtils.js": () => ({
        getDefaultTimer: () => 30
      }),
      "../../src/helpers/classicBattle/uiHelpers.js": () => ({
        skipRoundCooldownIfEnabled: vi.fn()
      }),
      "../../src/helpers/battleEngineFacade.js": () => ({
        startRound: vi.fn()
      }),
      ...customMocks
    }
  });
}

/**
 * Pre-configured harness for tooltip integration tests
 */
export function createTooltipHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      ...customFixtures
    },
    mocks: {
      // Mock settings storage for tooltip preferences
      "../../src/helpers/settingsStorage.js": () => ({
        loadSettings: vi.fn().mockResolvedValue({ tooltips: true })
      }),
      // Mock data utilities for tooltip content
      "../../src/helpers/dataUtils.js": () => ({
        fetchJson: vi.fn()
      }),
      ...customMocks
    }
  });
}

/**
 * Pre-configured harness for populate country list integration tests
 */
export function createPopulateCountryListHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      ...customFixtures
    },
    mocks: {
      // Mock data utilities for judoka data
      "../../src/helpers/dataUtils.js": () => ({
        fetchJson: vi.fn()
      }),
      // Mock constants for data directory
      "../../src/helpers/constants.js": () => ({ DATA_DIR: "" }),
      ...customMocks
    }
  });
}

/**
 * Pre-configured harness for random judoka page integration tests
 */
export function createRandomJudokaPageHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      matchMedia: () => ({ matches: false }),
      ...customFixtures
    },
    mocks: {
      // Mock random card generation
      "../../src/helpers/randomCard.js": () => ({
        generateRandomCard: vi.fn(),
        loadGokyoLookup: vi.fn(),
        renderJudokaCard: vi.fn()
      }),
      // Mock data utilities
      "../../src/helpers/dataUtils.js": () => ({
        fetchJson: vi.fn()
      }),
      // Mock constants
      "../../src/helpers/constants.js": () => ({
        DATA_DIR: ""
      }),
      // Mock Button component
      "../../src/components/Button.js": () => ({
        createButton: vi.fn((_, opts = {}) => {
          const btn = document.createElement("button");
          if (opts.id) btn.id = opts.id;
          return btn;
        })
      }),
      // Mock settings storage
      "../../src/helpers/settingsStorage.js": () => ({
        loadSettings: vi.fn().mockResolvedValue({
          motionEffects: true,
          typewriterEffect: true,
          tooltips: true,
          displayMode: "light",
          fullNavigationMap: true,
          gameModes: {},
          featureFlags: {
            enableTestMode: { enabled: false },
            enableCardInspector: { enabled: false }
          }
        })
      }),
      // Mock motion utils
      "../../src/helpers/motionUtils.js": () => ({
        applyMotionPreference: vi.fn()
      }),
      ...customMocks
    }
  });
}

/**
 * Pre-configured harness for battle CLI handlers integration tests
 */
export function createBattleCLIHandlersHarness(customConfig = {}) {
  const { fixtures: customFixtures, mocks: customMocks, ...restConfig } = customConfig;
  return createIntegrationHarness({
    ...restConfig,
    fixtures: {
      ...customFixtures
    },
    mocks: {
      // Mock feature flags
      "../../src/helpers/featureFlags.js": () => ({
        initFeatureFlags: vi.fn(),
        isEnabled: vi.fn(),
        setFlag: vi.fn(),
        featureFlagsEmitter: new EventTarget()
      }),
      // Mock UI helpers
      "../../src/helpers/classicBattle/uiHelpers.js": () => ({
        skipRoundCooldownIfEnabled: vi.fn(),
        updateBattleStateBadge: vi.fn()
      }),
      // Mock battle events
      "../../src/helpers/classicBattle/battleEvents.js": () => ({
        onBattleEvent: vi.fn(),
        offBattleEvent: vi.fn(),
        emitBattleEvent: vi.fn()
      }),
      // Mock round manager
      "../../src/helpers/classicBattle/roundManager.js": () => ({
        createBattleStore: vi.fn(() => ({}))
      }),
      // Mock orchestrator
      "../../src/helpers/classicBattle/orchestrator.js": () => ({
        getOrchestrator: vi.fn(() => ({}))
      }),
      // Mock battle engine
      "../../src/helpers/BattleEngine.js": () => ({
        BattleEngine: vi.fn()
      }),
      // Mock battle engine facade
      "../../src/helpers/battleEngineFacade.js": () => ({
        createBattleEngineFacade: vi.fn(() => ({}))
      }),
      // Mock orchestrator handlers
      "../../src/helpers/classicBattle/orchestratorHandlers.js": () => ({
        registerOrchestratorHandlers: vi.fn()
      }),
      // Mock auto select
      "../../src/helpers/classicBattle/autoSelectStat.js": () => ({
        initAutoSelect: vi.fn()
      }),
      // Mock debug hooks
      "../../src/helpers/classicBattle/debugHooks.js": () => ({
        initDebugHooks: vi.fn()
      }),
      // Mock round timer
      "../../src/helpers/timers/createRoundTimer.js": () => ({
        createRoundTimer: vi.fn()
      }),
      // Mock Button component
      "../../src/components/Button.js": () => ({
        Button: vi.fn()
      }),
      ...customMocks
    }
  });
}
