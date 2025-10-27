import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initDebugFlagHud, teardownDebugFlagHud } from "../../src/helpers/debugFlagHud.js";
import {
  measureDebugFlagToggle,
  resetDebugFlagMetrics
} from "../../src/helpers/debugFlagPerformance.js";

describe("debugFlagHud", () => {
  let originalClipboard;

  beforeEach(() => {
    resetDebugFlagMetrics();
    document.body.innerHTML = "";
    window.__DEBUG_PERF__ = true;
    window.__DEBUG_FLAG_ALERT_THRESHOLD__ = 1000;
    if (Array.isArray(window.__DEBUG_FLAG_ALERT_HISTORY__)) {
      window.__DEBUG_FLAG_ALERT_HISTORY__.length = 0;
    }
    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true
    });
  });

  afterEach(() => {
    teardownDebugFlagHud();
    resetDebugFlagMetrics();
    delete window.__DEBUG_PERF__;
    delete window.__DEBUG_FLAG_ALERT_THRESHOLD__;
    if (originalClipboard === undefined) {
      delete navigator.clipboard;
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true
      });
    }
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

  it("raises alerts when metrics exceed threshold", async () => {
    window.__DEBUG_FLAG_ALERT_THRESHOLD__ = 0;
    const alerts = [];
    const listener = (event) => {
      alerts.push(event.detail);
    };
    window.addEventListener("debug-flag-hud:alert", listener);

    initDebugFlagHud();
    measureDebugFlagToggle("layoutDebugPanel", () => {});

    await Promise.resolve();

    const hud = document.getElementById("debug-flag-performance-hud");
    expect(hud?.dataset.alertActive).toBe("true");
    const highlightedItems = hud?.querySelectorAll(".debug-flag-hud__alert") ?? [];
    expect(highlightedItems.length).toBeGreaterThan(0);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.at(-1)?.flags).toContain("layoutDebugPanel");

    window.removeEventListener("debug-flag-hud:alert", listener);
  });

  it("exports alert history to clipboard when available", async () => {
    window.__DEBUG_FLAG_ALERT_THRESHOLD__ = 0;
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    initDebugFlagHud();
    measureDebugFlagToggle("layoutDebugPanel", () => {});

    await Promise.resolve();

    const hud = document.getElementById("debug-flag-performance-hud");
    const exportBtn = hud?.querySelector("[data-debug-flag-hud='export']");
    expect(exportBtn).toBeTruthy();

    exportBtn?.dispatchEvent(new Event("click"));

    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = writeText.mock.calls[0][0];
    expect(payload).toContain("layoutDebugPanel");
    expect(window.__DEBUG_FLAG_ALERT_HISTORY__?.length).toBeGreaterThan(0);
    await vi.waitFor(() => {
      expect(hud?.dataset.exportStatus).toBe("copied");
    });
  });
});
