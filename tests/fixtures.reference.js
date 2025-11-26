/**
 * @fileoverview Test Fixtures Reference Guide
 *
 * Fixtures are mock objects or data structures that replace browser APIs, network calls,
 * and other external dependencies in the test environment. The createSimpleHarness()
 * fixtures system allows clean injection of these into tests.
 *
 * @reference See AGENTS.md → Testing Standards for harness patterns
 */

/**
 * ===== FIXTURE SYSTEM OVERVIEW =====
 *
 * Fixtures are injected via the harness configuration:
 *
 * ```javascript
 * const harness = createSimpleHarness({
 *   fixtures: {
 *     localStorage: createMockLocalStorage(),
 *     fetch: createMockFetch(),
 *     matchMedia: createMockMatchMedia()
 *   }
 * });
 * await harness.setup(); // Fixtures are injected here
 * ```
 *
 * Supported fixture injection points:
 * - localStorage → window.localStorage (JSDOM API)
 * - fetch → global.fetch (network API)
 * - matchMedia → global.matchMedia (CSS media queries)
 * - Custom → global[customKey] (any global)
 *
 * ===== COMMON FIXTURES =====
 */

/**
 * Mock localStorage that behaves like the real API but stores data in memory
 *
 * @returns {Object} Mock localStorage object with all standard methods
 *
 * @example
 * ```js
 * const mockStorage = createMockLocalStorage();
 * mockStorage.setItem('key', 'value');
 * expect(mockStorage.getItem('key')).toBe('value');
 * mockStorage.clear(); // removes all items
 * ```
 *
 * Typical usage in tests:
 * ```js
 * beforeEach(async () => {
 *   const mockStorage = createMockLocalStorage();
 *   harness = createSimpleHarness({
 *     fixtures: { localStorage: mockStorage }
 *   });
 *   await harness.setup();
 * });
 *
 * it("persists data to storage", async () => {
 *   const { saveState } = await harness.importModule("../../src/helpers/state.js");
 *   await saveState({ id: 1, name: "Battle" });
 *   expect(mockStorage.getItem("state")).toBeDefined();
 * });
 * ```
 */
export function createMockLocalStorage() {
  const store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
    },
    key: (index) => {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
}

/**
 * Mock fetch that records calls and returns configurable responses
 *
 * @param {Object} defaultResponses - Object mapping URL patterns to responses
 * @returns {Function} Mock fetch function with .mock.calls tracking
 *
 * @example
 * ```js
 * const mockFetch = createMockFetch({
 *   "/api/opponent": { status: 200, data: { id: 1, name: "Fighter" } }
 * });
 *
 * mockFetch.mockResolvedValue({ status: 200, json: () => ({ ok: true }) });
 * const response = await fetch("/api/opponent");
 * expect(mockFetch).toHaveBeenCalledWith("/api/opponent");
 * ```
 *
 * Common patterns:
 * ```js
 * // Success response
 * mockFetch.mockResolvedValue({
 *   status: 200,
 *   ok: true,
 *   json: async () => ({ id: 1, data: "..." })
 * });
 *
 * // Error response
 * mockFetch.mockResolvedValue({
 *   status: 500,
 *   ok: false,
 *   json: async () => ({ error: "Server error" })
 * });
 *
 * // Network failure
 * mockFetch.mockRejectedValue(new Error("Network timeout"));
 * ```
 */
export function createMockFetch(defaultResponses = {}) {
  const mockFn = vi.fn();

  mockFn.mockImplementation(async (url) => {
    const urlStr = String(url);

    // Check for matching pattern in default responses
    for (const [pattern, response] of Object.entries(defaultResponses)) {
      if (urlStr.includes(pattern)) {
        return {
          status: response.status || 200,
          ok: (response.status || 200) < 400,
          json: async () => response.data || response
        };
      }
    }

    // Default: return successful response
    return {
      status: 200,
      ok: true,
      json: async () => ({})
    };
  });

  return mockFn;
}

