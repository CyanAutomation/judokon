import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../utils/testUtils.js";

let generateRandomCardMock;

vi.mock("../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

let getRandomJudokaMock;
let renderJudokaCardMock;

vi.mock("../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args),
  renderJudokaCard: (...args) => renderJudokaCardMock(...args)
}));

let fetchJsonMock;
vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args)
}));

vi.mock("../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("classicBattle", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (data, g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li><li class="stat"><strong>Speed</strong> <span>5</span></li><li class="stat"><strong>Technique</strong> <span>5</span></li><li class="stat"><strong>Kumi-kata</strong> <span>5</span></li><li class="stat"><strong>Ne-waza</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderJudokaCardMock = vi.fn(async (j, g, container) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li><li class="stat"><strong>Speed</strong> <span>3</span></li><li class="stat"><strong>Technique</strong> <span>3</span></li><li class="stat"><strong>Kumi-kata</strong> <span>3</span></li><li class="stat"><strong>Ne-waza</strong> <span>3</span></li></ul>`;
    });
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
  });

  it("clears selected class on stat buttons after each round", async () => {
    document.body.innerHTML +=
      '<div id="stat-buttons"><button data-stat="power"></button><button data-stat="speed"></button><button data-stat="technique"></button><button data-stat="kumikata"></button><button data-stat="newaza"></button></div>';
    const { handleStatSelection, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    await handleStatSelection("power");
    expect(btn.classList.contains("selected")).toBe(false);
  });

  it("re-enables stat button after selection", async () => {
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    const { handleStatSelection, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    await handleStatSelection("power");
    await vi.runAllTimersAsync();
    expect(btn.classList.contains("selected")).toBe(false);
    expect(btn.disabled).toBe(false);
  });

  it("clears inline background color with selected class", async () => {
    document.body.innerHTML +=
      '<div id="stat-buttons"><button data-stat="power"></button><button data-stat="speed"></button><button data-stat="technique"></button><button data-stat="kumikata"></button><button data-stat="newaza"></button></div>';
    const { handleStatSelection, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    const btn = document.querySelector("[data-stat='power']");
    btn.classList.add("selected");
    btn.style.backgroundColor = "red";
    await handleStatSelection("power");
    await vi.runAllTimersAsync();
    expect(btn.classList.contains("selected")).toBe(false);
    expect(btn.style.backgroundColor).toBe("");
  });

  it("auto-selects a stat when timer expires", async () => {
    const { startRound } = await import("../../src/helpers/classicBattle.js");
    await startRound();
    timerSpy.advanceTimersByTime(31000);
    timerSpy.advanceTimersByTime(800);
    await vi.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).not.toBe("You: 0\nComputer: 0");
  });

  it("shows tie message when values are equal", async () => {
    const { handleStatSelection, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    _resetForTest();
    await handleStatSelection("power");
    expect(document.querySelector("header #round-message").textContent).toMatch(/Tie/);
    expect(document.querySelector("header #score-display").textContent).toBe("You: 0\nComputer: 0");
  });

  it("quits match after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { quitMatch } = await import("../../src/helpers/classicBattle.js");
    const result = quitMatch();
    expect(confirmSpy).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(document.querySelector("header #round-message").textContent).toMatch(/quit/i);
  });

  it("ends the match when player reaches 10 wins", async () => {
    const { handleStatSelection, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    for (let i = 0; i < 10; i++) {
      document.getElementById("player-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      document.getElementById("computer-card").innerHTML =
        `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
      await handleStatSelection("power");
    }
    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 10\nComputer: 0"
    );
    expect(document.querySelector("header #round-message").textContent).toMatch(/win the match/i);

    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    await handleStatSelection("power");

    expect(document.querySelector("header #score-display").textContent).toBe(
      "You: 10\nComputer: 0"
    );
  });

  it("evaluateRound updates the score", async () => {
    const { evaluateRound, _resetForTest } = await import("../../src/helpers/classicBattle.js");
    _resetForTest();
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    document.getElementById("computer-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    const result = evaluateRound("power");
    expect(result.message).toMatch(/win/);
    expect(document.querySelector("header #score-display").textContent).toBe("You: 1\nComputer: 0");
  });

  it("scheduleNextRound triggers a countdown", async () => {
    const battleMod = await import("../../src/helpers/classicBattle.js");
    const infoMod = await import("../../src/helpers/setupBattleInfoBar.js");
    vi.spyOn(battleMod, "startRound").mockResolvedValue();
    const cdSpy = vi.spyOn(infoMod, "startCountdown").mockImplementation((_s, cb) => cb());
    battleMod.scheduleNextRound({ matchEnded: false });
    expect(cdSpy).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it("draws a different card for the computer", async () => {
    fetchJsonMock.mockImplementation(async (p) => {
      if (p.includes("judoka")) {
        return [{ id: 1 }];
      }
      return [];
    });
    generateRandomCardMock = vi.fn(async (d, g, c, _pm, cb) => {
      c.innerHTML = "<ul></ul>";
      cb({ id: 1 });
    });
    let callCount = 0;
    getRandomJudokaMock = vi.fn(() => {
      callCount += 1;
      return callCount === 1 ? { id: 1 } : { id: 2 };
    });
    renderJudokaCardMock = vi.fn(async () => {});
    const { startRound, getComputerJudoka, _resetForTest } = await import(
      "../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    await startRound();
    expect(renderJudokaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything(),
      expect.anything(),
      { animate: false, useObscuredStats: true }
    );
    expect(getComputerJudoka()).toEqual(expect.objectContaining({ id: 2 }));
  });

  it("excludes hidden judoka from selection", async () => {
    fetchJsonMock.mockImplementation(async (p) => {
      if (p.includes("judoka")) {
        return [
          { id: 1, isHidden: true },
          { id: 2, isHidden: false },
          { id: 3, isHidden: true }
        ];
      }
      return [];
    });
    generateRandomCardMock = vi.fn(async (d, g, c, _pm, cb) => {
      c.innerHTML = "<ul></ul>";
      if (cb) cb(d[0]);
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderJudokaCardMock = vi.fn(async () => {});
    const { startRound, _resetForTest } = await import("../../src/helpers/classicBattle.js");
    _resetForTest();
    await startRound();
    expect(generateRandomCardMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 2, isHidden: false })],
      null,
      expect.anything(),
      false,
      expect.any(Function)
    );
    expect(getRandomJudokaMock).toHaveBeenCalledWith([
      expect.objectContaining({ id: 2, isHidden: false })
    ]);
  });
});
