import { expect, afterEach } from "vitest";
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
