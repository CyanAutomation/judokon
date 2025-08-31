import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers, resetDom } from "../../utils/testUtils.js";
import { applyMockSetup, mocks } from "./mockSetup.js";

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;

describe.sequential("classicBattle card selection", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, opponentCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = "<ul></ul>";
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => document.createElement("div"));
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
    });
  });

  afterEach(() => {
    // Clear timers then fully reset DOM and module state between tests
    timerSpy.clearAllTimers();
    resetDom();
  });

  it("draws a different card for the opponent", async () => {
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
    renderMock = vi.fn(async () => document.createElement("div"));
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
    });
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    const { getOpponentJudoka } = battleMod;
    expect(mocks.JudokaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything(),
      { useObscuredStats: true, enableInspector: false }
    );
    expect(getOpponentJudoka()).toEqual(expect.objectContaining({ id: 2 }));
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
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
    });
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
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
  });

  it("clicking Retry re-fetches data in order", async () => {
    const calls = [];
    fetchJsonMock.mockImplementation(async (p) => {
      calls.push(p);
      if (calls.length === 1) {
        throw new Error("boom");
      }
      // After retry, respond with empty arrays for both resources
      return [];
    });

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await drawCards();

    const retry = document.getElementById("retry-draw-button");
    expect(retry).toBeTruthy();
    await retry.click();
    await Promise.resolve();

    expect(calls.length).toBe(3);
    // Expect sequence: judoka (fail), gokyo (success in same attempt), judoka (success on retry)
    expect(calls[0]).toMatch(/judoka\.json/);
    expect(calls[1]).toMatch(/gokyo\.json/);
    expect(calls[2]).toMatch(/judoka\.json/);
  });

  it("logs an error when JudokaCard.render does not return an element", async () => {
    await vi.resetModules();
    // Force the JudokaCard module to return a non-HTMLElement deterministically
    vi.doMock("../../../src/components/JudokaCard.js", () => {
      return {
        JudokaCard: vi.fn().mockImplementation(() => ({
          render: vi.fn(async () => "nope")
        }))
      };
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    await drawCards();
    expect(consoleSpy).toHaveBeenCalledWith("JudokaCard did not render an HTMLElement");
    const container = document.getElementById("opponent-card");
    expect(container.innerHTML).toBe("");
    consoleSpy.mockRestore();
  });
});
