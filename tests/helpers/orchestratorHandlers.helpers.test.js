// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
let debugHooks;

let store;
beforeEach(async () => {
  vi.resetModules();
  debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
  document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
  store = {};
  vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
    store[k] = v;
  });
  vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
});

afterEach(() => {
  vi.restoreAllMocks();
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
    store.roundDecisionEnter = undefined;
    mod.recordEntry();
    expect(typeof debugHooks.readDebugState("roundDecisionEnter")).toBe("number");
    expect(emitBattleEvent).toHaveBeenCalledWith("debugPanelUpdate");
  });
});

describe("guardSelectionResolution", () => {
  it("cancels scheduled outcome when invoked", async () => {
    vi.useFakeTimers();
    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const outcomeSpy = vi.spyOn(mod, "computeAndDispatchOutcome").mockResolvedValue(undefined);
    const cancel = mod.guardSelectionResolution({}, {});
    expect(typeof debugHooks.readDebugState("roundDecisionGuard")).toBe("function");
    cancel();
    await vi.runAllTimersAsync();
    expect(outcomeSpy).not.toHaveBeenCalled();
    expect(debugHooks.readDebugState("roundDecisionGuard")).toBeNull();
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
