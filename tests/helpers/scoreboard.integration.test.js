import { describe, it, expect, vi, beforeEach } from "vitest";
// Avoid matchMedia usage in jsdom via reduced motion stub
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

// We intentionally avoid calling setupScoreboard's DOM initializer here.
// Timer controls are injected directly so functions work without explicit setup.

let roundDrift;

describe("Scoreboard integration without explicit init", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    roundDrift = undefined;
    document.body.innerHTML = "";

    // Header structure as in battleJudoka.html
    const header = document.createElement("header");
    header.className = "header battle-header";
    const left = document.createElement("div");
    left.className = "scoreboard-left";
    left.id = "scoreboard-left";
    left.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
    `;
    const right = document.createElement("div");
    right.className = "scoreboard-right";
    right.id = "scoreboard-right";
    right.innerHTML = `
      <p id="score-display" aria-live="polite" aria-atomic="true">
        <span>You: 0</span>
        <span>Opponent: 0</span>
      </p>`;
    header.append(left, document.createElement("div"), right);
    document.body.appendChild(header);

    // Mock timer defaults to a small value
    vi.mock("../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: vi.fn().mockResolvedValue(3),
      _resetForTest: vi.fn()
    }));

    // Provide engine timers used by startTimer
    vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
      // Round selection timer: tick down each second and expire
      startRound: (onTick, onExpired, duration, onDrift) => {
        roundDrift = onDrift;
        onTick(duration);
        const id = setInterval(async () => {
          duration -= 1;
          onTick(duration);
          if (duration <= 0) {
            clearInterval(id);
            await onExpired();
          }
        }, 1000);
        return Promise.resolve();
      },
      // Cooldown timer (not exercised here)
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
      stopTimer: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      STATS: ["power"]
      // the rest are not needed in this test
    }));

    // Silence snackbar noise
    vi.mock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));

    const engine = await import("../../src/helpers/battleEngineFacade.js");
    const { initScoreboard } = await import("../../src/components/Scoreboard.js");
    initScoreboard(undefined, {
      startCoolDown: engine.startCoolDown,
      pauseTimer: engine.pauseTimer,
      resumeTimer: engine.resumeTimer
    });
  });

  it("renders messages, score, round counter, and round timer without init", async () => {
    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    // Messages
    scoreboard.showMessage("Ready to fight!");
    expect(document.getElementById("round-message").textContent).toBe("Ready to fight!");

    // Round counter
    scoreboard.updateRoundCounter(1);
    expect(document.getElementById("round-counter").textContent).toBe("Round 1");

    // Score
    scoreboard.updateScore(2, 1);
    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 2");
    expect(scoreText).toContain("Opponent: 1");

    // Round timer (selection phase) writes directly to #next-round-timer
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    const promise = startTimer(async () => {});
    // Initial tick shows 3
    await vi.advanceTimersByTimeAsync(0);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 3s");
    // After 1s shows 2
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 2s");
    // After another 1s shows 1
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");

    // Cleanup any pending timers
    await vi.runOnlyPendingTimersAsync();
    await promise;
  });

  it("shows fallback message on round timer drift", async () => {
    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    const showMessageSpy = vi.spyOn(scoreboard, "showMessage");
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {});
    roundDrift(2);
    expect(showMessageSpy).toHaveBeenCalledWith("Waiting…");
  });
});
