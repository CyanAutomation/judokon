import { describe, it, expect, beforeEach } from "vitest";
import { createLayoutDebugPanel } from "../../src/components/LayoutDebugPanel.js";

describe("createLayoutDebugPanel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("toggles outlines and aria-expanded", () => {
    const panel = createLayoutDebugPanel(["body"]);
    document.body.appendChild(panel);
    const button = panel.querySelector("button");
    const pre = panel.querySelector("pre");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(pre.hidden).toBe(true);
    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(pre.hidden).toBe(false);
    expect(document.body.classList.contains("layout-debug-outline")).toBe(true);
    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.classList.contains("layout-debug-outline")).toBe(false);
  });
});
