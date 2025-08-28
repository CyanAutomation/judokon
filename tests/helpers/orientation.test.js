import { describe, it, expect, afterEach, vi } from "vitest";
import { getOrientation } from "../../src/helpers/orientation.js";

const originalMatchMedia = window.matchMedia;
const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

const mockMatchMedia = (matches) => vi.fn().mockReturnValue({ matches });

const setViewport = (width, height) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  setViewport(originalWidth, originalHeight);
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
