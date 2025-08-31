// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
});

describe("roundDecisionEnter", () => {
  it("schedules a decision guard when no selection exists", async () => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn(),
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const store = {};
    const machine = {
      context: { store },
      dispatch: vi.fn(),
      getState: vi.fn(() => "roundDecision")
    };

    const p = mod.roundDecisionEnter(machine);
    expect(typeof window.__roundDecisionGuard).toBe("function");
    await vi.runAllTimersAsync();
    await p;
    expect(window.__roundDecisionGuard).toBeNull();
    vi.useRealTimers();
  });

  it("interrupts when no player choice is made", async () => {
    vi.useFakeTimers();
    const emitBattleEvent = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent,
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const store = {};
    const machine = {
      context: { store },
      dispatch: vi.fn(),
      getState: vi.fn(() => "roundDecision")
    };

    const p = mod.roundDecisionEnter(machine);
    await vi.runAllTimersAsync();
    await p;

    expect(emitBattleEvent).toHaveBeenCalledWith(
      "scoreboardShowMessage",
      "No selection detected. Interrupting round."
    );
    expect(machine.dispatch).toHaveBeenCalledWith("interrupt", { reason: "noSelection" });
    vi.useRealTimers();
  });

  it("resolves immediately when selection is present", async () => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn(),
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));
    const resolveRound = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../../src/helpers/classicBattle/roundResolver.js", () => ({ resolveRound }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn(() => 5)
    }));
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { power: 3 } }))
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const store = { playerChoice: "power" };
    const machine = {
      context: { store },
      dispatch: vi.fn(),
      getState: vi.fn(() => "roundDecision")
    };

    await mod.roundDecisionEnter(machine);
    expect(resolveRound).toHaveBeenCalledOnce();
    expect(window.__roundDecisionGuard).toBeNull();
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it("handles errors during immediate resolution", async () => {
    vi.useFakeTimers();
    const emitBattleEvent = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent,
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));
    const resolveRound = vi.fn().mockRejectedValue(new Error("boom"));
    vi.doMock("../../src/helpers/classicBattle/roundResolver.js", () => ({ resolveRound }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn(() => 5)
    }));
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { power: 3 } }))
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const store = { playerChoice: "power" };
    const machine = {
      context: { store },
      dispatch: vi.fn(),
      getState: vi.fn(() => "roundDecision")
    };

    await mod.roundDecisionEnter(machine);
    expect(emitBattleEvent).toHaveBeenCalledWith(
      "scoreboardShowMessage",
      "Round error. Recovering…"
    );
    expect(machine.dispatch).toHaveBeenCalledWith("interrupt", {
      reason: "roundResolutionError",
      error: "boom"
    });
    expect(window.__roundDecisionGuard).toBeNull();
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });
});
