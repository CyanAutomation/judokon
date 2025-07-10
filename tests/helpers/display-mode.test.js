import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyDisplayMode } from "../../src/helpers/displayMode.js";

describe("applyDisplayMode", () => {
  beforeEach(() => {
    document.body.removeAttribute("data-theme");
  });

  afterEach(() => {
    document.body.removeAttribute("data-theme");
  });

  it("sets data-theme to dark for dark mode", () => {
    applyDisplayMode("dark");
    expect(document.body.dataset.theme).toBe("dark");
  });

  it("sets data-theme to gray for gray mode", () => {
    applyDisplayMode("gray");
    expect(document.body.dataset.theme).toBe("gray");
  });

  it("sets data-theme to light for light mode", () => {
    document.body.dataset.theme = "dark";
    applyDisplayMode("light");
    expect(document.body.dataset.theme).toBe("light");
  });

  it("warns when an invalid mode is provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.dataset.theme = "dark";
    applyDisplayMode("neon");
    expect(warnSpy).toHaveBeenCalled();
    expect(document.body.dataset.theme).toBe("dark");
    warnSpy.mockRestore();
  });
});
