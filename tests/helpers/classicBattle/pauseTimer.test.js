import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

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
  importJsonModule: vi.fn().mockResolvedValue(defaultSettings)
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("classicBattle timer pause", () => {
  let timer;
  let showMessage;
  let battleMod;
  let store;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const roundResult = document.createElement("p");
    roundResult.id = "round-result";
    roundResult.setAttribute("aria-live", "polite");
    roundResult.setAttribute("aria-atomic", "true");
    const statButtons = document.createElement("div");
    statButtons.id = "stat-buttons";
    statButtons.dataset.tooltipId = "ui.selectStat";
    statButtons.innerHTML = '<button data-stat="power"></button>';
    document.body.append(playerCard, computerCard, header, roundResult, statButtons);

    timer = vi.useFakeTimers();

    fetchJsonMock = vi.fn(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 1, default: true, category: "roundTimer" }];
      }
      return [];
    });

    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => {
      const el = document.createElement("div");
      el.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      return el;
    });

    showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      clearTimer: vi.fn(),
      clearMessage: vi.fn(),
      updateScore: vi.fn(),
      showAutoSelect: vi.fn(),
      updateRoundCounter: vi.fn(),
      clearRoundCounter: vi.fn()
    }));

    battleMod = await import("../../../src/helpers/classicBattle.js");
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
  });

  afterEach(() => {
    timer.clearAllTimers();
  });

  it("does not show auto-select message when stat picked before timer expires", async () => {
    await battleMod.startRound(store);
    timer.advanceTimersByTime(900);
    const promise = battleMod.handleStatSelection(store, "power");
    timer.advanceTimersByTime(1000);
    await promise;
    timer.advanceTimersByTime(10000);
    const messages = showMessage.mock.calls.map((c) => c[0]);
    expect(messages.some((m) => /Time's up! Auto-selecting/.test(m))).toBe(false);
  });
});
