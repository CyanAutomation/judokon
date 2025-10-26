import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("toggleLayoutDebugPanel", () => {
  it("adds outlines when enabled and cleans up when disabled", async () => {
    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );
    document.body.innerHTML = '<div id="custom"></div>';
    const el = document.getElementById("custom");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });
    await toggleLayoutDebugPanel(true, ["#custom"]);
    await flushLayoutDebugPanelWork();
    expect(el.classList.contains("layout-debug-outline")).toBe(true);
    await toggleLayoutDebugPanel(false, ["#custom"]);
    expect(el.classList.contains("layout-debug-outline")).toBe(false);
  });

  it("adds outlines to visible elements with default selector", async () => {
    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );
    document.body.innerHTML = '<div id="sample"></div>';
    const el = document.getElementById("sample");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });
    await toggleLayoutDebugPanel(true);
    await flushLayoutDebugPanelWork();
    expect(el.classList.contains("layout-debug-outline")).toBe(true);
  });
});
