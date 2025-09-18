import { afterEach, describe, it, expect, vi } from "vitest";
import {
  applySvgFallback,
  DEFAULT_FALLBACK,
  __getSvgFallbackStateForTests,
  __resetSvgFallbackStateForTests
} from "../../src/helpers/svgFallback.js";

const appendImage = (src) => {
  const img = document.createElement("img");
  img.src = src;
  document.body.appendChild(img);
  return img;
};

afterEach(() => {
  document.body.innerHTML = "";
  __resetSvgFallbackStateForTests();
});

describe("applySvgFallback", () => {
  it("replaces broken SVG source with fallback", () => {
    const img = appendImage("logo.svg");

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.src).toContain("fallback.png");
    expect(img.classList.contains("svg-fallback")).toBe(true);
  });

  it("ignores non-SVG images", () => {
    const img = appendImage("logo.png");

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.src).toContain("logo.png");
  });

  it("does not throw if there are no images in the DOM", () => {
    expect(() => applySvgFallback("fallback.png")).not.toThrow();
  });

  it("uses default fallback path when none provided", () => {
    const img = appendImage("logo.svg");

    applySvgFallback();
    img.dispatchEvent(new Event("error"));

    // Should replace src with the default fallback image
    // jsdom resolves relative paths to absolute URLs
    expect(img.src).toContain(DEFAULT_FALLBACK.replace("./", "/"));
  });

  it("does not add svg-fallback class to non-SVG images", () => {
    const img = appendImage("logo.jpg");

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.classList.contains("svg-fallback")).toBe(false);
  });

  it("preserves existing onerror handler", () => {
    const img = appendImage("logo.svg");
    const existingHandler = vi.fn();
    img.onerror = existingHandler;

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(existingHandler).toHaveBeenCalledTimes(1);
    expect(img.classList.contains("svg-fallback")).toBe(true);
  });

  it("reuses the same listeners when invoked repeatedly", () => {
    const img = appendImage("logo.svg");

    applySvgFallback("fallback-one.png");
    const initialState = __getSvgFallbackStateForTests(img);

    applySvgFallback("fallback-two.png");
    const updatedState = __getSvgFallbackStateForTests(img);

    expect(initialState).toBeDefined();
    expect(updatedState).toBe(initialState);
    expect(updatedState?.fallbackSrc).toBe("fallback-two.png");
  });

  it("removes svg-fallback class when the image subsequently loads", () => {
    const img = appendImage("logo.svg");

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.classList.contains("svg-fallback")).toBe(true);

    img.src = "fixed-logo.svg";
    img.dispatchEvent(new Event("load"));

    expect(img.classList.contains("svg-fallback")).toBe(false);
  });
});
