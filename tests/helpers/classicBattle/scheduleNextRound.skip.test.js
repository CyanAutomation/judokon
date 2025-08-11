import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
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

describe("scheduleNextRound early click", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.className = "disabled";
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

  it("transitions roundOver \u2192 cooldown \u2192 roundStart without duplicates", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const startRoundWrapper = vi.fn(async () => {
      await battleMod.startRound(store);
    });
    await orchestrator.initClassicBattleOrchestrator(store, startRoundWrapper);
    const machine = orchestrator.getBattleStateMachine();

    // Start first round to wire Next button
    await battleMod.startRound(store);
    expect(generateRandomCardMock).toHaveBeenCalledTimes(1);

    machine.current = "roundOver";
    await orchestrator.dispatchBattleEvent("continue");
    expect(machine.getState()).toBe("cooldown");

    battleMod.scheduleNextRound({ matchEnded: false });
    document.getElementById("next-button").click();
    await vi.runAllTimersAsync();

    expect(startRoundWrapper).toHaveBeenCalledTimes(1);
    expect(machine.getState()).toBe("waitingForPlayerAction");
    expect(generateRandomCardMock).toHaveBeenCalledTimes(2);
  });
});
