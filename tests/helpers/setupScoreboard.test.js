import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoreboardHeader } from "../utils/testUtils.js";
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
  function createControls() {
    return {
      startCoolDown: (onTick, onExpired, duration) => {
        onTick(duration);
        const id = setInterval(() => {
          duration -= 1;
          onTick(duration);
          if (duration <= 0) {
            clearInterval(id);
            onExpired();
          }
        }, 1000);
      },
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn()
    };
  }

  it("initializes and proxies methods", async () => {
    vi.useFakeTimers();
    const mod = await import("../../src/helpers/setupScoreboard.js");
    const { showSnackbar, updateSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar.mockClear();
    updateSnackbar.mockClear();
    mod.setupScoreboard(createControls());

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
    await vi.advanceTimersByTimeAsync(1000);
    expect(showSnackbar).toHaveBeenCalledTimes(1);
  });

  it("initializes when called after DOM load", async () => {
    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(createControls());
    expect(document.getElementById("score-display")).toBeTruthy();
  });

  it("attaches to pre-existing elements", async () => {
    document.body.innerHTML = "";
    document.body.appendChild(createScoreboardHeader());
    const mod = await import("../../src/helpers/setupScoreboard.js");
    const { showSnackbar, updateSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar.mockClear();
    updateSnackbar.mockClear();
    mod.setupScoreboard(createControls());
    mod.showMessage("Hello");
    expect(document.getElementById("round-message").textContent).toBe("Hello");
    mod.clearMessage();
    expect(document.getElementById("round-message").textContent).toBe("");
    mod.updateScore(3, 4);
    expect(document.getElementById("score-display").textContent).toBe("You: 3\nOpponent: 4");
    vi.useFakeTimers();
    mod.startCountdown(1);
    expect(showSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(updateSnackbar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(showSnackbar).toHaveBeenCalledTimes(1);
  });
});
