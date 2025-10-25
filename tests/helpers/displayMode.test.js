import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyDisplayMode, normalizeDisplayMode } from "../../src/helpers/displayMode.js";

describe("applyDisplayMode", () => {
  let style;

  beforeEach(() => {
    document.body.removeAttribute("data-theme");
    document.body.className = "";
    style = document.createElement("style");
    style.textContent = `
      body.light-mode { background-color: rgb(255, 255, 255); }
      body.dark-mode { background-color: rgb(0, 0, 0); }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    style.remove();
  });

  it.each([
    ["dark", "dark"],
    ["light", "light"],
    ["retro", "dark"],
    ["high-contrast", "dark"]
  ])("applies normalized mode for %s", (input, normalized) => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    applyDisplayMode(input);
    expect(document.body.dataset.theme).toBe(normalized);
    expect(document.body.classList.contains(`${normalized}-mode`)).toBe(true);
    infoSpy.mockRestore();
  });

  it("warns when an invalid mode is provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.dataset.theme = "dark";
    document.body.classList.add("dark-mode");
    applyDisplayMode("neon");
    expect(warnSpy).toHaveBeenCalled();
    expect(document.body.dataset.theme).toBe("dark");
    expect(document.body.classList.contains("dark-mode")).toBe(true);
    warnSpy.mockRestore();
  });

  it("removes legacy retro classes when normalizing", () => {
    document.body.classList.add("retro-mode");
    applyDisplayMode("retro");
    expect(document.body.classList.contains("retro-mode")).toBe(false);
    expect(document.body.classList.contains("dark-mode")).toBe(true);
  });

  it("switching modes updates computed styles", () => {
    applyDisplayMode("light");
    const lightBg = getComputedStyle(document.body).backgroundColor;
    applyDisplayMode("dark");
    const darkBg = getComputedStyle(document.body).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(darkBg).toBe("rgb(0, 0, 0)");
  });
});

describe("normalizeDisplayMode", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["Retro", "dark"],
    ["HIGH-CONTRAST", "dark"],
    [123, null],
    ["neon", null]
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeDisplayMode(input)).toBe(expected);
  });
});
