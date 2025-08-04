import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

let generateRandomCardMock;

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

let getRandomJudokaMock;
let renderJudokaCardMock;

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args),
  renderJudokaCard: (...args) => renderJudokaCardMock(...args)
}));

let fetchJsonMock;
vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args),
  importJsonModule: vi.fn()
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("classicBattle card selection", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = "<ul></ul>";
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderJudokaCardMock = vi.fn(async () => {});
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
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
    const { startRound, getComputerJudoka, _resetForTest } = await import(
      "../../../src/helpers/classicBattle.js"
    );
    _resetForTest();
    await startRound();
    expect(renderJudokaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything(),
      expect.anything(),
      { animate: false, useObscuredStats: true, enableInspector: false }
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
    const { startRound, _resetForTest } = await import("../../../src/helpers/classicBattle.js");
    _resetForTest();
    await startRound();
    expect(generateRandomCardMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 2, isHidden: false })],
      null,
      expect.anything(),
      false,
      expect.any(Function),
      { enableInspector: false }
    );
    expect(getRandomJudokaMock).toHaveBeenCalledWith([
      expect.objectContaining({ id: 2, isHidden: false })
    ]);
  });

  it("shows retry dialog when data load fails", async () => {
    fetchJsonMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await drawCards();

    expect(document.getElementById("round-message").textContent).toBe("boom");
    const retry = document.getElementById("retry-draw-button");
    expect(retry).toBeTruthy();
    await retry.click();
    await Promise.resolve();
    expect(fetchJsonMock).toHaveBeenCalledTimes(3);
  });
});
