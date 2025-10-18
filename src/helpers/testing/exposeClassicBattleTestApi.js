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
  } catch (error) {
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
    return Boolean(win.__TEST__ || win.__VITEST__ || win.__PLAYWRIGHT__);
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

function isLocalhostOrigin(win) {
  const loc = getLocation(win);
  if (!loc) {
    return false;
  }

  const hostname = normalizeHostname(loc.hostname || loc.host);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

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

function normalizeHostname(hostname) {
  if (typeof hostname !== "string") {
    return "";
  }

  const trimmed = hostname.trim().toLowerCase();
  const withoutPort = trimmed.split(":")[0];
  return withoutPort || "";
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
        userAgent = brands.map((brand) => brand.brand).join(" ");
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
