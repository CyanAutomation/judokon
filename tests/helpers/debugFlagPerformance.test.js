import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getDebugFlagMetrics,
  measureDebugFlagToggle,
  resetDebugFlagMetrics
} from "../../src/helpers/debugFlagPerformance.js";

describe("debugFlagPerformance", () => {
  // Supports prdTestMode "debug flag profiling system surfaces performance metrics" workflow.
  afterEach(() => {
    resetDebugFlagMetrics();
    delete window.__PROFILE_DEBUG_FLAGS__;
    delete window.__DEBUG_FLAG_METRICS__;
    delete window.__LOG_DEBUG_FLAG_PERF__;
    delete window.__DEBUG_PERF__;
    delete process.env.DEBUG_FLAG_PERF;
    delete process.env.DEBUG_PERF;
    delete process.env.DEBUG_PERF_LOGS;
  });

  it("records metrics when instrumentation toggles are enabled", () => {
    process.env.DEBUG_PERF = "true";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      expect(() => measureDebugFlagToggle("layoutDebugPanel", () => {})).not.toThrow();
      window.__PROFILE_DEBUG_FLAGS__ = true;
      expect(window.__PROFILE_DEBUG_FLAGS__).toBe(true);
      expect(() => measureDebugFlagToggle("tooltipOverlayDebug", () => {})).not.toThrow();
      expect(infoSpy).toHaveBeenCalledWith(
        "[debugFlagPerf]",
        expect.any(String),
        "duration:",
        expect.stringMatching(/ms$/),
        expect.anything()
      );
      const metrics = getDebugFlagMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toEqual(
        expect.objectContaining({
          flag: "layoutDebugPanel",
          duration: expect.any(Number),
          metadata: null,
          timestamp: expect.any(Number)
        })
      );
      expect(metrics[0].duration).toBeGreaterThanOrEqual(0);
      expect(metrics[1]).toEqual(
        expect.objectContaining({
          flag: "tooltipOverlayDebug",
          duration: expect.any(Number),
          metadata: null,
          timestamp: expect.any(Number)
        })
      );
      expect(metrics[1].duration).toBeGreaterThanOrEqual(0);
      expect(window.__DEBUG_FLAG_METRICS__).toHaveLength(2);
    } finally {
      infoSpy.mockRestore();
    }
  });

  it("does not record metrics when instrumentation is disabled", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const action = vi.fn();

    measureDebugFlagToggle("layoutDebugPanel", action);

    expect(action).toHaveBeenCalledTimes(1);
    expect(getDebugFlagMetrics()).toHaveLength(0);
    expect(window.__DEBUG_FLAG_METRICS__).toBeUndefined();
    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
