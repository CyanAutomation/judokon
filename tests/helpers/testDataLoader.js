/**
 * Test Data Loader: Provides fixture data and mocking utilities for tests.
 *
 * This module centralizes test fixture data and mocking patterns to ensure
 * consistent data loading behavior across integration and unit tests, especially
 * in JSDOM environments where fetch may fail for file:// or relative URLs.
 *
 * @pseudocode
 * 1. Export minimal judoka fixtures (2-3 test judoka with required fields).
 * 2. Export gokyo (judo techniques) fixtures for signature moves.
 * 3. Provide createMockFetchJson() factory that returns a configurable fetch mock.
 * 4. Provide preset implementations (minimalSet, extendedSet) for common test patterns.
 * 5. Export helper to apply mocks to test context (vi.mock wrapper).
 */

/**
 * Minimal judoka fixture: Player character.
 * ID: 111 to avoid conflicts with real data.
 * @type {object}
 */
export const judokaPlayer = {
  id: 111,
  firstname: "Player",
  surname: "One",
  country: "United States",
  countryCode: "us",
  weightClass: "-81",
  category: "Judo",
  stats: { power: 7, speed: 7, technique: 7, kumikata: 7, newaza: 6 },
  signatureMove: 0,
  signatureMoveId: 0,
  lastUpdated: "2025-01-01T00:00:00.000Z",
  profileUrl: "",
  bio: "Test player fixture for integration tests",
  gender: "male",
  isHidden: false,
  rarity: "Common",
  cardCode: "TEST-PLY-0111",
  matchesWon: 0,
  matchesLost: 0,
  matchesDrawn: 0
};

/**
 * Minimal judoka fixture: Opponent character.
 * ID: 114 to avoid conflicts with real data.
 * @type {object}
 */
export const judokaOpponent = {
  id: 114,
  firstname: "Opponent",
  surname: "Two",
  country: "Japan",
  countryCode: "jp",
  weightClass: "-81",
  category: "Judo",
  stats: { power: 6, speed: 8, technique: 6, kumikata: 6, newaza: 7 },
  signatureMove: 1,
  signatureMoveId: 1,
  lastUpdated: "2025-01-01T00:00:00.000Z",
  profileUrl: "",
  bio: "Test opponent fixture for integration tests",
  gender: "male",
  isHidden: false,
  rarity: "Common",
  cardCode: "TEST-OPP-0114",
  matchesWon: 5,
  matchesLost: 2,
  matchesDrawn: 1
};

/**
 * Extended judoka fixture set: Additional characters for varied testing.
 * @type {object}
 */
export const judokaThird = {
  id: 117,
  firstname: "Third",
  surname: "Fighter",
  country: "France",
  countryCode: "fr",
  weightClass: "-66",
  category: "Judo",
  stats: { power: 5, speed: 9, technique: 8, kumikata: 7, newaza: 5 },
  signatureMove: 2,
  signatureMoveId: 2,
  lastUpdated: "2025-01-01T00:00:00.000Z",
  profileUrl: "",
  bio: "Third test fixture for varied test scenarios",
  gender: "female",
  isHidden: false,
  rarity: "Epic",
  cardCode: "TEST-THD-0117",
  matchesWon: 10,
  matchesLost: 3,
  matchesDrawn: 0
};

/**
 * Minimal gokyo (judo techniques) fixtures for signature moves.
 * IDs: 0, 1, 2 corresponding to judoka fixtures.
 * @type {Array<object>}
 */
export const gokyoFixtures = [
  {
    id: 0,
    name: "O Goshi",
    japanese: "大腰",
    description: "Major hip throw",
    style: "Throwing",
    category: "Hip",
    subCategory: "Basic"
  },
  {
    id: 1,
    name: "Seoi Nage",
    japanese: "背負投",
    description: "Shoulder throw",
    style: "Throwing",
    category: "Back",
    subCategory: "Basic"
  },
  {
    id: 2,
    name: "De Ashi Barai",
    japanese: "出足払",
    description: "Foot sweep",
    style: "Throwing",
    category: "Foot",
    subCategory: "Basic"
  }
];