/**
 * Mock matchMedia for CSS media query testing
 *
 * @param {Object} initialMatches - Object mapping media queries to boolean values
 * @returns {Function} Mock matchMedia function
 *
 * @example
 * ```js
 * const mockMatchMedia = createMockMatchMedia({
 *   "(prefers-color-scheme: dark)": true,
 *   "(max-width: 768px)": false
 * });
 *
 * const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
 * expect(darkMode.matches).toBe(true);
 * ```
 *
 * Update during test:
 * ```js
 * mockMatchMedia.setMatch("(max-width: 768px)", true);
 * // Subsequent matchMedia calls will return updated value
 * ```
 */
export function createMockMatchMedia(initialMatches = {}) {
  const matches = { ...initialMatches };

  return {
    fn: function mockMatchMedia(query) {
      const listeners = [];

      return {
        media: query,
        matches: matches[query] ?? false,
        addListener: (listener) => {
          listeners.push(listener);
        },
        removeListener: (listener) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        },
        addEventListener: (event, listener) => {
          if (event === "change") {
            listeners.push(listener);
          }
        },
        removeEventListener: (event, listener) => {
          if (event === "change") {
            const index = listeners.indexOf(listener);
            if (index >= 0) listeners.splice(index, 1);
          }
        }
      };
    },

    setMatch: (query, value) => {
      matches[query] = value;
    },

    getAllMatches: () => {
      return { ...matches };
    }
  };
}

/**
 * Mock Sentry error tracking client
 *
 * @param {Object} config - Sentry configuration (optional)
 * @returns {Object} Mock Sentry client with tracking
 *
 * @example
 * ```js
 * const mockSentry = createMockSentry();
 *
 * // In your code under test:
 * Sentry.captureException(new Error("Test error"));
 *
 * // In your test:
 * expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error));
 * ```
 *
 * Configuration:
 * ```js
 * const mockSentry = createMockSentry({
 *   enableLogs: true,
 *   trackPerformance: true
 * });
 * ```
 */
export function createMockSentry(config = {}) {
  return {
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    startSpan: vi.fn((spanConfig, fn) => {
      // Call the function immediately
      return fn({
        setAttribute: vi.fn(),
        setMeasurement: vi.fn(),
        end: vi.fn()
      });
    }),
    setTag: vi.fn(),
    setContext: vi.fn(),
    clearBreadcrumbs: vi.fn(),
    addBreadcrumb: vi.fn(),
    logger: {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      fmt: (strings, ...values) => {
        // Simple template literal processor
        return strings.reduce((result, str, i) => result + str + (values[i] ?? ""), "");
      }
    },
    ...config
  };
}

/**
 * Mock geolocation API
 *
 * @param {Object} position - Initial position { latitude, longitude, accuracy }
 * @returns {Object} Mock geolocation object
 *
 * @example
 * ```js
 * const mockGeo = createMockGeolocation({
 *   latitude: 51.5074,
 *   longitude: -0.1278,
 *   accuracy: 10
 * });
 *
 * navigator.geolocation.getCurrentPosition((pos) => {
 *   expect(pos.coords.latitude).toBe(51.5074);
 * });
 * ```
 */
export function createMockGeolocation(position = {}) {
  const {
    latitude = 0,
    longitude = 0,
    accuracy = 10,
    altitude = null,
    heading = null,
    speed = null
  } = position;

  return {
    getCurrentPosition: vi.fn((success) => {
      success({
        coords: { latitude, longitude, accuracy, altitude, heading, speed },
        timestamp: Date.now()
      });
    }),
    watchPosition: vi.fn((success) => {
      success({
        coords: { latitude, longitude, accuracy, altitude, heading, speed },
        timestamp: Date.now()
      });
      return 1; // watch ID
    }),
    clearWatch: vi.fn()
  };
}

