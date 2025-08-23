import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { createTimerNodes } from "./domUtils.js";
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

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
  importJsonModule: vi.fn().mockResolvedValue(defaultSettings),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
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

describe("classicBattle scheduleNextRound", () => {
  function mockBattleData() {
    fetchJsonMock.mockImplementation(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
      }
      if (String(url).includes("classicBattleStates.json")) {
        return [
          {
            name: "roundOver",
            type: "initial",
            triggers: [{ on: "continue", target: "cooldown" }]
          },
          { name: "cooldown", triggers: [{ on: "ready", target: "roundStart" }] },
          {
            name: "roundStart",
            triggers: [{ on: "cardsRevealed", target: "waitingForPlayerAction" }]
          },
          { name: "waitingForPlayerAction", triggers: [] }
        ];
      }
      if (String(url).includes("judoka.json")) return [{ id: 1 }, { id: 2 }];
      if (String(url).includes("gokyo.json")) return [];
      return [];
    });
  }

  it("auto-dispatches ready after cooldown", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    mockBattleData();

    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const dispatchSpy = vi.spyOn(orchestrator, "dispatchBattleEvent");
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    await battleMod.startRound(store);

    machine.current = "roundOver";
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    battleMod.scheduleNextRound({ matchEnded: false });

    timerSpy.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
  });

  it("transitions roundOver → cooldown → roundStart without duplicates", async () => {
    document.getElementById("next-round-timer")?.remove();
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mockBattleData();

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    await battleMod.startRound(store);
    expect(generateRandomCardMock).toHaveBeenCalledTimes(1);

    machine.current = "roundOver";
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    battleMod.scheduleNextRound({ matchEnded: false });
    document.getElementById("next-button").dispatchEvent(new MouseEvent("click"));
    await vi.runAllTimersAsync();

    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
    expect(generateRandomCardMock).toHaveBeenCalledTimes(2);
  });
});
