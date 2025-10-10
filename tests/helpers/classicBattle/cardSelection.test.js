import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers, resetDom } from "../../utils/testUtils.js";
import { applyMockSetup, mocks } from "./mockSetup.js";
import { withMutedConsole } from "../../utils/console.js";

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;

describe.sequential("classicBattle card selection", () => {
  let timers;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, opponentCard, header);
    timers = useCanonicalTimers();
    fetchJsonMock = vi.fn(async (path) => {
      if (path.includes("judoka")) {
        return [{ id: 1 }];
      }
      return [];
    });
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
    timers.cleanup();
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
    expect(store.currentPlayerJudoka).toEqual(expect.objectContaining({ id: 1 }));
    expect(mocks.JudokaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.anything(),
      { useObscuredStats: true, enableInspector: false }
    );
    expect(getOpponentJudoka()).toEqual(expect.objectContaining({ id: 2 }));
  });

  it("falls back when only the player judoka is available", async () => {
    const qaLogger = vi.fn();
    const fallbackProvider = vi.fn().mockResolvedValue({ id: 99 });
    const randomJudokaMock = vi.fn(() => ({ id: 1 }));
    const { selectOpponentJudoka, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const result = await selectOpponentJudoka({
      availableJudoka: [{ id: 1 }],
      playerJudoka: { id: 1 },
      randomJudoka: randomJudokaMock,
      fallbackProvider,
      qaLogger
    });

    expect(result).toEqual({ id: 99 });
    expect(fallbackProvider).toHaveBeenCalledTimes(1);
    expect(randomJudokaMock).toHaveBeenCalledTimes(6);
    expect(qaLogger).toHaveBeenCalledWith("Using fallback judoka after retry exhaustion");
  });

  it("falls back when random selection returns null", async () => {
    const qaLogger = vi.fn();
    const fallbackProvider = vi.fn().mockResolvedValue({ id: 101 });
    const randomJudokaMock = vi.fn(() => null);
    const { selectOpponentJudoka, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const result = await selectOpponentJudoka({
      availableJudoka: [{ id: 1 }],
      playerJudoka: { id: 1 },
      randomJudoka: randomJudokaMock,
      fallbackProvider,
      qaLogger
    });

    expect(result).toEqual({ id: 101 });
    expect(fallbackProvider).toHaveBeenCalledTimes(1);
    expect(randomJudokaMock).toHaveBeenCalledTimes(1);
    expect(qaLogger).toHaveBeenCalledWith("Using fallback judoka after retry exhaustion");
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
      { enableInspector: false, skipRender: false }
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

    await withMutedConsole(() => drawCards());

    expect(document.getElementById("round-message").textContent).toBe("boom");
    const retry = document.getElementById("retry-draw-button");
    expect(retry).toBeTruthy();
  });

  it("shows retry dialog when judoka payload is not an array", async () => {
    fetchJsonMock.mockImplementation(async (path) => {
      if (path.includes("judoka")) {
        return { id: 1 };
      }
      return [];
    });

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    await withMutedConsole(() => drawCards());

    expect(document.getElementById("round-message").textContent).toBe(
      "Judoka dataset is missing or invalid."
    );
    const retry = document.getElementById("retry-draw-button");
    expect(retry).toBeTruthy();
  });

  it("shows retry dialog when judoka payload is empty", async () => {
    fetchJsonMock.mockImplementation(async (path) => {
      if (path.includes("judoka")) {
        return [];
      }
      return [];
    });

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    await withMutedConsole(() => drawCards());

    expect(document.getElementById("round-message").textContent).toBe(
      "Judoka dataset is missing or invalid."
    );
    const retry = document.getElementById("retry-draw-button");
    expect(retry).toBeTruthy();
  });

  it("caches judoka data after a successful load", async () => {
    const { loadJudokaData, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    fetchJsonMock.mockClear();

    const first = await loadJudokaData();
    const second = await loadJudokaData();

    expect(first).toEqual([{ id: 1 }]);
    expect(second).toBe(first);
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
  });

  it("still loads gokyo data when judoka load fails", async () => {
    const calls = [];
    fetchJsonMock.mockImplementation(async (path) => {
      calls.push(path);
      if (path.includes("judoka")) {
        throw new Error("boom");
      }
      return [];
    });

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const result = await withMutedConsole(() => drawCards());

    expect(result).toEqual({ playerJudoka: null, opponentJudoka: null });
    expect(calls.length).toBe(2);
    expect(calls[0]).toMatch(/judoka\.json/);
    expect(calls[1]).toMatch(/gokyo\.json/);
  });

  it("clicking Retry re-fetches data in order", async () => {
    const calls = [];
    fetchJsonMock.mockImplementation(async (p) => {
      calls.push(p);
      if (calls.length === 1) {
        throw new Error("boom");
      }
      if (p.includes("judoka")) {
        return [{ id: 1 }];
      }
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

    await withMutedConsole(() => drawCards());

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
