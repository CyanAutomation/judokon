import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { withMutedConsole } from "../../utils/console.js";

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => {
    const id = setTimeout(() => cb(performance.now()), 16);
    return id;
  },
  onSecondTick: (cb) => {
    const id = setInterval(() => cb(performance.now()), 1000);
    return id;
  },
  cancel: (id) => {
    clearTimeout(id);
    clearInterval(id);
  },
  start: vi.fn(),
  stop: vi.fn()
}));

let generateRandomCardMock;
vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

let getRandomJudokaMock;
let renderMock;
let JudokaCardMock;
vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));
vi.mock("../../../src/components/JudokaCard.js", () => {
  renderMock = vi.fn();
  JudokaCardMock = vi.fn().mockImplementation(() => ({ render: renderMock }));
  return { JudokaCard: JudokaCardMock };
});

let fetchJsonMock;
vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args),
  importJsonModule: vi.fn()
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

let currentFlags;
vi.mock("../../../src/helpers/featureFlags.js", () => ({
  featureFlagsEmitter: new EventTarget(),
  initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags }),
  isEnabled: (flag) => currentFlags[flag]?.enabled ?? false
}));

let timerSpy;

beforeEach(() => {
  ({
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  } = setupClassicBattleDom());
});

afterEach(() => {
  timerSpy.clearAllTimers();
  vi.restoreAllMocks();
});

describe("classicBattle interrupts", () => {
  it("dispatches interrupt when Random Stat Mode is disabled", async () => {
    currentFlags.randomStatMode.enabled = false;
    let dispatchSpy;
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/classicBattle/orchestrator.js");
      dispatchSpy = vi.fn(actual.dispatchBattleEvent);
      return { ...actual, dispatchBattleEvent: dispatchSpy };
    });
    let autoSelectSpy;
    vi.doMock("../../../src/helpers/classicBattle/autoSelectStat.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/classicBattle/autoSelectStat.js");
      autoSelectSpy = vi.fn(actual.autoSelectStat);
      return { autoSelectStat: autoSelectSpy };
    });
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    timerSpy.advanceTimersByTime(31000);
    await vi.runOnlyPendingTimersAsync();
    const events = dispatchSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("timeout");
    expect(events).toContain("interrupt");
    expect(autoSelectSpy).not.toHaveBeenCalled();
  });

  it("interrupts match on navigation away", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const { battleEngine } = await import("../../../src/helpers/battleEngineFacade.js");
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    fetchJsonMock.mockImplementation(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
      }
      if (String(url).includes("classicBattleStates.json")) {
        return [
          {
            name: "matchStart",
            type: "initial",
            triggers: [{ on: "interrupt", target: "interruptMatch" }]
          },
          { name: "interruptMatch", triggers: [{ on: "matchOver", target: "matchOver" }] },
          { name: "matchOver", triggers: [] }
        ];
      }
      return [];
    });
    await orchestrator.initClassicBattleOrchestrator(store);
    const machine = orchestrator.getBattleStateMachine();
    const interruptSpy = vi.spyOn(battleEngine, "interruptMatch");
    const dispatchSpy = vi.spyOn(orchestrator, "dispatchBattleEvent");
    const addSpy = vi.spyOn(window, "addEventListener");
    initInterruptHandlers(store);
    const handlers = Object.fromEntries(addSpy.mock.calls.map(([e, fn]) => [e, fn]));
    addSpy.mockRestore();
    await withMutedConsole(async () => {
      window.dispatchEvent(new Event("pagehide"));
      await vi.runAllTimersAsync();
    });
    await dispatchSpy.mock.results[0].value;
    expect(interruptSpy).toHaveBeenCalledWith("navigation");
    expect(machine.getState()).toBe("matchOver");
    Object.entries(handlers).forEach(([e, fn]) => window.removeEventListener(e, fn));
  });

  it("interrupts match on global error and shows message", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const { battleEngine } = await import("../../../src/helpers/battleEngineFacade.js");
    const { initInterruptHandlers } = await import(
      "../../../src/helpers/classicBattle/interruptHandlers.js"
    );
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    fetchJsonMock.mockImplementation(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
      }
      if (String(url).includes("classicBattleStates.json")) {
        return [
          {
            name: "matchStart",
            type: "initial",
            triggers: [{ on: "interrupt", target: "interruptMatch" }]
          },
          { name: "interruptMatch", triggers: [{ on: "matchOver", target: "matchOver" }] },
          { name: "matchOver", triggers: [] }
        ];
      }
      return [];
    });
    await orchestrator.initClassicBattleOrchestrator(store);
    const machine = orchestrator.getBattleStateMachine();
    const interruptSpy = vi.spyOn(battleEngine, "interruptMatch");
    const dispatchSpy = vi.spyOn(orchestrator, "dispatchBattleEvent");
    const addSpy = vi.spyOn(window, "addEventListener");
    initInterruptHandlers(store);
    const handlers = Object.fromEntries(addSpy.mock.calls.map(([e, fn]) => [e, fn]));
    addSpy.mockRestore();
    await withMutedConsole(async () => {
      window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
      await vi.runAllTimersAsync();
    });
    await dispatchSpy.mock.results[0].value;
    expect(interruptSpy).toHaveBeenCalledWith("error");
    expect(document.querySelector("header #round-message").textContent).toMatch(
      /Match interrupted: boom/
    );
    expect(machine.getState()).toBe("matchOver");
    Object.entries(handlers).forEach(([e, fn]) => window.removeEventListener(e, fn));
  });
});
