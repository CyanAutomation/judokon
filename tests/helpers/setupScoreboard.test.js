import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoreboardHeader } from "../utils/testUtils.js";
import { createMockScheduler } from "./mockScheduler.js";
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

beforeEach(() => {
  vi.resetModules();
  document.body.appendChild(createScoreboardHeader());
});

describe("setupScoreboard", () => {
  function createControls(scheduler) {
    return {
      startCoolDown: (onTick, onExpired, duration) => {
        onTick(duration);
        for (let i = 1; i <= duration; i++) {
          scheduler.setTimeout(() => {
            const remaining = duration - i;
            onTick(remaining);
            if (remaining <= 0) onExpired();
          }, i * 1000);
        }
      },
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn()
    };
  }

  it("initializes and proxies methods", async () => {
    const scheduler = createMockScheduler();
    const mod = await import("../../src/helpers/setupScoreboard.js");
    const { showSnackbar, updateSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar.mockClear();
    updateSnackbar.mockClear();
    mod.setupScoreboard(createControls(scheduler), scheduler);

    mod.showMessage("Hi");
    expect(document.getElementById("round-message").textContent).toBe("Hi");

    const reset = mod.showTemporaryMessage("Temp");
    expect(document.getElementById("round-message").textContent).toBe("Temp");
    reset();
    expect(document.getElementById("round-message").textContent).toBe("");

    mod.showMessage("Hi");
    mod.clearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");

    mod.updateScore(1, 2);
    expect(document.getElementById("score-display").textContent).toBe("You: 1\nOpponent: 2");

    mod.startCountdown(1);
    expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(updateSnackbar).not.toHaveBeenCalled();
    scheduler.tick(1000);
    expect(showSnackbar).toHaveBeenCalledTimes(1);
  });

  it("initializes when called after DOM load", async () => {
    const scheduler = createMockScheduler();
    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(createControls(scheduler), scheduler);
    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("attaches to pre-existing elements", async () => {
    document.body.innerHTML = "";
    document.body.appendChild(createScoreboardHeader());
    const scheduler = createMockScheduler();
    const mod = await import("../../src/helpers/setupScoreboard.js");
    const { showSnackbar, updateSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar.mockClear();
    updateSnackbar.mockClear();
    mod.setupScoreboard(createControls(scheduler), scheduler);
    mod.showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    mod.clearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");
    mod.updateScore(3, 4);
    expect(document.getElementById("score-display").textContent).toBe("You: 3\nOpponent: 4");
    mod.startCountdown(1);
    expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(updateSnackbar).not.toHaveBeenCalled();
    scheduler.tick(1000);
    expect(showSnackbar).toHaveBeenCalledTimes(1);
  });
});
