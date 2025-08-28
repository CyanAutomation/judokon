import { describe, it, expect, beforeEach } from "vitest";
import { toggleViewportSimulation } from "../../src/helpers/viewportDebug.js";
import { toggleTooltipOverlayDebug } from "../../src/helpers/tooltipOverlayDebug.js";

beforeEach(() => {
  document.body.className = "";
});

describe.each([
  ["toggleViewportSimulation", toggleViewportSimulation, "simulate-viewport"],
  ["toggleTooltipOverlayDebug", toggleTooltipOverlayDebug, "tooltip-overlay-debug"]
])("%s", (_name, fn, className) => {
  it("adds and removes the class based on argument", () => {
    fn(true);
    expect(document.body.classList.contains(className)).toBe(true);
    fn(false);
    expect(document.body.classList.contains(className)).toBe(false);
  });
});

describe("toggleTooltipOverlayDebug", () => {
  it("does nothing when document is undefined", () => {
    const originalDocument = global.document;
    // @ts-ignore - simulate an environment without document
    delete global.document;
    expect(() => toggleTooltipOverlayDebug(true)).not.toThrow();
    global.document = originalDocument;
  });
});
