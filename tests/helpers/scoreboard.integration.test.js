import { describe, it, expect, vi, beforeEach } from "vitest";
// Avoid matchMedia usage in jsdom via reduced motion stub
vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

let scheduler;

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: vi.fn().mockResolvedValue(3),
  _resetForTest: vi.fn()
}));

vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
  startRound: (onTick, onExpired, duration) => {
    onTick(duration);
    globalThis.__scheduler.setInterval(async () => {
      duration -= 1;
      onTick(duration);
      if (duration <= 0) {
        await onExpired();
      }
    }, 1000);
    return Promise.resolve();
  },
  startCoolDown: (onTick, onExpired, duration) => {
    onTick(duration);
    globalThis.__scheduler.setInterval(() => {
      duration -= 1;
      onTick(duration);
      if (duration <= 0) {
        onExpired();
      }
    }, 1000);
  },
  stopTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  STATS: ["power"]
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

// We intentionally avoid calling setupScoreboard's DOM initializer here.
// Timer controls are injected directly so functions work without explicit setup.

describe("Scoreboard integration without explicit init", () => {
  function createScheduler() {
    let now = 0;
    const timers = new Set();
    return {
      setTimeout(fn, delay) {
        const t = { due: now + delay, fn, repeat: false };
        timers.add(t);
        return t;
      },
      clearTimeout(id) {
        timers.delete(id);
      },
      setInterval(fn, interval) {
        const t = { due: now + interval, fn, repeat: true, interval };
        timers.add(t);
        return t;
      },
      clearInterval(id) {
        timers.delete(id);
      },
      tick(ms) {
        now += ms;
        let fired;
        do {
          fired = false;
          for (const t of Array.from(timers)) {
            if (t.due <= now) {
              t.fn();
              if (t.repeat) {
                t.due += t.interval;
              } else {
                timers.delete(t);
              }
              fired = true;
            }
          }
        } while (fired);
      }
    };
  }

  let scheduler;

  beforeEach(async () => {
    globalThis.__scheduler = createScheduler();
    scheduler = globalThis.__scheduler;
    vi.resetModules();
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
    // Silence snackbar noise already mocked above

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
    startTimer(async () => {});
    scheduler.tick(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 2s");
    scheduler.tick(1000);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 1s");
    scheduler.tick(1000);
  });

  it("renders cooldown countdown via snackbar without touching timer element", async () => {
    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    const snackbar = await import("../../src/helpers/showSnackbar.js");

    // Ensure the timer area is empty to begin with
    const timerEl = document.getElementById("next-round-timer");
    expect(timerEl.textContent).toBe("");

    const onFinish = vi.fn();
    scoreboard.startCountdown(3, onFinish, scheduler);

    scheduler.tick(0);
    expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 3s");
    expect(timerEl.textContent).toBe("");

    scheduler.tick(1000);
    expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 2s");
    expect(timerEl.textContent).toBe("");

    scheduler.tick(1000);
    expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 1s");
    expect(timerEl.textContent).toBe("");

    scheduler.tick(1000);
    expect(onFinish).toHaveBeenCalled();
    expect(timerEl.textContent).toBe("");
  });
});
