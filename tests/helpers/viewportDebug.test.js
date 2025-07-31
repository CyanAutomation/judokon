import { describe, it, expect, beforeEach } from "vitest";
import { toggleViewportSimulation } from "../../src/helpers/viewportDebug.js";

beforeEach(() => {
  document.body.className = "";
});

describe("toggleViewportSimulation", () => {
  it("adds and removes the class based on argument", () => {
    toggleViewportSimulation(true);
    expect(document.body.classList.contains("simulate-viewport")).toBe(true);
    toggleViewportSimulation(false);
    expect(document.body.classList.contains("simulate-viewport")).toBe(false);
  });
});
