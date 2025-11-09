if (typeof CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, eventInitDict) {
      super(type, eventInitDict);
      this.detail = eventInitDict?.detail;
    }
  };
}
if (typeof global.requestAnimationFrame === "undefined") {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
}
if (typeof global.cancelAnimationFrame === "undefined") {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}
import { expect, afterEach, beforeEach, vi } from "vitest";
import { resetDom } from "./utils/testUtils.js";
import { muteConsole, restoreConsole } from "./utils/console.js";
// Import battleEvents to ensure it's loaded before vi.resetModules() clears it
import "../src/helpers/classicBattle/battleEvents.js";

// Early module-level mute: some modules emit test-oriented logs during import
// time which run before `beforeEach` executes. When running under Vitest we
// apply a global mute immediately to avoid captured worker stdout lines.
// For debugging local test runs set SHOW_TEST_LOGS=1 in the environment to
// bypass muting and allow console/stdout to appear in the test run.
try {
  if (process?.env?.VITEST) {
    applyConsoleMuting();
  }
} catch {}

// Global mock removed - individual tests should handle their own mocking

// vi.importMz: utility for dynamic imports while preserving mocks
if (!vi.importMz) {
  vi.importMz = vi.importActual;
}

const originalMatchMedia = global.matchMedia;
let originalPushState;
let originalReplaceState;
// Keep original process std writes so we can restore them after each test
let __originalStdoutWrite;
let __originalStderrWrite;

/**
 * Apply global console and stdout/stderr muting for tests unless SHOW_TEST_LOGS is set.
 * Saves original write functions for restoration.
 */
function applyConsoleMuting() {
  const SHOW_LOGS = process?.env?.SHOW_TEST_LOGS;
  if (!SHOW_LOGS) {
    muteConsole(["warn", "error", "debug", "log"]);
    try {
      if (process?.stdout && process?.stderr) {
        __originalStdoutWrite = process.stdout.write;
        __originalStderrWrite = process.stderr.write;
        process.stdout.write = () => {};
        process.stderr.write = () => {};
      }
    } catch {}
  }
}

/**
 * Ensure a fresh BattleEngine instance for each test to avoid shared state.
 */
async function ensureFreshBattleEngine() {
  try {
    const facade = await import("../src/helpers/battleEngineFacade.js");
    if (facade?.createBattleEngine && typeof facade.createBattleEngine === "function") {
      facade.createBattleEngine({ forceCreate: true });
    }
  } catch {}
}

/**
 * Parse a URL string, handling errors gracefully.
 */
function parseUrlSafely(urlString, baseUrl) {
  try {
    return new URL(String(urlString), baseUrl);
  } catch {
    return null;
  }
}

/**
 * Mock location object for JSDOM test environments.
 * Provides href, origin, search, and navigation methods while avoiding JSDOM SecurityErrors.
 */
class MockLocation {
  constructor(initialHref = "http://localhost/") {
    this.state = { href: initialHref };
  }

  updateHref(newHref, shouldUpdateHistory = true) {
    try {
      this.state.href = new URL(String(newHref), this.state.href).href;
      if (shouldUpdateHistory && typeof history?.replaceState === "function") {
        history.replaceState(null, "", this.state.href);
      }
    } catch {
      this.state.href = String(newHref);
    }
  }

  get href() {
    return this.state.href;
  }

  set href(val) {
    this.updateHref(val);
  }

  get origin() {
    const url = parseUrlSafely(this.state.href);
    return url?.origin || "";
  }

  get search() {
    const url = parseUrlSafely(this.state.href);
    return url?.search || "";
  }

  set search(val) {
    try {
      const url = parseUrlSafely(this.state.href);
      if (url) {
        url.search = String(val);
        this.updateHref(url.href);
      }
    } catch {}
  }

  assign(val) {
    this.updateHref(val);
  }

  replace(val) {
    this.updateHref(val);
  }

  reload() {
    // No-op for tests
  }

  toString() {
    return this.state.href;
  }
}

/**
 * Check if two URLs share the same origin.
 * Safely handles malformed URLs by returning false.
 */
function sameOrigin(url1, url2, baseUrl = "http://localhost/") {
  try {
    const base = baseUrl || "http://localhost/";
    const a = parseUrlSafely(url1, base);
    const b = parseUrlSafely(url2, base);
    return a && b && a.origin === b.origin;
  } catch {
    return false;
  }
}

/**
 * Setup mock window.location to prevent JSDOM navigation errors.
 * Handles cross-origin safety by preventing SecurityErrors on history calls.
 */
function setupMockLocation(mockLocation) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: mockLocation
  });
}

