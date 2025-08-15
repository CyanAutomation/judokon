import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

describe("timerService drift handling", () => {
  it("startTimer shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 30
    }));
    let onDrift;
    const watchSpy = vi.fn((dur, cb) => {
      onDrift = cb;
      return vi.fn();
    });
    const startRound = vi.fn(async (onTick) => {
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startRound, watchForDrift: watchSpy };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    await mod.startTimer(async () => {});
    onDrift(2);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
  });

  it("scheduleNextRound shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    let onDrift;
    const watchSpy = vi.fn((dur, cb) => {
      onDrift = cb;
      return vi.fn();
    });
    const startCoolDown = vi.fn((onTick) => {
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startCoolDown, watchForDrift: watchSpy };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const timer = vi.useFakeTimers();
    const btn = document.createElement("button");
    btn.id = "next-button";
    document.body.appendChild(btn);
    const timerNode = document.createElement("p");
    timerNode.id = "next-round-timer";
    document.body.appendChild(timerNode);
    mod.scheduleNextRound({ matchEnded: false });
    timer.advanceTimersByTime(2000);
    onDrift(1);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    timer.clearAllTimers();
  });

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
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.addEventListener("click", mod.onNextButtonClick);
    document.body.appendChild(btn);
    const timerNode = document.createElement("p");
    timerNode.id = "next-round-timer";
    document.body.appendChild(timerNode);
    mod.scheduleNextRound({ matchEnded: false });
    btn.click();
    await vi.waitFor(() => {
      expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");
    });
    expect(dispatchBattleEvent).toHaveBeenCalledTimes(2);
    expect(btn.dataset.nextReady).toBeUndefined();
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
    const btn = document.createElement("button");
    btn.id = "next-button";
    document.body.appendChild(btn);
    const timerNode = document.createElement("p");
    timerNode.id = "next-round-timer";
    document.body.appendChild(timerNode);
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
  importJsonModule: vi.fn()
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
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.disabled = true;
    document.body.append(playerCard, computerCard, header, btn);
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
