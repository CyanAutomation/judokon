import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initDebugFlagHud, teardownDebugFlagHud } from "../../src/helpers/debugFlagHud.js";
import {
  measureDebugFlagToggle,
  resetDebugFlagMetrics
} from "../../src/helpers/debugFlagPerformance.js";

describe("debugFlagHud", () => {
  beforeEach(() => {
    resetDebugFlagMetrics();
    document.body.innerHTML = "";
    window.__DEBUG_PERF__ = true;
  });

  afterEach(() => {
    teardownDebugFlagHud();
    resetDebugFlagMetrics();
    delete window.__DEBUG_PERF__;
  });

  it("does not render entries until metrics exist", () => {
    initDebugFlagHud();
    const hud = document.getElementById("debug-flag-performance-hud");
    expect(hud).toBeTruthy();
    const emptyState = hud?.querySelector("[data-debug-flag-hud='empty']");
    const list = hud?.querySelector("[data-debug-flag-hud='list']");
    expect(emptyState?.hidden).toBe(false);
    expect(list?.children.length).toBe(0);
  });

  it("renders aggregated metrics when toggles are measured", () => {
    initDebugFlagHud();
    measureDebugFlagToggle("layoutDebugPanel", () => {});
    measureDebugFlagToggle("layoutDebugPanel", () => {});
    measureDebugFlagToggle("tooltipOverlayDebug", () => {});
    const list = document
      .getElementById("debug-flag-performance-hud")
      ?.querySelector("[data-debug-flag-hud='list']");
    expect(list?.children.length).toBeGreaterThan(0);
    const listText = list?.textContent || "";
    expect(listText).toContain("layoutDebugPanel");
    expect(listText).toContain("tooltipOverlayDebug");
  });

  it("clears rendered metrics when the clear button is pressed", () => {
    initDebugFlagHud();
    measureDebugFlagToggle("layoutDebugPanel", () => {});
    const hud = document.getElementById("debug-flag-performance-hud");
    hud?.querySelector("[data-debug-flag-hud='clear']")?.dispatchEvent(new Event("click"));
    const list = hud?.querySelector("[data-debug-flag-hud='list']");
    expect(list?.children.length).toBe(0);
    const emptyState = hud?.querySelector("[data-debug-flag-hud='empty']");
    expect(emptyState?.hidden).toBe(false);
  });
});
