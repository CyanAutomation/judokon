import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers, resetDom } from "../../utils/testUtils.js";
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

describe.sequential("classicBattle card selection", () => {
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
    renderMock = vi.fn(async () => document.createElement("div"));
  });

  afterEach(() => {
    // Clear timers then fully reset DOM and module state between tests
    timerSpy.clearAllTimers();
    resetDom();
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
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    // Ensure the mocked JudokaCard.render returns an element after module mocks initialize
    renderMock = vi.fn(async () => document.createElement("div"));
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    const { getComputerJudoka } = battleMod;
    expect(JudokaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything(),
      { useObscuredStats: true, enableInspector: false }
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
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    renderMock = vi.fn(async () => document.createElement("div"));
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
    await retry.click();
    await Promise.resolve();
    expect(fetchJsonMock).toHaveBeenCalledTimes(3);
  });

  it("retries both judoka and gokyo loads after failure", async () => {
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
    const container = document.getElementById("computer-card");
    expect(container.innerHTML).toBe("");
    consoleSpy.mockRestore();
  });
});
