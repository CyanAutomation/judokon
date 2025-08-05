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

describe("classicBattle match flow", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async (url) => {
      if (String(url).includes("gameTimers.json")) {
        return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
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
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
  });

  it("auto-selects a stat when timer expires", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle._resetForTest();
    await classicBattle.startRound();
    timerSpy.advanceTimersByTime(31000);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    const msg = document.querySelector("header #round-message").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
    expect(msg).toMatch(/win the round/i);
  });

  it("quits match after confirmation", async () => {
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle.quitMatch();
    const confirmBtn = document.getElementById("confirm-quit-button");
    expect(confirmBtn).not.toBeNull();
    confirmBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("header #round-message").textContent).toMatch(/quit/i);
  });

  it("does not quit match when cancel is chosen", async () => {
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle._resetForTest();
    document.querySelector("#round-message").textContent = "Select your move";
    classicBattle.quitMatch();
    const cancelBtn = document.getElementById("cancel-quit-button");
    expect(cancelBtn).not.toBeNull();
    cancelBtn.dispatchEvent(new Event("click"));
    expect(document.querySelector("header #round-message").textContent).toBe("Select your move");
    expect(document.querySelector("header #score-display").textContent).toBe("You: 0\nOpponent: 0");
  });

  it("ends the match when player reaches 10 wins", async () => {
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle._resetForTest();
    const selectStat = async () => {
      const p = classicBattle.handleStatSelection("power");
      await vi.runAllTimersAsync();
      await p;
    };
    for (let i = 0; i < 10; i++) {
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      document.getElementById("computer-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      await selectStat();
    }
    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 10\nOpponent: 0"
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(/win the match/i);

    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    {
      const p = classicBattle.handleStatSelection("power");
      await vi.runAllTimersAsync();
      await p;
    }

    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 10\nOpponent: 0"
    );
  });

  it("ends the match when opponent reaches 10 wins", async () => {
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle._resetForTest();
    const selectStat = async () => {
      const p = classicBattle.handleStatSelection("power");
      await vi.runAllTimersAsync();
      await p;
    };
    for (let i = 0; i < 10; i++) {
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      document.getElementById("computer-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      await selectStat();
    }
    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 0\nOpponent: 10"
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(
      /opponent wins the match/i
    );

    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    {
      const p = classicBattle.handleStatSelection("power");
      await vi.runAllTimersAsync();
      await p;
    }

    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 0\nOpponent: 10"
    );
  });

  it("scheduleNextRound waits for cooldown then enables button", async () => {
    document.body.innerHTML += '<button id="next-round-button" disabled></button>';
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const startStub = vi.fn();
    battleMod.scheduleNextRound({ matchEnded: false }, startStub);
    const btn = document.getElementById("next-round-button");
    expect(btn.disabled).toBe(true);
    timerSpy.advanceTimersByTime(2000);
    timerSpy.advanceTimersByTime(3000);
    await Promise.resolve();
    expect(btn.disabled).toBe(false);
    btn.click();
    await Promise.resolve();
    expect(btn.disabled).toBe(true);
    expect(startStub).toHaveBeenCalled();
  });

  it("shows selection prompt until a stat is chosen", async () => {
    const { classicBattle } = await import("../../../src/helpers/classicBattle.js");
    classicBattle._resetForTest();
    await classicBattle.startRound();
    expect(document.querySelector("header #round-message").textContent).toBe("Select your move");
    timerSpy.advanceTimersByTime(5000);
    expect(document.querySelector("header #round-message").textContent).toBe("Select your move");
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    {
      const p = classicBattle.handleStatSelection("power");
      await vi.runAllTimersAsync();
      await p;
    }
    expect(document.querySelector("header #round-message").textContent).not.toBe(
      "Select your move"
    );
  });
});
