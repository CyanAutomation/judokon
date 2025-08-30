// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
});

describe("roundDecisionEnter", () => {
  it("schedules a decision guard", async () => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn(),
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/roundResolver.js", () => ({
      resolveRound: vi.fn().mockResolvedValue(undefined)
    }));
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
    expect(window.__roundDecisionGuard).toBeTruthy();
    await vi.runAllTimersAsync();
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
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });
});
