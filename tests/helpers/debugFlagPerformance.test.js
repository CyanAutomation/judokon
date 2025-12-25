import { describe, expect, it, afterEach, vi } from "vitest";
import {
  measureDebugFlagToggle,
  resetDebugFlagMetrics
} from "../../src/helpers/debugFlagPerformance.js";

describe("debugFlagPerformance", () => {
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

  it("does not throw when instrumentation toggles are enabled", () => {
    process.env.DEBUG_PERF = "true";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      expect(() => measureDebugFlagToggle("layoutDebugPanel", () => {})).not.toThrow();
      window.__PROFILE_DEBUG_FLAGS__ = true;
      expect(window.__PROFILE_DEBUG_FLAGS__).toBe(true);
      expect(() => measureDebugFlagToggle("tooltipOverlayDebug", () => {})).not.toThrow();
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("[debugFlagPerf]"),
        expect.any(Object)
      );
    } finally {
      infoSpy.mockRestore();
    }
  });
});
