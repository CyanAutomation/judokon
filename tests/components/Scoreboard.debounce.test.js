import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

import {
  createScoreboard,
  initScoreboard,
  showMessage,
  updateTimer
} from "../../src/components/Scoreboard.js";

describe("Scoreboard announcement debouncing (~200ms)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    const header = document.createElement("header");
    createScoreboard(header);
    document.body.appendChild(header);
    initScoreboard(header);
  });

  it("coalesces rapid message updates", async () => {
    showMessage("A");
    showMessage("B");
    showMessage("C");
    // Before debounce window, text may not have flushed
    expect(document.getElementById("round-message").textContent).toMatch(/^(|C)$/);
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("C");
  });

  it("coalesces rapid timer updates", async () => {
    updateTimer(5);
    updateTimer(4);
    updateTimer(3);
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 3s");
  });
});
