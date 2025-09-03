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

// vi.importMz: utility for dynamic imports while preserving mocks
if (!vi.importMz) {
  vi.importMz = vi.importActual;
}

const originalMatchMedia = global.matchMedia;
let originalPushState;
let originalReplaceState;

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
});

// Prevent JSDOM navigation errors when tests assign to window.location.href.
// Simulate URL changes by updating history without performing a real navigation.
beforeEach(async () => {
  // Mute noisy console methods by default; tests can opt-in to logging
  muteConsole(["warn", "error", "debug", "log"]);
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
