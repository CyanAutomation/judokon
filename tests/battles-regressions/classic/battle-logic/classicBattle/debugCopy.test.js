import { describe, it, expect, vi, beforeEach } from "vitest";
import { setDebugPanelEnabled } from "../../../src/helpers/classicBattle/debugPanel.js";

describe("debug copy button", () => {
  let writeText;

  beforeEach(() => {
    document.body.innerHTML = '<div id="wrapper"><div id="battle-area"></div></div>';
    writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
  });

  it("copies debug output text to clipboard", () => {
    setDebugPanelEnabled(true);
    const panel = document.getElementById("debug-panel");
    expect(panel.parentElement).toBe(document.getElementById("wrapper"));
    const pre = document.getElementById("debug-output");
    pre.textContent = "debug info";
    const btn = document.getElementById("debug-copy");
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(writeText).toHaveBeenCalledWith("debug info");
  });
});