/**
 * Preset minimal judoka set: Just player and opponent for fast tests.
 * @type {Array<object>}
 */
export const judokaMinimalSet = [judokaPlayer, judokaOpponent];

/**
 * Preset extended judoka set: Includes third fighter for varied scenarios.
 * @type {Array<object>}
 */
export const judokaExtendedSet = [judokaPlayer, judokaOpponent, judokaThird];

/**
 * Create a mock fetchJson function for tests.
 *
 * @pseudocode
 * 1. Accept optional overrides for judoka and gokyo data.
 * 2. Return an async function that:
 *    - When path includes "judoka", return judoka data.
 *    - When path includes "gokyo", return gokyo data.
 *    - When path includes "gameTimers", return empty array (skip for now).
 *    - Otherwise, resolve with empty object (safe fallback).
 * 3. Support custom implementations via overrides.
 *
 * @param {object} [options={}] - Configuration options.
 * @param {Array<object>} [options.judoka] - Override judoka fixture data (default: minimalSet).
 * @param {Array<object>} [options.gokyo] - Override gokyo fixture data (default: gokyoFixtures).
 * @param {Function} [options.onFetch] - Optional callback for fetch invocations (for debugging).
 * @returns {Function} Mock fetchJson function matching dataUtils.fetchJson signature.
 */
export function createMockFetchJson(options = {}) {
  const { judoka = judokaMinimalSet, gokyo = gokyoFixtures, onFetch = null } = options;

  return async (path) => {
    if (onFetch) onFetch(path);

    if (typeof path === "string" && path.includes("judoka")) {
      return judoka;
    }

    if (typeof path === "string" && path.includes("gokyo")) {
      return gokyo;
    }

    // For other paths, return empty array or object
    // This prevents errors when tests load other data files
    if (
      (typeof path === "string" && path.includes("Timers")) ||
      (typeof path === "string" && path.includes("timer"))
    ) {
      return [];
    }

    // Fallback: return empty object for unknown paths
    return {};
  };
}

/**
 * Apply test data mocks to a test context (for use with vi.mock).
 *
 * Creates a module mock for dataUtils.fetchJson with the provided
 * fetchJson mock function. Used in conjunction with vi.mock() at
 * module level.
 *
 * @pseudocode
 * 1. Accept a mock fetchJson function.
 * 2. Return an object that vi.mock() can use as a module factory.
 * 3. Export fetchJson and importJsonModule for complete dataUtils mocking.
 *
 * @param {Function} mockFetchJson - Mock function to use for fetchJson.
 * @param {object} [options={}] - Additional options.
 * @param {Function} [options.importJsonModule] - Mock for importJsonModule.
 * @returns {object} Module factory object for vi.mock().
 */
export function createDataUtilsMock(mockFetchJson, options = {}) {
  const { importJsonModule = null } = options;

  return {
    fetchJson: mockFetchJson,
    importJsonModule: importJsonModule || (async () => ({})),
    validateWithSchema: async () => undefined
  };
}

/**
 * Create a debug tracking wrapper for mock fetchJson.
 *
 * Helps troubleshoot test setup by logging all fetch calls and
 * identifying missing data files or incorrect path resolution.
 *
 * @pseudocode
 * 1. Create a Set to track unique fetch paths called.
 * 2. Wrap the provided mockFetchJson with logging.
 * 3. Return both the wrapped function and a helper to report calls.
 *
 * @param {Function} mockFetchJson - Original mock function to wrap.
 * @returns {{wrapped: Function, getCalls: Function}} Wrapped function and report helper.
 */
export function createDebugTrackingFetchJson(mockFetchJson) {
  const callLog = new Set();

  const wrapped = async (path) => {
    callLog.add(path);
    return mockFetchJson(path);
  };

  const getCalls = () => Array.from(callLog);
  const reportCalls = () => {
    console.log("Mock fetchJson calls:", getCalls());
  };

  return { wrapped, getCalls, reportCalls };
}
