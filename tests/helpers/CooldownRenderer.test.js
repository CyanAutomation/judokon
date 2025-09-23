import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

const promptTrackerMocks = vi.hoisted(() => ({
  getOpponentPromptTimestamp: vi.fn(() => 0),
  getOpponentPromptMinDuration: vi.fn(() => 0)
}));

vi.mock("../../src/helpers/classicBattle/opponentPromptTracker.js", () => promptTrackerMocks);

const {
  getOpponentPromptTimestamp: mockGetOpponentPromptTimestamp,
  getOpponentPromptMinDuration: mockGetOpponentPromptMinDuration
} = promptTrackerMocks;

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn(),
  updateTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

import { attachCooldownRenderer } from "../../src/helpers/CooldownRenderer.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";
import * as snackbar from "../../src/helpers/showSnackbar.js";
import * as scoreboard from "../../src/helpers/setupScoreboard.js";

describe("attachCooldownRenderer", () => {
  let timer;

  beforeEach(() => {
    vi.useRealTimers();
    mockGetOpponentPromptTimestamp.mockReturnValue(0);
    mockGetOpponentPromptMinDuration.mockReturnValue(0);
    timer = {
      handlers: { tick: [], expired: [] },
      on(event, fn) {
        this.handlers[event].push(fn);
      },
      off(event, fn) {
        this.handlers[event] = this.handlers[event].filter((h) => h !== fn);
      },
      emit(event, value) {
        for (const fn of this.handlers[event]) fn(value);
      }
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers countdown-start until timer ticks", async () => {
    const timers = useCanonicalTimers();
    try {
      attachCooldownRenderer(timer, 5);

      expect(emitBattleEvent).not.toHaveBeenCalled();

      await timers.runAllTimersAsync();

      expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 5s");
      expect(scoreboard.updateTimer).toHaveBeenCalledWith(5);
      expect(emitBattleEvent).not.toHaveBeenCalled();

      mockGetOpponentPromptTimestamp.mockReturnValue(100);

      timer.emit("tick", 5);

      await timers.runAllTimersAsync();

      expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundCountdownStarted");
      expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundCountdownTick", { remaining: 5 });
    } finally {
      timers.cleanup();
    }
  });

  it("updates snackbar on tick and clears timer at zero", async () => {
    const timers = useCanonicalTimers();
    try {
      mockGetOpponentPromptTimestamp.mockReturnValue(100);

      attachCooldownRenderer(timer);

      timer.emit("tick", 3);
      expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 3s");
      expect(scoreboard.updateTimer).toHaveBeenCalledWith(3);

      timer.emit("tick", 2);
      expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 2s");
      expect(scoreboard.updateTimer).toHaveBeenCalledWith(2);

      timer.emit("tick", 0);
      expect(snackbar.updateSnackbar).toHaveBeenCalledWith("Next round in: 0s");
      expect(scoreboard.updateTimer).toHaveBeenCalledWith(0);
    } finally {
      timers.cleanup();
    }
  });

  it("performs zero-delay updates asynchronously when forcing async prompt handling", async () => {
    const timers = useCanonicalTimers();
    try {
      attachCooldownRenderer(timer, 4);

      expect(snackbar.showSnackbar).not.toHaveBeenCalled();
      expect(scoreboard.updateTimer).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(1);

      await timers.runAllTimersAsync();

      expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 4s");
      expect(scoreboard.updateTimer).toHaveBeenCalledWith(4);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      timers.cleanup();
    }
  });
});
