import { describe, it, expect, vi, beforeEach } from "vitest";
import { setDebugPanelEnabled } from "../../../src/helpers/classicBattle/uiHelpers.js";

describe("debug copy button", () => {
  let writeText;

  beforeEach(() => {
    document.body.innerHTML = '<div id="battle-area"></div>';
    writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
  });

  it("copies debug output text to clipboard", () => {
    setDebugPanelEnabled(true);
    const pre = document.getElementById("debug-output");
    pre.textContent = "debug info";
    const btn = document.getElementById("debug-copy");
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(writeText).toHaveBeenCalledWith("debug info");
  });
});
