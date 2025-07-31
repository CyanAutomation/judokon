import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("toggleLayoutDebugPanel", () => {
  it("adds and removes the panel", () => {
    const create = vi.fn(() => {
      const el = document.createElement("div");
      el.id = "layout-debug-panel";
      return el;
    });
    vi.doMock("../../src/components/LayoutDebugPanel.js", () => ({
      createLayoutDebugPanel: create
    }));
    // reload module after mocking
    return import("../../src/helpers/layoutDebugPanel.js").then((mod) => {
      mod.toggleLayoutDebugPanel(true);
      expect(document.getElementById("layout-debug-panel")).toBeTruthy();
      mod.toggleLayoutDebugPanel(false);
      expect(document.getElementById("layout-debug-panel")).toBeNull();
    });
  });
});
