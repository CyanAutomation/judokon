// [TEST DEBUG] top-level setup.js
// eslint-disable-next-line no-console
console.log('[TEST DEBUG] top-level setup.js');
if (typeof CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, eventInitDict) {
      super(type, eventInitDict);
      this.detail = eventInitDict?.detail;
    }
  };
  // [TEST DEBUG] after CustomEvent polyfill
  // eslint-disable-next-line no-console
  console.log('[TEST DEBUG] after CustomEvent polyfill');
}
if (typeof global.requestAnimationFrame === "undefined") {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
  // [TEST DEBUG] after requestAnimationFrame polyfill
  // eslint-disable-next-line no-console
  console.log('[TEST DEBUG] after requestAnimationFrame polyfill');
}
if (typeof global.cancelAnimationFrame === "undefined") {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  // [TEST DEBUG] after cancelAnimationFrame polyfill
  // eslint-disable-next-line no-console
  console.log('[TEST DEBUG] after cancelAnimationFrame polyfill');
}
import { expect, afterEach, beforeEach, vi } from "vitest";
import { resetDom } from "./utils/testUtils.js";
import { muteConsole, restoreConsole } from "./utils/console.js";

// [TEST DEBUG] after imports
// eslint-disable-next-line no-console
console.log('[TEST DEBUG] after imports');

