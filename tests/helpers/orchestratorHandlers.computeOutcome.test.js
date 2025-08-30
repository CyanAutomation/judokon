// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("computeAndDispatchOutcome", () => {
  it("dispatches outcome and continue events", async () => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn(),
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { strength: 3 } }))
    }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn((el) => (el?.id === "player-card" ? 5 : 3))
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");

    document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
    document.body.dataset.battleState = "roundDecision";
    window.__roundDebug = {};

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);
    await vi.runAllTimersAsync();

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=winPlayer");
    expect(machine.dispatch).toHaveBeenCalledWith("continue");
    vi.useRealTimers();
  });

  it("dispatches interrupt when no outcome is produced", async () => {
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn(),
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { strength: 5 } }))
    }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn(() => NaN)
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");

    document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
    document.body.dataset.battleState = "roundDecision";
    window.__roundDebug = {};

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);

    expect(machine.dispatch).toHaveBeenCalledWith("interrupt", { reason: "guardNoOutcome" });
  });
});
