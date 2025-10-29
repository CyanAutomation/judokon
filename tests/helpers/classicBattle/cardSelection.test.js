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
    const appliedMocks = applyMockSetup({
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
        return [
          {
            id: 1,
            name: "Opponent Alpha",
            stats: { power: 12 },
            isHidden: false
          }
        ];
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
    const appliedMocks = applyMockSetup({
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

  it("uses the provided cardFactory and lazy portrait setup", async () => {
    fetchJsonMock.mockImplementation(async (path) => {
      if (path.includes("judoka")) {
        return [
          {
            id: 1,
            firstname: "Player",
            surname: "One",
            stats: { power: 6 },
            isHidden: false
          }
        ];
      }
      if (path.includes("gokyo")) {
        return [{ id: 101, name: "O Soto Gari" }];
      }
      return [];
    });

    const cardElement = document.createElement("article");
    const signature = document.createElement("div");
    signature.className = "signature-move-container";
    cardElement.append(signature);
    const cardFactory = vi.fn().mockResolvedValue(cardElement);
    const lazyPortraitSetup = vi.fn();
    const appliedMocks = applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
    });

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const result = await drawCards({ cardFactory, lazyPortraitSetup });

    expect(cardFactory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      {},
      { useObscuredStats: true, enableInspector: false }
    );
    expect(lazyPortraitSetup).toHaveBeenCalledWith(cardElement);
    expect(appliedMocks.setupLazyPortraitsMock).not.toHaveBeenCalled();
    expect(appliedMocks.markSignatureMoveReadyMock).toHaveBeenCalledTimes(1);
    const playerContainer = document.getElementById("player-card");
    expect(playerContainer?.firstChild).toBe(cardElement);
    expect(generateRandomCardMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 1, isHidden: false })],
      null,
      playerContainer,
      false,
      expect.any(Function),
      { enableInspector: false, skipRender: false }
    );
    expect(result.playerJudoka).toEqual(expect.objectContaining({ id: 1 }));
  });

  it("applies default portrait and signature hooks when no overrides are provided", async () => {
    fetchJsonMock.mockImplementation(async (path) => {
      if (path.includes("judoka")) {
        return [
          {
            id: 5,
            firstname: "Default",
            surname: "Player",
            stats: { power: 4 },
            isHidden: false
          }
        ];
      }
      if (path.includes("gokyo")) {
        return [{ id: 102, name: "Seoi Nage" }];
      }
      return [];
    });

    const cardElement = document.createElement("article");
    const signature = document.createElement("div");
    signature.className = "signature-move-container";
    cardElement.append(signature);
    const cardFactory = vi.fn().mockResolvedValue(cardElement);
    renderMock = vi.fn(async () => cardElement);

    const appliedMocks = applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
    });

    const { drawCards, _resetForTest } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();

    const result = await drawCards({ cardFactory });

    expect(result.playerJudoka).toEqual(expect.objectContaining({ id: 1 }));
    expect(cardFactory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      {},
      { useObscuredStats: true, enableInspector: false }
    );
    expect(appliedMocks.markSignatureMoveReadyMock).toHaveBeenCalledTimes(1);
    expect(appliedMocks.setupLazyPortraitsMock).toHaveBeenCalledTimes(1);
    expect(appliedMocks.setupLazyPortraitsMock).toHaveBeenCalledWith(cardElement);
    const playerContainer = document.getElementById("player-card");
    expect(playerContainer?.firstChild).toBe(cardElement);
    expect(generateRandomCardMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 5, isHidden: false })],
      null,
      playerContainer,
      false,
      expect.any(Function),
      { enableInspector: false, skipRender: false }
    );
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
      availableJudoka: [{ id: 1, name: "Solo", stats: { power: 5 }, isHidden: false }],
      playerJudoka: { id: 1, name: "Solo", stats: { power: 5 }, isHidden: false },
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
      availableJudoka: [{ id: 1, name: "Solo", stats: { power: 5 }, isHidden: false }],
      playerJudoka: { id: 1, name: "Solo", stats: { power: 5 }, isHidden: false },
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
          { id: 1, name: "Hidden One", stats: { power: 5 }, isHidden: true },
          { id: 2, name: "Visible Two", stats: { power: 7 }, isHidden: false },
          { id: 3, name: "Hidden Three", stats: { power: 6 }, isHidden: true }
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
        return [
          {
            id: 1,
            name: "Retry Success",
            stats: { power: 9 },
            isHidden: false
          }
        ];
      }
      return [];
    });

    const { drawCards, _resetForTest, JudokaDataLoadError, CARD_RETRY_EVENT } = await import(
      "../../../src/helpers/classicBattle/cardSelection.js"
    );
    _resetForTest();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() }
    });

    await expect(drawCards()).rejects.toBeInstanceOf(JudokaDataLoadError);
    document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
    await timers.runOnlyPendingTimersAsync();

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
    document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
    await timers.runOnlyPendingTimersAsync();

    const exit = document.getElementById("exit-draw-button");
    expect(exit).toBeTruthy();

    exit.click();
    await timers.runOnlyPendingTimersAsync();

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

    const fetcher = vi
      .fn()
      .mockResolvedValue([{ id: 42, name: "Cache Hero", stats: { power: 11 }, isHidden: false }]);

    const first = await loadJudokaData({ fetcher });
    const second = await loadJudokaData({ fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first).toEqual([{ id: 42, name: "Cache Hero", stats: { power: 11 }, isHidden: false }]);
  });

  it("relies on the scoreboard when showMessage succeeds", async () => {
    await vi.resetModules();

    const roundMessage = document.querySelector("#round-message");
    expect(roundMessage).toBeTruthy();

    const setterSpy = roundMessage ? vi.spyOn(roundMessage, "textContent", "set") : null;

    const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
    const showMessageMock = vi.spyOn(scoreboard, "showMessage").mockImplementation((message) => {
      if (roundMessage) {
        roundMessage.textContent = message;
      }
    });

    try {
      const { loadJudokaData, _resetForTest, JudokaDataLoadError } = await import(
        "../../../src/helpers/classicBattle/cardSelection.js"
      );
      _resetForTest();

      const failingFetcher = vi.fn().mockRejectedValue(new Error("boom"));

      await expect(loadJudokaData({ fetcher: failingFetcher })).rejects.toBeInstanceOf(
        JudokaDataLoadError
      );

      expect(showMessageMock).toHaveBeenCalledWith("boom");
      expect(showMessageMock).toHaveBeenCalledTimes(1);
      expect(roundMessage?.textContent).toBe("boom");
      expect(setterSpy?.mock.calls.length ?? 0).toBe(1);
    } finally {
      setterSpy?.mockRestore();
      showMessageMock.mockRestore();
    }
  });

  it("falls back to the round message when showMessage throws", async () => {
    await vi.resetModules();

    const roundMessage = document.querySelector("#round-message");
    expect(roundMessage).toBeTruthy();
    const setterSpy = roundMessage ? vi.spyOn(roundMessage, "textContent", "set") : null;

    const showMessageMock = vi.fn(() => {
      throw new Error("scoreboard offline");
    });

    vi.doMock("../../../src/helpers/setupScoreboard.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/setupScoreboard.js");
      return {
        ...actual,
        showMessage: showMessageMock
      };
    });

    try {
      const { loadJudokaData, _resetForTest, JudokaDataLoadError } = await import(
        "../../../src/helpers/classicBattle/cardSelection.js"
      );
      _resetForTest();

      const failingFetcher = vi.fn().mockRejectedValue(new Error("boom"));

      await expect(loadJudokaData({ fetcher: failingFetcher })).rejects.toBeInstanceOf(
        JudokaDataLoadError
      );

      expect(showMessageMock).toHaveBeenCalledWith("boom");
      expect(showMessageMock).toHaveBeenCalledTimes(1);
      expect(roundMessage?.textContent).toBe("boom");
      expect(setterSpy?.mock.calls.length ?? 0).toBe(1);
    } finally {
      setterSpy?.mockRestore();
      vi.doUnmock("../../../src/helpers/setupScoreboard.js");
    }
  });

  it("logs an error when JudokaCard.render does not return an element", async () => {
    // Reset modules completely first
    await vi.resetModules();

    // Setup console to capture errors
    const { withMutedConsole } = await import("../../utils/console.js");
    const errors = [];

    await withMutedConsole(async () => {
      const originalError = console.error;
      console.error = (...args) => {
        errors.push(args[0]);
      };

      try {
        // Mock JudokaCard to return a non-element BEFORE importing anything
        vi.doMock("../../../src/components/JudokaCard.js", () => ({
          JudokaCard: vi.fn().mockImplementation(() => ({
            render: vi.fn(async () => "nope")
          }))
        }));

        // Also mock randomCard.js to pass through the real exports while using the mocked JudokaCard
        vi.doMock("../../../src/helpers/randomCard.js", async (importOriginal) => {
          const actual = await importOriginal();
          return {
            ...actual
            // renderJudokaCard will use the mocked JudokaCard from above
          };
        });

        // Reset modules to apply both mocks
        vi.resetModules();

        // Now import randomCard which will use the mocked JudokaCard
        const { renderJudokaCard } = await import("../../../src/helpers/randomCard.js");

        const container = document.getElementById("opponent-card");
        const judoka = { id: 1, name: "Renderless", stats: { power: 8 } };
        const gokyoLookup = {};

        // This should log the error when render() returns "nope"
        await renderJudokaCard(judoka, gokyoLookup, container, false, false);
      } finally {
        console.error = originalError;
      }
    });

    expect(errors).toContain("JudokaCard did not render an HTMLElement");
    const container = document.getElementById("opponent-card");
    expect(container.innerHTML).toBe("");
  });
});
