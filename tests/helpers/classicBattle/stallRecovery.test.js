import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { applyMockSetup } from "./mockSetup.js";

vi.mock("../../../src/helpers/classicBattle/timerService.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/timerService.js");
  return {
    ...actual,
    startTimer: vi.fn().mockResolvedValue(undefined)
  };
});
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  startCooldown: vi.fn(),
  createBattleStore: () => ({})
}));

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;

describe("classicBattle stalled stat selection recovery", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, opponentCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
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
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock,
      currentFlags: { autoSelect: { enabled: true } }
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
    vi.restoreAllMocks();
  });

  it("auto-selects after stall timeout", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    await battleMod.__ensureClassicBattleBindings();
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    await battleMod.__triggerStallPromptNow(store);
    expect(document.querySelector("header #round-message").textContent).toMatch(/stalled/i);
    timerSpy.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
  });
});
