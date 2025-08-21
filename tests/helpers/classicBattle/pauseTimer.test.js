import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage } from "./domUtils.js";
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
  importJsonModule: vi.fn().mockResolvedValue(defaultSettings),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
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
    const roundResult = createRoundMessage("round-result");
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

  it.skip("does not show auto-select message when stat picked before timer expires", async () => {
    // debug markers to diagnose potential timeouts in CI

    console.log("pauseTimer: START test");
    // Pre-fill cards and trigger selection directly to avoid depending on
    // timer ticks in this unit test.
    document.getElementById("player-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>';
    document.getElementById("computer-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>';

    console.log("pauseTimer: BEFORE handleStatSelection");
    await battleMod.handleStatSelection(store, "power");

    console.log("pauseTimer: AFTER handleStatSelection");
    timer.advanceTimersByTime(1000);
    const messages = showMessage.mock.calls.map((c) => c[0]);
    expect(messages.some((m) => /Time's up! Auto-selecting/.test(m))).toBe(false);
  });
});
