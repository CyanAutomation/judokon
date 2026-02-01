import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let scoreboard = null;
let mockStartRound = null;

// Mock setupScoreboard BEFORE importing
const mocks = vi.hoisted(() => ({
  mockStartRound: vi.fn()
}));
mockStartRound = mocks.mockStartRound;

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  updateTimer(...args) {
    console.log("Mock updateTimer called with:", args);
    return scoreboard?.updateTimer?.(...args);
  }
}));

vi.mock("../../src/helpers/BattleEngine.js", () => ({
  startRound: mocks.mockStartRound,
  stopTimer: vi.fn()
}));

describe("Debug full startTimer flow", () => {
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
    
    mockStartRound.mockImplementation((onTick, onExpired, duration, onDrift) => {
      console.log("mockStartRound called with duration:", duration);
      onTick(duration);
      const id = setInterval(() => {
        duration -= 1;
        onTick(duration);
        if (duration <= 0) {
          clearInterval(id);
          onExpired();
        }
      }, 1000);
      return Promise.resolve();
    });
    
    const { Scoreboard } = await import("../../src/components/Scoreboard.js");
    const { ScoreboardModel } = await import("../../src/components/ScoreboardModel.js");
    const { ScoreboardView } = await import("../../src/components/ScoreboardView.js");
    const model = new ScoreboardModel();
    const view = new ScoreboardView(model, {
      timerEl: document.getElementById("next-round-timer")
    });
    scoreboard = new Scoreboard(model, view);
    console.log("Created scoreboard, updateTimer is:", typeof scoreboard.updateTimer);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should update timer after await startTimer", async () => {
    console.log("Before startTimer, timer shows:", document.getElementById("next-round-timer").textContent);
    
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    console.log("About to call startTimer");
    const timer = await startTimer(async () => {}, { selectionMade: false });
    console.log("startTimer returned, timer shows:", document.getElementById("next-round-timer").textContent);
    
    await vi.advanceTimersByTimeAsync(220);
    console.log("After advancing 220ms, timer shows:", document.getElementById("next-round-timer").textContent);
    
    const timerText = document.getElementById("next-round-timer").textContent.replace(/\s+/g, " ").trim();
    expect(timerText).toBe("Time Left: 3s");
    
    timer?.stop?.();
  });
});
