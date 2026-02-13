// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { createSimpleHarness } from "./integrationHarness.js";

let debugHooks;
let store;
let harness;

// ===== Top-level vi.hoisted() for shared mock state =====
const { mockEmitBattleEvent } = vi.hoisted(() => ({
  mockEmitBattleEvent: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: mockEmitBattleEvent,
  onBattleEvent: vi.fn(),
  offBattleEvent: vi.fn()
}));

beforeEach(async () => {
  mockEmitBattleEvent.mockReset();

  harness = createSimpleHarness();
  await harness.setup();

  debugHooks = await harness.importModule("../../src/helpers/classicBattle/debugHooks.js");
  document.body.innerHTML = '<div id="player-card"></div><div id="opponent-card"></div>';
  store = {};
  vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
    store[k] = v;
  });
  vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
});

afterEach(() => {
  if (harness) {
    harness.cleanup();
  }
  vi.restoreAllMocks();
});

describe("recordEntry", () => {
  it("stamps window and emits debug update", async () => {
    const mod = await harness.importModule(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    store.roundResolveEnter = undefined;
    mod.recordEntry();
    expect(typeof debugHooks.readDebugState("roundResolveEnter")).toBe("number");
    expect(mockEmitBattleEvent).toHaveBeenCalledWith("debugPanelUpdate");
  });
});

describe("guardSelectionResolution", () => {
  it("cancels scheduled outcome when invoked", async () => {
    const timers = useCanonicalTimers();
    const mod = await harness.importModule(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const outcomeSpy = vi.spyOn(mod, "computeAndDispatchOutcome").mockResolvedValue(undefined);
    const cancel = mod.guardSelectionResolution({}, {});
    expect(typeof debugHooks.readDebugState("roundResolveGuard")).toBe("function");
    cancel();
    await vi.runAllTimersAsync();
    expect(outcomeSpy).not.toHaveBeenCalled();
    expect(debugHooks.readDebugState("roundResolveGuard")).toBeNull();
    timers.cleanup();
  });
});

describe("awaitPlayerChoice", () => {
  it("resolves immediately when choice exists", async () => {
    const storeData = { playerChoice: "power" };
    const mod = await harness.importModule(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    await expect(mod.awaitPlayerChoice(storeData)).resolves.toBeUndefined();
  });
});

describe("schedulePostResolveWatchdog", () => {
  it("interrupts if state remains roundResolve", async () => {
    const timers = useCanonicalTimers();
    const mod = await harness.importModule(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const machine = {
      getState: vi.fn(() => "roundResolve"),
      dispatch: vi.fn()
    };
    const token = "token-1";
    debugHooks.exposeDebugState("roundResolveWatchdogToken", token);
    mod.schedulePostResolveWatchdog(machine, token);
    await vi.runAllTimersAsync();
    expect(machine.dispatch).toHaveBeenCalledWith("outcome=draw", {
      reason: "postResolveWatchdog"
    });
    timers.cleanup();
  });

  it("returns a cancel function that prevents fallback dispatch", async () => {
    const timers = useCanonicalTimers();
    const mod = await harness.importModule(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const machine = {
      getState: vi.fn(() => "roundResolve"),
      dispatch: vi.fn()
    };
    const token = "token-cancel";
    debugHooks.exposeDebugState("roundResolveWatchdogToken", token);
    const cancelWatchdog = mod.schedulePostResolveWatchdog(machine, token);

    cancelWatchdog();
    await vi.runAllTimersAsync();

    expect(machine.dispatch).not.toHaveBeenCalled();
    timers.cleanup();
  });

  it("ignores stale watchdog dispatch when a newer token is active", async () => {
    const timers = useCanonicalTimers();
    const mod = await harness.importModule(
      "../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const machine = {
      getState: vi.fn(() => "roundResolve"),
      dispatch: vi.fn()
    };

    debugHooks.exposeDebugState("roundResolveWatchdogToken", "round-2");
    mod.schedulePostResolveWatchdog(machine, "round-1");

    await vi.runAllTimersAsync();

    expect(machine.dispatch).not.toHaveBeenCalled();
    timers.cleanup();
  });
});
