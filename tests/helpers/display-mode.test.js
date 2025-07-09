import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyDisplayMode } from "../../src/helpers/displayMode.js";

describe("applyDisplayMode", () => {
  beforeEach(() => {
    document.body.className = "";
  });

  afterEach(() => {
    document.body.className = "";
  });

  it("adds dark-mode class for dark mode", () => {
    applyDisplayMode("dark");
    expect(document.body.classList.contains("dark-mode")).toBe(true);
    expect(document.body.classList.contains("gray-mode")).toBe(false);
  });

  it("adds gray-mode class for gray mode", () => {
    applyDisplayMode("gray");
    expect(document.body.classList.contains("gray-mode")).toBe(true);
    expect(document.body.classList.contains("dark-mode")).toBe(false);
  });

  it("removes classes for light mode", () => {
    document.body.classList.add("dark-mode", "gray-mode");
    applyDisplayMode("light");
    expect(document.body.classList.contains("dark-mode")).toBe(false);
    expect(document.body.classList.contains("gray-mode")).toBe(false);
  });
});
