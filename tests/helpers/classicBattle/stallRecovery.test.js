import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/helpers/classicBattle/timerControl.js", () => ({
  startTimer: vi.fn().mockResolvedValue(undefined),
  scheduleNextRound: vi.fn()
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

describe("classicBattle stalled stat selection recovery", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
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
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
    vi.restoreAllMocks();
  });

  it("auto-selects after stall timeout", async () => {
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle._resetForTest();
    await classicBattle.startRound();
    timerSpy.advanceTimersByTime(35000);
    expect(document.querySelector("header #round-message").textContent).toMatch(/stalled/i);
    timerSpy.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
  });
});