// Early module-level mute: some modules emit test-oriented logs during import
// time which run before `beforeEach` executes. When running under Vitest we
// apply a global mute immediately to avoid captured worker stdout lines.
// For debugging local test runs set SHOW_TEST_LOGS=1 in the environment to
// bypass muting and allow console/stdout to appear in the test run.
try {
  const IS_VITEST = typeof process !== "undefined" && process.env && process.env.VITEST;
  const SHOW_LOGS = typeof process !== "undefined" && process.env && process.env.SHOW_TEST_LOGS;
  if (IS_VITEST && !SHOW_LOGS) {
    // mute console methods immediately
    muteConsole(["warn", "error", "debug", "log"]);
    // [TEST DEBUG] after muteConsole
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] after muteConsole');
    try {
      if (process && process.stdout && process.stderr) {
        // save originals at module scope so afterEach can restore them
        __originalStdoutWrite = process.stdout.write;
        __originalStderrWrite = process.stderr.write;
        process.stdout.write = () => {};
        process.stderr.write = () => {};
        // [TEST DEBUG] after patching process.stdout/stderr
        // eslint-disable-next-line no-console
        console.log('[TEST DEBUG] after patching process.stdout/stderr');
      }
    } catch {}
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
  // Mute noisy console methods by default; tests can opt-in to logging
  // Mute noisy console methods by default; tests can opt-in to logging
  const SHOW_LOGS = typeof process !== "undefined" && process.env && process.env.SHOW_TEST_LOGS;
  if (!SHOW_LOGS) {
    muteConsole(["warn", "error", "debug", "log"]);
    // Also mute direct stdout/stderr writes which some telemetry utilities use
    try {
      __originalStdoutWrite = process.stdout.write;
      __originalStderrWrite = process.stderr.write;
      process.stdout.write = () => {};
      process.stderr.write = () => {};
    } catch {}
  }
  try {
    // Ensure snackbars are enabled for tests by default
    if (typeof window !== "undefined" && window.__disableSnackbars) {
      delete window.__disableSnackbars;
    }
    // Ensure a snackbar container exists for any code paths that use it
    if (typeof document !== "undefined" && !document.getElementById("snackbar-container")) {
      const container = document.createElement("div");
      container.id = "snackbar-container";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
  } catch {}
  try {
    // Preload classic battle bindings so event listeners/promises are registered
    // Tests that don't use classic battle will simply ignore this.
    const mod = await import("../src/helpers/classicBattle.js");
    if (mod && typeof mod.__ensureClassicBattleBindings === "function") {
      await mod.__ensureClassicBattleBindings();
    }
    // Ensure a fresh BattleEngine instance for each test to avoid shared state
    try {
      const facade = await import("../src/helpers/battleEngineFacade.js");
      if (facade && typeof facade.createBattleEngine === "function") {
        // Force creation so tests don't accidentally reuse a prior engine instance
        facade.createBattleEngine({ forceCreate: true });
      }
    } catch {}
    // Test-only: some suite orderings can leave `document.body.dataset.target` unset
    // after round selection; keep a minimal fallback here to avoid touching
    // production source. This runs only under Vitest.
    try {
      if (typeof process !== "undefined" && process.env && process.env.VITEST) {
        try {
          const facade = await import("../src/helpers/battleEngineFacade.js");
          const getPointsToWin =
            facade && typeof facade.getPointsToWin === "function" ? facade.getPointsToWin : null;
          if (
            typeof document !== "undefined" &&
            !document.body?.dataset?.target &&
            getPointsToWin
          ) {
            const pts = getPointsToWin();
            if (pts !== undefined && pts !== null) document.body.dataset.target = String(pts);
          }
        } catch {}
      }
    } catch {}
    const currentHref = String(window.location.href || "http://localhost/");
    const state = { href: currentHref };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return state.href;
        },
        set href(val) {
          try {
            const url = new URL(String(val), state.href).href;
            state.href = url;
            if (typeof history !== "undefined" && typeof history.replaceState === "function") {
              history.replaceState(null, "", url);
            }
          } catch {
            state.href = String(val);
          }
        },
        reload: () => {},
        toString() {
          return state.href;
        },
        get origin() {
          try {
            return new URL(state.href).origin;
          } catch {
            return "";
          }
        },
        get search() {
          try {
            return new URL(state.href).search;
          } catch {
            return "";
          }
        },
        set search(val) {
          try {
            const url = new URL(state.href);
            url.search = String(val);
            state.href = url.href;
            if (typeof history !== "undefined" && typeof history.replaceState === "function") {
              history.replaceState(null, "", url.href);
            }
          } catch {}
        },
        assign: (val) => {
          try {
            const url = new URL(String(val), state.href).href;
            state.href = url;
            if (typeof history !== "undefined" && typeof history.replaceState === "function") {
              history.replaceState(null, "", url);
            }
          } catch {}
        },
        replace: (val) => {
          try {
            const url = new URL(String(val), state.href).href;
            state.href = url;
            if (typeof history !== "undefined" && typeof history.replaceState === "function") {
              history.replaceState(null, "", url);
            }
          } catch {}
        }
      }
    });
    if (typeof history !== "undefined") {
      if (!originalPushState) {
        originalPushState = history.pushState.bind(history);
      }
      if (!originalReplaceState) {
        originalReplaceState = history.replaceState.bind(history);
      }
      function updateHrefOnly(url) {
        try {
          state.href = new URL(String(url), state.href).href;
        } catch {}
      }
      function sameOrigin(u1, u2) {
        try {
          const base = state.href || String(window.location?.href || "http://localhost/");
          const a = new URL(String(u1), base);
          const b = new URL(String(u2), base);
          return a.origin === b.origin;
        } catch {
          return false;
        }
      }
      history.pushState = (...args) => {
        const url = args[2];
        if (url !== undefined && url !== null) {
          // Avoid JSDOM SecurityError by skipping cross-origin calls; update href only.
          if (!sameOrigin(url, state.href)) {
            updateHrefOnly(url);
            return;
          }
        }
        const result = originalPushState(...args);
        if (url !== undefined && url !== null) updateHrefOnly(url);
        return result;
      };
      history.replaceState = (...args) => {
        const url = args[2];
        if (url !== undefined && url !== null) {
          if (!sameOrigin(url, state.href)) {
            updateHrefOnly(url);
            return;
          }
        }
        const result = originalReplaceState(...args);
        if (url !== undefined && url !== null) updateHrefOnly(url);
        return result;
      };
    }
  } catch {}
});
// --- Keep Node's global `process` stable during Vitest runs ---
// If a dependency/test removed it, restore from Node, then lock the binding.
if (typeof globalThis.process === "undefined") {
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