expect.extend({
  toHaveAttribute(element, attribute, expected) {
    const isElem = element && typeof element.getAttribute === "function";
    if (!isElem) {
      return {
        pass: false,
        message: () => "received value must be an Element with getAttribute method"
      };
    }
    const hasAttr = element.hasAttribute(attribute);
    const actual = element.getAttribute(attribute);
    const pass = hasAttr && (expected === undefined || String(actual) === String(expected));
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have attribute ${attribute} with value ${expected}`
          : expected === undefined
            ? `expected element to have attribute ${attribute}`
            : `expected element attribute ${attribute} to be ${expected}, but got ${actual}`
    };
  }
});

afterEach(() => {
  global.matchMedia = originalMatchMedia;
  if (typeof history !== "undefined") {
    if (originalPushState) history.pushState = originalPushState;
    if (originalReplaceState) history.replaceState = originalReplaceState;
  }
  resetDom();
  // Clear transient UI surfaces to avoid cross-test bleed
  try {
    const sc = document.getElementById("snackbar-container");
    if (sc) sc.innerHTML = "";
  } catch {}
  try {
    const msg = document.querySelector("#round-message");
    if (msg) msg.textContent = "";
  } catch {}
  // Restore console to originals after each test
  restoreConsole(["warn", "error", "debug", "log"]);
  // Restore stdout/stderr writes
  try {
    if (__originalStdoutWrite) process.stdout.write = __originalStdoutWrite;
    if (__originalStderrWrite) process.stderr.write = __originalStderrWrite;
  } catch {}
});

// Prevent JSDOM navigation errors when tests assign to window.location.href.
// Simulate URL changes by updating history without performing a real navigation.
beforeEach(async () => {
  // Reset module cache FIRST to ensure test-specific mocks are applied correctly.
  // This must happen before any modules that might be mocked are imported.
  vi.resetModules();
  
  // Mute noisy console methods by default; tests can opt-in to logging
  applyConsoleMuting();
  try {
    // Ensure snackbars are enabled for tests by default
    if (window?.__disableSnackbars) {
      delete window.__disableSnackbars;
    }
    // Ensure a snackbar container exists for any code paths that use it
    if (!document?.getElementById("snackbar-container")) {
      const container = document.createElement("div");
      container.id = "snackbar-container";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
  } catch {}
  try {
    // Re-import testHooks after vi.resetModules() so the module cache is fresh
    // and test-specific mocks (like vi.mock('eventDispatcher.js')) are applied.
    const { initializeTestBindingsLight: freshInit } = await import("../src/helpers/classicBattle/testHooks.js");
    freshInit();
    // Ensure a fresh BattleEngine instance for each test to avoid shared state
    await ensureFreshBattleEngine();
    // Ensure dataset.target is set with points-to-win value if missing
    await ensurePointsToWinDataset();
    // Setup mock window.location to prevent JSDOM navigation errors
    const currentHref = String(window.location.href || "http://localhost/");
    const mockLocation = new MockLocation(currentHref);
    setupMockLocation(mockLocation);

    // Setup history API interceptors to prevent cross-origin SecurityErrors
    if (typeof history !== "undefined") {
      if (!originalPushState) {
        originalPushState = history.pushState.bind(history);
      }
      if (!originalReplaceState) {
        originalReplaceState = history.replaceState.bind(history);
      }

      history.pushState = (...args) => {
        const url = args[2];
        if (url !== undefined && url !== null && !sameOrigin(url, mockLocation.href)) {
          // Avoid JSDOM SecurityError by skipping cross-origin calls; update href only
          mockLocation.updateHref(url, false);
          return;
        }
        const result = originalPushState(...args);
        if (url !== undefined && url !== null) mockLocation.updateHref(url, false);
        return result;
      };

      history.replaceState = (...args) => {
        const url = args[2];
        if (url !== undefined && url !== null && !sameOrigin(url, mockLocation.href)) {
          mockLocation.updateHref(url, false);
          return;
        }
        const result = originalReplaceState(...args);
        if (url !== undefined && url !== null) mockLocation.updateHref(url, false);
        return result;
      };
    }
  } catch {}
});
// --- Keep Node's global `process` stable during Vitest runs ---
// If a dependency/test removed it, restore from Node, then lock the binding.
if (!globalThis.process) {
  // restore minimally; should be rare—root cause still gets removed in step 2
  globalThis.process = process;
}
const __originalProcessRef = globalThis.process;
try {
  Object.defineProperty(globalThis, "process", {
    configurable: false,
    writable: false,
    value: __originalProcessRef
  });
} catch {
  // property already non-configurable; that's fine
}
// Detect late attempts to swap the binding
afterAll(() => {
  if (globalThis.process !== __originalProcessRef) {
    throw new Error("A test or dependency replaced the global `process` binding.");
  }
});
// --------------------------------------------------------------
