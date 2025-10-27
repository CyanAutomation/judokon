import { describe, it, expect, beforeEach } from "vitest";
import { applyRetroTheme } from "../../src/pages/battleCLI.init.js";

describe("applyRetroTheme", () => {
  beforeEach(() => {
    document.body.className = "";
    localStorage.clear();
  });

  it("toggles cli-retro class on body and persists state", () => {
    applyRetroTheme(true);
    expect(document.body.classList.contains("cli-retro")).toBe(true);
    expect(localStorage.getItem("battleCLI.retro")).toBe("1");
    applyRetroTheme(false);
    expect(document.body.classList.contains("cli-retro")).toBe(false);
    expect(localStorage.getItem("battleCLI.retro")).toBe("0");
  });
});
