import { describe, it, expect, afterEach } from "vitest";
import { applySvgFallback } from "../../src/helpers/svgFallback.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("applySvgFallback", () => {
  it("replaces broken SVG source with fallback", () => {
    const img = document.createElement("img");
    img.src = "logo.svg";
    document.body.appendChild(img);

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.src).toContain("fallback.png");
    expect(img.classList.contains("svg-fallback")).toBe(true);
  });

  it("ignores non-SVG images", () => {
    const img = document.createElement("img");
    img.src = "logo.png";
    document.body.appendChild(img);

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.src).toContain("logo.png");
  });

  it("does not throw if there are no images in the DOM", () => {
    expect(() => applySvgFallback("fallback.png")).not.toThrow();
  });

  it("uses default fallback path when none provided", () => {
    const img = document.createElement("img");
    img.src = "logo.svg";
    document.body.appendChild(img);

    applySvgFallback();
    img.dispatchEvent(new Event("error"));

    // Should replace src with the default fallback image
    expect(img.src).toContain("judokonLogoSmall.png");
  });

  it("does not add svg-fallback class to non-SVG images", () => {
    const img = document.createElement("img");
    img.src = "logo.jpg";
    document.body.appendChild(img);

    applySvgFallback("fallback.png");
    img.dispatchEvent(new Event("error"));

    expect(img.classList.contains("svg-fallback")).toBe(false);
  });
});
