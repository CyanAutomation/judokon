import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.useFakeTimers();

describe("Minimal timer test", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    
    // Set up minimal DOM
    document.body.innerHTML = `
      <div id="next-round-timer">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </div>
    `;
    
    // Set timer override
    if (typeof window !== "undefined") {
      window.__OVERRIDE_TIMERS = { roundTimer: 3 };
    }
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should show timer value after await startTimer", async () => {
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    
    console.log("Before startTimer, timer shows:", document.getElementById("next-round-timer").textContent);
    
    const timer = await startTimer(async () => {}, { selectionMade: false });
    
    console.log("After await startTimer, timer shows:", document.getElementById("next-round-timer").textContent);
    
    await vi.advanceTimersByTimeAsync(220);
    
    const timerText = document.getElementById("next-round-timer").textContent.replace(/\s+/g, " ").trim();
    console.log("After advancing 220ms, timer shows:", timerText);
    
    expect(timerText).toBe("Time Left: 3s");
    
    timer?.stop?.();
  });
});
