import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

describe("timerService next round handling", () => {
  it("clicking Next during cooldown skips current phase", async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage: vi.fn(),
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      stopTimer: vi.fn(),
      STATS: []
    }));
    vi.doMock("../../../src/helpers/classicBattle/runTimerWithDrift.js", () => ({
      runTimerWithDrift: () => async () => {}
    }));
    const dispatchBattleEvent = vi.fn();
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent
    }));
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const { nextButton } = createTimerNodes();
    nextButton.addEventListener("click", mod.onNextButtonClick);
    mod.scheduleNextRound({ matchEnded: false });
    nextButton.click();
    await vi.waitFor(() => {
      expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(2);
    expect(nextButton.dataset.nextReady).toBeUndefined();
  });

  it("auto-dispatches ready when cooldown finishes", async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage: vi.fn(),
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      stopTimer: vi.fn(),
      STATS: []
    }));
    vi.doMock("../../../src/helpers/classicBattle/runTimerWithDrift.js", () => ({
      runTimerWithDrift: () => async (_d, _t, onExpired) => {
        await onExpired();
      }
    }));
    const dispatchBattleEvent = vi.fn();
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent
    }));
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    createTimerNodes();
    mod.scheduleNextRound({ matchEnded: false });
    await vi.waitFor(() => {
      expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });
});

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

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("scheduleNextRound early click", () => {
  let timerSpy;
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async (importOriginal) => {
      return await importOriginal();
    });
    vi.doMock("../../../src/helpers/setupScoreboard.js", async (importOriginal) => {
      return await importOriginal();
    });
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", async (importOriginal) => {
      return await importOriginal();
    });
    vi.doMock("../../../src/helpers/classicBattle/runTimerWithDrift.js", async (importOriginal) => {
      return await importOriginal();
    });
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", async (importOriginal) => {
      return await importOriginal();
    });
    vi.doMock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
      return await importOriginal();
    });
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    header.querySelector("#next-round-timer")?.remove();
    document.body.append(playerCard, computerCard, header);
    const { nextButton } = createTimerNodes();
    nextButton.disabled = true;
    timerSpy = vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchJsonMock = vi.fn(async (url) => {
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
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      cb?.({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => {
      const el = document.createElement("div");
      el.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      return el;
    });
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
    vi.restoreAllMocks();
  });

  it("transitions roundOver → cooldown → roundStart without duplicates", async () => {
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
