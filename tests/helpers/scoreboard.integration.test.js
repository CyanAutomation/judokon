import { describe, it, expect, vi, beforeEach } from "vitest";
// Avoid matchMedia usage in jsdom via reduced motion stub
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let roundDrift;
let scoreboard;

vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
  setupScoreboard: vi.fn(),
  showMessage: (...args) => scoreboard.showMessage(...args),
  updateScore: (...args) => scoreboard.updateScore(...args),
  clearMessage: (...args) => scoreboard.clearMessage(...args),
  showTemporaryMessage: (...args) => scoreboard.showTemporaryMessage(...args),
  clearTimer: (...args) => scoreboard.clearTimer(...args),
  updateTimer: (...args) => scoreboard.updateTimer(...args),
  showAutoSelect: (...args) => scoreboard.showAutoSelect(...args),
  updateRoundCounter: (...args) => scoreboard.updateRoundCounter(...args),
  clearRoundCounter: (...args) => scoreboard.clearRoundCounter(...args)
}));

describe("Scoreboard integration without setupScoreboard", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    roundDrift = undefined;
    scoreboard = undefined;
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

    const { Scoreboard } = await import("../../src/components/Scoreboard.js");
    scoreboard = new Scoreboard({
      messageEl: document.getElementById("round-message"),
      timerEl: document.getElementById("next-round-timer"),
      roundCounterEl: document.getElementById("round-counter"),
      scoreEl: document.getElementById("score-display")
    });

    const { initClassicBattleTest } = await import("./initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });
  });

  it("renders messages, score, round counter, and round timer without setup", async () => {
    // Messages
    scoreboard.showMessage("Ready to fight!");
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("Ready to fight!");

    // Round counter
    scoreboard.updateRoundCounter(1);
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-counter").textContent).toBe("Round 1");

    // Score
    scoreboard.updateScore(2, 1);
    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 2");
    expect(scoreText).toContain("Opponent: 1");

    // Round timer (selection phase) updates #next-round-timer via scoreboard.updateTimer
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    const promise = startTimer(async () => {}, { selectionMade: false });
    // Initial tick shows 3 (debounced)
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 3s");
    // After 1s shows 2
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 2s");
    // After another 1s shows 1
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");

    // Cleanup any pending timers
    await vi.runOnlyPendingTimersAsync();
    await promise;
  });

  it("shows fallback message on round timer drift", async () => {
    const api = await import("../../src/helpers/setupScoreboard.js");
    const showMessageSpy = vi.spyOn(api, "showMessage");
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {}, { selectionMade: false });
    roundDrift(2);
    expect(showMessageSpy).toHaveBeenCalledWith("Waiting…");
  });
});
