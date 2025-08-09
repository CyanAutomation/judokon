import { expect, afterEach, beforeEach } from "vitest";
import { resetDom } from "./utils/testUtils.js";

const originalMatchMedia = global.matchMedia;

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
  resetDom();
});

// Prevent JSDOM navigation errors when tests assign to window.location.href.
// Simulate URL changes by updating history without performing a real navigation.
beforeEach(() => {
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
  } catch {}
});