/**
 * ===== FIXTURE COMPOSITION PATTERNS =====
 *
 * Fixtures can be combined to create complex test environments:
 */

/**
 * Complete DOM environment with localStorage and network mocks
 *
 * @param {Object} config - Configuration for mocks
 * @returns {Object} Collection of all fixtures
 *
 * @example
 * ```js
 * beforeEach(async () => {
 *   const fixtures = createCompleteTestEnvironment({
 *     storageData: { battleId: "123" },
 *     networkResponses: { "/api/opponent": { ... } }
 *   });
 *
 *   harness = createSimpleHarness({ fixtures });
 *   await harness.setup();
 * });
 * ```
 */
export function createCompleteTestEnvironment(config = {}) {
  const { storageData = {}, networkResponses = {} } = config;

  const localStorage = createMockLocalStorage();
  // Pre-populate storage if provided
  Object.entries(storageData).forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  });

  return {
    localStorage,
    fetch: createMockFetch(networkResponses),
    matchMedia: createMockMatchMedia(),
    sentry: createMockSentry()
  };
}

/**
 * ===== INTEGRATION GUIDE: USING FIXTURES IN TESTS =====
 *
 * Step 1: Choose fixtures you need
 * Step 2: Pass to createSimpleHarness() config
 * Step 3: Call harness.setup() to inject them
 * Step 4: Use fixtures in tests (they're in global scope or window)
 * Step 5: Assert on fixture calls/state
 *
 * Example: Battle initialization with storage and network
 * ```js
 * const mockStorage = createMockLocalStorage();
 * const mockFetch = createMockFetch({
 *   "/api/opponent": { status: 200, data: { id: 1, name: "Fighter" } }
 * });
 *
 * const harness = createSimpleHarness({
 *   fixtures: { localStorage: mockStorage, fetch: mockFetch },
 *   useFakeTimers: true
 * });
 * await harness.setup();
 *
 * // Import module - it sees the mocked APIs
 * const { initBattle } = await harness.importModule("../../src/helpers/battleInit.js");
 * const battle = await initBattle();
 *
 * // Assert storage was used
 * expect(mockStorage.getItem("battle")).toBeDefined();
 *
 * // Assert network was called
 * expect(mockFetch).toHaveBeenCalledWith("/api/opponent");
 * ```
 */

/**
 * ===== PERFORMANCE NOTES =====
 *
 * - Fixtures are injected fresh for each test (no cross-test pollution)
 * - localStorage mock is O(1) for get/set operations
 * - fetch mock stores call history in memory (spy pattern)
 * - matchMedia mock allows runtime updates without re-injection
 *
 * ===== EXTENDING FIXTURES =====
 *
 * To add a custom fixture:
 *
 * 1. Create a fixture factory function:
 *    ```js
 *    export function createMockAnalytics() {
 *      return {
 *        track: vi.fn(),
 *        identify: vi.fn()
 *      };
 *    }
 *    ```
 *
 * 2. Add injection handler to harness injectFixture() if needed
 *
 * 3. Use in test:
 *    ```js
 *    const harness = createSimpleHarness({
 *      fixtures: { analytics: createMockAnalytics() }
 *    });
 *    ```
 *
 * ===== COMMON ISSUES =====
 *
 * Q: Fixture not available in module code?
 * A: Ensure you import module AFTER harness.setup()
 *
 * Q: Multiple tests interfering with each other?
 * A: Each beforeEach creates fresh fixtures; check if you're reusing harness
 *
 * Q: Need to reset fixture state between tests?
 * A: Create new fixture in each beforeEach (recommended) or call .clear()/.reset()
 *
 * ===== REFERENCES =====
 * - createSimpleHarness: tests/helpers/integrationHarness.js
 * - Example usage: tests/examples/integration.test.js
 * - Harness tests: tests/helpers/integrationHarness.test.js
 */
