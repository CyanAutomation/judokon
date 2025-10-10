import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers, resetDom } from "../../utils/testUtils.js";
import { applyMockSetup, mocks } from "./mockSetup.js";

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

    const { drawCards, _resetForTest, JudokaDataLoadError } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);

    expect(document.getElementById("round-message").textContent).toBe("boom");
    const retry = document.getElementById("retry-draw-button");
    expect(retry).toBeTruthy();
  });

  it("propagates load errors and skips gokyo fetch when judoka load fails", async () => {
    const calls = [];
    fetchJsonMock.mockImplementation(async (path) => {
      calls.push(path);
      if (path.includes("judoka")) {
        throw new Error("boom");
      }
      return [];
    });

    const { drawCards, _resetForTest, JudokaDataLoadError } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);
    expect(calls.length).toBe(1);
    expect(calls[0]).toMatch(/judoka\.json/);
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

    const {
      drawCards,
      _resetForTest,
      JudokaDataLoadError,
      CARD_RETRY_EVENT,
      LOAD_ERROR_EXIT_EVENT
    } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const retry = document.getElementById("retry-draw-button");
    const exit = document.getElementById("exit-draw-button");
    expect(retry).toBeTruthy();
    expect(exit).toBeTruthy();
    await new Promise((resolve) => {
      const handler = async () => {
        window.removeEventListener(CARD_RETRY_EVENT, handler);
        try {
          await drawCards();
        } catch (err) {
          if (!(err instanceof JudokaDataLoadError)) {
            throw err;
          }
        }
        resolve();
      };
      window.addEventListener(CARD_RETRY_EVENT, handler);
      retry.click();
    });
    expect(retry.disabled).toBe(true);
    expect(retry.getAttribute("aria-busy")).toBe("true");
    expect(retry.textContent).toBe("Retrying...");
    expect(exit.disabled).toBe(false);
    expect(exit.getAttribute("aria-disabled")).toBeNull();

    expect(calls.length).toBe(3);
    // Expect sequence: judoka (fail), judoka (success on retry), gokyo (success on retry)
    expect(calls[0]).toMatch(/judoka\.json/);
    expect(calls[1]).toMatch(/judoka\.json/);
    expect(calls[2]).toMatch(/gokyo\.json/);
  });

  it("Return to Lobby button dispatches exit event", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("boom"));

    const { drawCards, _resetForTest, JudokaDataLoadError, LOAD_ERROR_EXIT_EVENT } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const exitListener = vi.fn();
    window.addEventListener(LOAD_ERROR_EXIT_EVENT, exitListener);

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const exit = document.getElementById("exit-draw-button");
    expect(exit).toBeTruthy();

    exit.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(exit.disabled).toBe(true);
    expect(exit.textContent).toBe("Returning...");
    expect(exitListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(LOAD_ERROR_EXIT_EVENT, exitListener);
  });

  it("fails when judoka payload is empty", async () => {
    fetchJsonMock.mockImplementation(async (path) => {
      if (path.includes("judoka")) {
        return [];
      }
      return [];
    });

    const { drawCards, _resetForTest, JudokaDataLoadError } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);
    expect(document.getElementById("round-message").textContent).toBe("Judoka dataset is empty.");
    expect(document.getElementById("retry-draw-button")).toBeTruthy();
  });

  it("fails when judoka payload is not an array", async () => {
    fetchJsonMock.mockImplementation(async (path) => {
      if (path.includes("judoka")) {
        return { nope: true };
      }
      return [];
    });

    const { drawCards, _resetForTest, JudokaDataLoadError } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);
    expect(document.getElementById("round-message").textContent).toBe(
      "Invalid judoka dataset received."
    );
    expect(document.getElementById("retry-draw-button")).toBeTruthy();
  });

  it("caches successful judoka payloads", async () => {
    const { loadJudokaData, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const fetcher = vi.fn().mockResolvedValue([{ id: 42 }]);

    const first = await loadJudokaData({ fetcher });
    const second = await loadJudokaData({ fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first).toEqual([{ id: 42 }]);
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

    const { withMutedConsole } = await import("../../utils/console.js");
    let errorMessageDetected = false;

    await withMutedConsole(async () => {
      const originalError = console.error;
      console.error = (...args) => {
        if (args[0] === "JudokaCard did not render an HTMLElement") {
          errorMessageDetected = true;
        }
      };

      const { drawCards, _resetForTest } = await import(
        "../../../src/helpers/classicBattle/cardSelection.js"
      );
      _resetForTest();
      fetchJsonMock.mockImplementation(async (path) => {
        if (path.includes("judoka")) {
          return [{ id: 1 }];
        }
        return [];
      });

      try {
        await drawCards();
      } finally {
        console.error = originalError;
      }
    });

    expect(errorMessageDetected).toBe(true);
    const container = document.getElementById("opponent-card");
    expect(container.innerHTML).toBe("");
  });
});
