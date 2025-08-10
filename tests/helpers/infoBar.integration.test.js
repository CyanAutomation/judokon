import { describe, it, expect, vi, beforeEach } from "vitest";

// We intentionally DO NOT call setupBattleInfoBar's onDomReady init here.
// The goal is to verify InfoBar functions work without explicit initialization.

describe("InfoBar integration without explicit init", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = "";

    // Header structure as in battleJudoka.html
    const header = document.createElement("header");
    header.className = "header battle-header";
    const left = document.createElement("div");
    left.className = "info-left";
    left.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
    `;
    const right = document.createElement("div");
    right.className = "info-right";
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

    // Provide engine timers and drift watcher used by runTimerWithDrift/startTimer
    vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
      // Round selection timer: tick down each second and expire
      startRound: (onTick, onExpired, duration) => {
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
      watchForDrift: () => () => {},
      stopTimer: vi.fn(),
      STATS: ["power"]
      // the rest are not needed in this test
    }));

    // Silence snackbar noise
    vi.mock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
  });

  it("renders messages, score, round counter, and round timer without init", async () => {
    const info = await import("../../src/helpers/setupBattleInfoBar.js");
    // Messages
    info.showMessage("Ready to fight!");
    expect(document.getElementById("round-message").textContent).toBe("Ready to fight!");

    // Round counter
    info.updateRoundCounter(1, 25);
    expect(document.getElementById("round-counter").textContent).toBe("Round 1 of 25");

    // Score
    info.updateScore(2, 1);
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

  it("renders cooldown countdown via snackbar without touching timer element", async () => {
    const info = await import("../../src/helpers/setupBattleInfoBar.js");
    const snackbar = await import("../../src/helpers/showSnackbar.js");

    // Ensure the timer area is empty to begin with
    const timerEl = document.getElementById("next-round-timer");
    expect(timerEl.textContent).toBe("");

    const onFinish = vi.fn();
    info.startCountdown(3, onFinish);

    // First tick triggers showSnackbar with 3s
    await vi.advanceTimersByTimeAsync(0);
    expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 3s");
    expect(timerEl.textContent).toBe("");

    // Next ticks trigger updateSnackbar only
    await vi.advanceTimersByTimeAsync(1000);
    expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 2s");
    expect(timerEl.textContent).toBe("");

    await vi.advanceTimersByTimeAsync(1000);
    expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(timerEl.textContent).toBe("");

    // Expiration calls onFinish and keeps timer element clear
    await vi.runOnlyPendingTimersAsync();
    expect(onFinish).toHaveBeenCalled();
    expect(timerEl.textContent).toBe("");
  });
});
