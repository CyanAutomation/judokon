import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

import {
  createScoreboard,
  initScoreboard,
  render,
  getState,
  destroy
} from "../../src/components/Scoreboard.js";

describe("Scoreboard headless API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    createScoreboard(header);
    document.body.appendChild(header);
    initScoreboard(header);
  });

  it("render applies patch and getState reflects it", async () => {
    render({ message: { text: "Ready", outcome: false } });
    render({ timerSeconds: 7 });
    render({ roundNumber: 2 });
    render({ score: { player: 1, opponent: 0 } });
    await vi.advanceTimersByTimeAsync(220);
    const state = getState();
    expect(state.message.text).toBe("Ready");
    expect(state.timer.secondsRemaining).toBe(7);
    expect(state.round.current).toBe(2);
    expect(state.score.player).toBe(1);
    expect(document.getElementById("round-message").textContent).toBe("Ready");
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 7s");
    expect(document.getElementById("round-counter").textContent).toBe("Round 2");
  });

  it("destroy detaches listeners and does not throw on subsequent calls", async () => {
    expect(() => destroy()).not.toThrow();
    // Re-render after destroy should no-op safely
    expect(() => render({ message: "After" })).not.toThrow();
    await vi.advanceTimersByTimeAsync(220);
  });
});

