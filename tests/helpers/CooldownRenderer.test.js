import { describe, it, expect, vi, beforeEach } from "vitest";

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

  it("defers countdown-start until timer ticks", () => {
    attachCooldownRenderer(timer, 5);

    expect(snackbar.showSnackbar).toHaveBeenCalledWith("Next round in: 5s");
    expect(emitBattleEvent).not.toHaveBeenCalled();

    timer.emit("tick", 5);

    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundCountdownStarted");
    expect(emitBattleEvent).toHaveBeenCalledWith("nextRoundCountdownTick", { remaining: 5 });
  });

  it("updates snackbar on tick and clears timer at zero", () => {
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
  });
});
