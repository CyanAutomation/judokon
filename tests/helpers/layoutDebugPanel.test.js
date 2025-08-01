import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("toggleLayoutDebugPanel", () => {
  it("adds outlines when enabled and cleans up when disabled", async () => {
    const { toggleLayoutDebugPanel } = await import("../../src/helpers/layoutDebugPanel.js");
    toggleLayoutDebugPanel(true, ["body"]);
    expect(document.body.classList.contains("layout-debug-outline")).toBe(true);
    toggleLayoutDebugPanel(false, ["body"]);
    expect(document.body.classList.contains("layout-debug-outline")).toBe(false);
  });
});
