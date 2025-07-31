import { describe, it, expect, beforeEach } from "vitest";
import { toggleTooltipOverlayDebug } from "../../src/helpers/tooltipOverlayDebug.js";

beforeEach(() => {
  document.body.className = "";
});

describe("toggleTooltipOverlayDebug", () => {
  it("adds and removes the class based on argument", () => {
    toggleTooltipOverlayDebug(true);
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
    toggleTooltipOverlayDebug(false);
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(false);
  });
});
