import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyDisplayMode } from "../../src/helpers/displayMode.js";

describe("applyDisplayMode", () => {
  let style;

  beforeEach(() => {
    document.body.removeAttribute("data-theme");
    document.body.className = "";
    style = document.createElement("style");
    style.textContent = `
      body.light-mode { background-color: rgb(255, 255, 255); }
      body.dark-mode { background-color: rgb(0, 0, 0); }
      body.retro-mode { background-color: rgb(0, 0, 0); }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    style.remove();
  });

  it.each(["dark", "light", "retro"])("sets data-theme and class for %s mode", (mode) => {
    applyDisplayMode(mode);
    expect(document.body.dataset.theme).toBe(mode);
    expect(document.body.classList.contains(`${mode}-mode`)).toBe(true);
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

  it("switching modes updates computed styles", () => {
    applyDisplayMode("light");
    const lightBg = getComputedStyle(document.body).backgroundColor;
    applyDisplayMode("dark");
    const darkBg = getComputedStyle(document.body).backgroundColor;
    expect(lightBg).not.toBe(darkBg);
    expect(darkBg).toBe("rgb(0, 0, 0)");
  });
});
