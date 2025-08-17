
import { expect, afterEach, beforeEach } from "vitest";
import { resetDom } from "./utils/testUtils.js";
import { muteConsole, restoreConsole } from "./utils/console.js";

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
  // Restore console to originals after each test
  restoreConsole(["warn", "error"]);
});

// Prevent JSDOM navigation errors when tests assign to window.location.href.
// Simulate URL changes by updating history without performing a real navigation.
beforeEach(() => {
  // Mute noisy console methods by default; tests can opt-in to logging
  muteConsole(["warn", "error"]);
  try {
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
      history.pushState = (...args) => {
        const result = originalPushState(...args);
        const url = args[2];
        if (url !== undefined && url !== null) {
          try {
            state.href = new URL(String(url), state.href).href;
          } catch {}
        }
        return result;
      };
      history.replaceState = (...args) => {
        const result = originalReplaceState(...args);
        const url = args[2];
        if (url !== undefined && url !== null) {
          try {
            state.href = new URL(String(url), state.href).href;
          } catch {}
        }
        return result;
      };
    }
  } catch {}
});