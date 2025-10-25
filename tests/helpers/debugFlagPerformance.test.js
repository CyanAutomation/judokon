import { describe, expect, it, afterEach } from "vitest";
import {
  measureDebugFlagToggle,
  getDebugFlagMetrics,
  resetDebugFlagMetrics
} from "../../src/helpers/debugFlagPerformance.js";

describe("debugFlagPerformance", () => {
  afterEach(() => {
    resetDebugFlagMetrics();
    delete window.__PROFILE_DEBUG_FLAGS__;
    delete window.__DEBUG_FLAG_METRICS__;
    delete window.__LOG_DEBUG_FLAG_PERF__;
  });

  it("executes action without recording when profiling disabled", () => {
    let touched = 0;
    measureDebugFlagToggle("layoutDebugPanel", () => {
      touched += 1;
    });
    expect(touched).toBe(1);
    expect(getDebugFlagMetrics()).toHaveLength(0);
    expect(window.__DEBUG_FLAG_METRICS__).toBeUndefined();
  });

  it("records duration when profiling enabled via window flag", () => {
    window.__PROFILE_DEBUG_FLAGS__ = true;
    let touched = 0;
    measureDebugFlagToggle("tooltipOverlayDebug", () => {
      touched += 1;
    });
    const metrics = getDebugFlagMetrics();
    expect(touched).toBe(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].flag).toBe("tooltipOverlayDebug");
    expect(typeof metrics[0].duration).toBe("number");
    expect(metrics[0].duration).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(window.__DEBUG_FLAG_METRICS__)).toBe(true);
    expect(window.__DEBUG_FLAG_METRICS__).toHaveLength(1);
  });
});
