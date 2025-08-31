// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
});

describe("recordEntry", () => {
  it("stamps window and emits debug update", async () => {
    const emitBattleEvent = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent,
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn()
    }));
    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    delete window.__roundDecisionEnter;
    mod.recordEntry();
    expect(typeof window.__roundDecisionEnter).toBe("number");
    expect(emitBattleEvent).toHaveBeenCalledWith("debugPanelUpdate");
  });
});

describe("guardSelectionResolution", () => {
  it("cancels scheduled outcome when invoked", async () => {
    vi.useFakeTimers();
    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const outcomeSpy = vi.spyOn(mod, "computeAndDispatchOutcome").mockResolvedValue(undefined);
    const cancel = mod.guardSelectionResolution({}, {});
    expect(typeof window.__roundDecisionGuard).toBe("function");
    cancel();
    await vi.runAllTimersAsync();
    expect(outcomeSpy).not.toHaveBeenCalled();
    expect(window.__roundDecisionGuard).toBeNull();
    vi.useRealTimers();
  });
});

describe("awaitPlayerChoice", () => {
  it("resolves immediately when choice exists", async () => {
    const store = { playerChoice: "power" };
    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    await expect(mod.awaitPlayerChoice(store)).resolves.toBeUndefined();
  });
});

describe("schedulePostResolveWatchdog", () => {
  it("interrupts if state remains roundDecision", async () => {
    vi.useFakeTimers();
    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const machine = {
      getState: vi.fn(() => "roundDecision"),
      dispatch: vi.fn()
    };
    mod.schedulePostResolveWatchdog(machine);
    await vi.runAllTimersAsync();
    expect(machine.dispatch).toHaveBeenCalledWith("interrupt", {
      reason: "postResolveWatchdog"
    });
    vi.useRealTimers();
  });
});
