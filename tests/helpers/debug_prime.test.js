import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

describe("Debug primeTimerDisplay", () => {
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
    
    if (typeof window !== "undefined") {
      window.__OVERRIDE_TIMERS = { roundTimer: 3 };
    }
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should prime timer display", async () => {
    const { Scoreboard } = await import("../../src/components/Scoreboard.js");
    const { ScoreboardModel } = await import("../../src/components/ScoreboardModel.js");
    const { ScoreboardView } = await import("../../src/components/ScoreboardView.js");
    const model = new ScoreboardModel();
    const view = new ScoreboardView(model, {
      timerEl: document.getElementById("next-round-timer")
    });
    const scoreboard = new Scoreboard(model, view);
    
    console.log("Before primeTimerDisplay:", document.getElementById("next-round-timer").textContent);
    
    const { primeTimerDisplay } = await import("../../src/helpers/classicBattle/timerService.js");
    primeTimerDisplay({ duration: 3, scoreboardApi: scoreboard });
    
    console.log("After primeTimerDisplay:", document.getElementById("next-round-timer").textContent);
    
    const timerText = document.getElementById("next-round-timer").textContent.replace(/\s+/g, " ").trim();
    expect(timerText).toBe("Time Left: 3s");
  });
});
