import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

describe("Debug timer resolution", () => {
  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    useCanonicalTimers();
    vi.clearAllMocks();
    
    document.body.innerHTML = `
      <div id="next-round-timer">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </div>
    `;
    
    // Set timer override
    if (typeof window !== "undefined") {
      window.__OVERRIDE_TIMERS = { roundTimer: 3 };
      console.log("Set window.__OVERRIDE_TIMERS to:", window.__OVERRIDE_TIMERS);
    }
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve timer duration correctly", async () => {
    const { resolveRoundTimerDuration } = await import("../../src/helpers/classicBattle/timerService.js");
    
    console.log("About to call resolveRoundTimerDuration");
    const result = await resolveRoundTimerDuration();
    console.log("resolveRoundTimerDuration returned:", result);
    
    expect(result.duration).toBe(3);
  });
});
