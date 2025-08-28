import { describe, it, expect, afterEach, vi } from "vitest";
import { getOrientation } from "../../src/helpers/orientation.js";

const originalMatchMedia = window.matchMedia;
const originalWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
const originalHeightDescriptor = Object.getOwnPropertyDescriptor(window, "innerHeight");
const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

const mockMatchMedia = (matches) => vi.fn().mockReturnValue({ matches });

const setViewport = (width, height) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height
  });
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "innerWidth", originalWidthDescriptor);
  Object.defineProperty(window, "innerHeight", originalHeightDescriptor);
  window.innerWidth = originalWidth;
  window.innerHeight = originalHeight;
});

describe("getOrientation", () => {
  it("returns portrait when matchMedia and viewport match", () => {
    window.matchMedia = mockMatchMedia(true);
    setViewport(600, 800);
    expect(getOrientation()).toBe("portrait");
  });

  it("prefers viewport when matchMedia is stale", () => {
    window.matchMedia = mockMatchMedia(true);
    setViewport(800, 600);
    expect(getOrientation()).toBe("landscape");
  });

  it("falls back to viewport when matchMedia throws", () => {
    window.matchMedia = () => {
      throw new Error("no matchMedia");
    };
    setViewport(600, 800);
    expect(getOrientation()).toBe("portrait");
  });
});
