import { isEnabled } from "../featureFlags.js";

const HEADLESS_USER_AGENT_TOKENS = [
  "playwright",
  "headlesschrome",
  "chromium-headless",
  "phantomjs",
  "jsdom"
];

/**
 * Conditionally expose the Classic Battle test API when running under test
 * runners (Vitest, Playwright) without bundling the heavyweight helpers in
 * production.
 *
 * @pseudocode
 * 1. Detect Node-based test environments via process flags.
 * 2. Inspect browser globals and navigator automation hints for test runners.
 * 3. Fall back to the `enableTestMode` feature flag to respect manual overrides.
 * 4. Dynamically import the test API module and invoke `exposeTestAPI()` when enabled.
 * 5. Swallow any errors to avoid noisy failures during bootstrap.
 *
 * @returns {Promise<void>} Resolves once the exposure attempt completes.
 */
export async function exposeClassicBattleTestAPI() {
  if (!shouldExposeTestAPI()) {
    return;
  }

  try {
    const mod = await import("../testApi.js");
    mod?.exposeTestAPI?.();
  } catch {
    // Ignore exposure failures; tests can manually import as a fallback.
  }
}

function shouldExposeTestAPI() {
  if (isNodeTestEnvironment()) {
    return true;
  }

  const win = getWindow();
  if (win && (hasBrowserTestFlags(win) || isLocalhostOrigin(win))) {
    return true;
  }

  const nav = getNavigator(win);
  if (nav && (isNavigatorAutomated(nav) || isTestUserAgent(nav))) {
    return true;
  }

  return isTestModeFlagEnabled();
}

function isNodeTestEnvironment() {
  if (typeof process === "undefined") {
    return false;
  }

  if (process.env?.NODE_ENV === "test") {
    return true;
  }

  const vitestFlag = process.env?.VITEST;
  return vitestFlag === "true" || vitestFlag === true;
}

function hasBrowserTestFlags(win) {
  try {
    return Boolean(win.__TEST__ || win.__VITEST__ || win.__PLAYWRIGHT__ || win.__PLAYWRIGHT_TEST__);
  } catch {
    return false;
  }
}

function getWindow() {
  try {
    return typeof window !== "undefined" ? window : undefined;
  } catch {
    return undefined;
  }
}

function getNavigator(win) {
  if (win) {
    try {
      if (win.navigator) {
        return win.navigator;
      }
    } catch {}
  }

  try {
    return typeof navigator !== "undefined" ? navigator : undefined;
  } catch {
    return undefined;
  }
}

function isNavigatorAutomated(nav) {
  try {
    return Boolean(nav && nav.webdriver);
  } catch {
    return false;
  }
}

function isTestUserAgent(nav) {
  const normalizedAgent = getNormalizedUserAgent(nav);
  if (!normalizedAgent) {
    return false;
  }

  return HEADLESS_USER_AGENT_TOKENS.some((token) => normalizedAgent.includes(token));
}

/**
 * Determines if the current origin represents localhost for development use.
 *
 * @pseudocode
 * 1. Obtain a location object from the provided window or global scope.
 * 2. Extract and normalize the hostname, removing port decorations and IPv6 brackets.
 * 3. Compare against the accepted localhost tokens, including IPv6 loopback.
 *
 * @param {Window} win - The window object to inspect for location data.
 * @returns {boolean} True when the hostname matches a localhost identifier.
 */
function isLocalhostOrigin(win) {
  const loc = getLocation(win);
  if (!loc) {
    return false;
  }

  const hostname = normalizeHostname(loc.hostname || loc.host);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * Safely retrieves a location object from a window or global scope.
 *
 * @pseudocode
 * 1. Attempt to read `location` from the supplied window, guarding for access errors.
 * 2. Fall back to the global `location` when the window value is unavailable.
 * 3. Return `undefined` if neither source can be accessed without throwing.
 *
 * @param {Window} win - The window reference that may contain a location.
 * @returns {Location|undefined} The resolved location or undefined when inaccessible.
 */
function getLocation(win) {
  if (win) {
    try {
      if (win.location) {
        return win.location;
      }
    } catch {}
  }

  try {
    return typeof location !== "undefined" ? location : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes hostnames by lowercasing and removing port suffixes.
 *
 * @pseudocode
 * 1. Verify the input is a string; otherwise return an empty string.
 * 2. Trim whitespace and transform to lowercase for stable comparisons.
 * 3. Remove IPv6 brackets and strip a trailing port when present.
 *
 * @param {string} hostname - The hostname value that may contain a port.
 * @returns {string} The normalized hostname without port information.
 */
function normalizeHostname(hostname) {
  if (typeof hostname !== "string") {
    return "";
  }

  const trimmed = hostname.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("[")) {
    return normalizeBracketedIpv6Hostname(trimmed);
  }

  return stripIpv4PortIfPresent(trimmed);
}

function normalizeBracketedIpv6Hostname(hostname) {
  const bracketCloseIndex = hostname.indexOf("]");
  if (bracketCloseIndex >= 0) {
    return hostname.slice(1, bracketCloseIndex) || "";
  }

  // Malformed IPv6 address without closing bracket.
  return "";
}

function stripIpv4PortIfPresent(hostname) {
  const firstColonIndex = hostname.indexOf(":");
  if (firstColonIndex === -1) {
    return hostname;
  }

  const lastColonIndex = hostname.lastIndexOf(":");
  // IPv4 addresses have at most one colon (for port), IPv6 addresses have multiple.
  if (firstColonIndex === lastColonIndex) {
    return hostname.slice(0, firstColonIndex) || "";
  }

  // Multiple colons indicate IPv6 address - return as-is.
  return hostname;
}

function getNormalizedUserAgent(nav) {
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
        userAgent = brands
          .map((brand) => brand.brand)
          .join(" ")
          .toLowerCase();
      }
    } catch {
      userAgent = "";
    }
  }

  return userAgent ? userAgent.toLowerCase() : "";
}

function isTestModeFlagEnabled() {
  try {
    return isEnabled("enableTestMode");
  } catch {
    return false;
  }
}
