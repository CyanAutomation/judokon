import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

import { attachCooldownRenderer } from "../../src/helpers/CooldownRenderer.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";
import * as snackbar from "../../src/helpers/showSnackbar.js";

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
});
