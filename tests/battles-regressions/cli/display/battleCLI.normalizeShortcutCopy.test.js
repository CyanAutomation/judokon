import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("battleCLI normalizeShortcutCopy", () => {
  let battleCLI;

  beforeEach(async () => {
    window.__TEST__ = true;
    ({ battleCLI } = await import("../../src/pages/index.js"));
    battleCLI.ensureCliDomForTest({ reset: true });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    vi.clearAllMocks();
    delete window.__TEST__;
  });

  it("normalizes hyphenated stat range tokens in help and hint copy", () => {
    const helpItem = document.querySelector("#cli-help li");
    const controlsHint = document.getElementById("cli-controls-hint");

    helpItem.textContent = "[1-5] Select Stat";
    controlsHint.textContent = "[1-5] Stats | [Enter] Next";

    battleCLI.normalizeShortcutCopy();

    expect(helpItem.textContent).toContain("[1–5] Select Stat");
    expect(controlsHint.textContent.startsWith("[1–5] Stats")).toBe(true);
  });

  it("leaves non-target bracketed ranges untouched", () => {
    const helpItem = document.querySelector("#cli-help li");
    const controlsHint = document.getElementById("cli-controls-hint");

    helpItem.textContent = "[10-15] Select Advanced Stat";
    controlsHint.textContent = "Bonus [11-15] Range";

    battleCLI.normalizeShortcutCopy();

    expect(helpItem.textContent).toBe("[10-15] Select Advanced Stat");
    expect(controlsHint.textContent).toBe("Bonus [11-15] Range");
  });

  it("does not throw when shortcut containers are missing", () => {
    document.getElementById("cli-help")?.remove();
    document.getElementById("cli-controls-hint")?.remove();

    expect(() => battleCLI.normalizeShortcutCopy()).not.toThrow();
  });
});
